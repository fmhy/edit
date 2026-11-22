/**
 * Semantic (embedding) search: binary index format, scoring and fusion with
 * the MiniSearch results. DOM-free so the build, the Web Worker and the eval
 * harness share it.
 *
 * Each section has two kinds of vectors from the Ternlight sentence embedder:
 *   - its heading path ("Video > Anime Streaming"), int8 + per-vector scale
 *   - every entry line in it, prefixed with that heading path for context
 *     ("Video > Anime Streaming: HiAnime - Anime Streaming"), 1 bit per dim
 * A section's similarity is the mean of its heading similarity and its best
 * entry similarity, so it matches both what the section is and what it lists.
 */

export const SEMANTIC_DIMS = 384
export const SEMANTIC_INDEX_FILE = 'search-semantic.bin'
const WORDS = SEMANTIC_DIMS / 32
const MAGIC = 0x4d455346 // 'FSEM'
const VERSION = 2

// Below this similarity a section is not shown. Unrelated queries
// ("mortgage calculator", "plumber near me") peak just under it.
export const SEMANTIC_MIN_SIMILARITY = 0.55
export const SEMANTIC_LIMIT = 16
// Reciprocal rank fusion constant (Cormack et al.): rank r contributes 1/(k+r).
export const RRF_K = 60

export interface SemanticIndex {
  ids: string[]
  headingScale: Float32Array
  heading: Int8Array
  lineSection: Uint16Array
  lineBits: Uint32Array
  // Entry name of each line ("HiAnime"), to highlight the matching entry.
  lineNames: string[]
}

export interface SemanticHit {
  id: string
  similarity: number
  // Entry name of the section's best matching line.
  line?: string
}

const INVISIBLE_RE = /[\u2060\u200B-\u200D\uFEFF]/g

export function normalizeEmbedText(text: string) {
  return text
    .replace(INVISIBLE_RE, '')
    .replace(/[⭐🌐]|↪️?/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sectionHeadingText(titles: string[]) {
  return normalizeEmbedText(titles.join(' > '))
}

// An entry line embedded with the section it is listed under.
export function entryLineWithContext(headingText: string, line: string) {
  return `${headingText}: ${line}`
}

// The entry's name: the line up to its description ("HiAnime - ...").
export function entryNameOfLine(line: string) {
  return line
    .split(/\s+[-–—]\s+|,\s/u)[0]
    .slice(0, 80)
    .trim()
}

export function sectionEntryLines(text: string) {
  return text
    .split('\n')
    .map(normalizeEmbedText)
    .filter((line) => line.length > 2)
}

export function quantizeInt8(v: Float32Array): {
  scale: number
  q: Int8Array
} {
  let max = 0
  for (const x of v) max = Math.max(max, Math.abs(x))
  const scale = max / 127 || 1
  const q = new Int8Array(v.length)
  for (let i = 0; i < v.length; i++) q[i] = Math.round(v[i] / scale)
  return { scale, q }
}

export function binarize(v: Float32Array, out = new Uint32Array(WORDS)) {
  out.fill(0)
  for (let k = 0; k < SEMANTIC_DIMS; k++)
    if (v[k] > 0) out[k >> 5] |= 1 << (k & 31)
  return out
}

const align4 = (n: number) => (n + 3) & ~3
const HEADER_SIZE = 28

export function encodeSemanticIndex(sections: {
  ids: string[]
  heading: { scale: number; q: Int8Array }[]
  lines: { section: number; bits: Uint32Array; name: string }[]
}): Uint8Array {
  const N = sections.ids.length
  const M = sections.lines.length
  const encoder = new TextEncoder()
  const idsBytes = encoder.encode(JSON.stringify(sections.ids))
  const namesBytes = encoder.encode(
    JSON.stringify(sections.lines.map((l) => l.name))
  )
  const idsEnd = HEADER_SIZE + align4(idsBytes.length)
  const scaleEnd = idsEnd + N * 4
  const headingEnd = scaleEnd + N * SEMANTIC_DIMS
  const lineSectionEnd = headingEnd + align4(M * 2)
  const lineBitsEnd = lineSectionEnd + M * WORDS * 4
  const total = lineBitsEnd + namesBytes.length
  const buf = new ArrayBuffer(total)
  const view = new DataView(buf)
  ;[
    MAGIC,
    VERSION,
    SEMANTIC_DIMS,
    N,
    M,
    idsBytes.length,
    namesBytes.length
  ].forEach((v, i) => view.setUint32(i * 4, v, true))
  new Uint8Array(buf, HEADER_SIZE, idsBytes.length).set(idsBytes)
  new Uint8Array(buf, lineBitsEnd, namesBytes.length).set(namesBytes)
  const scale = new Float32Array(buf, idsEnd, N)
  const heading = new Int8Array(buf, scaleEnd, N * SEMANTIC_DIMS)
  sections.heading.forEach((h, i) => {
    scale[i] = h.scale
    heading.set(h.q, i * SEMANTIC_DIMS)
  })
  const lineSection = new Uint16Array(buf, headingEnd, M)
  const lineBits = new Uint32Array(buf, lineSectionEnd, M * WORDS)
  sections.lines.forEach((l, j) => {
    lineSection[j] = l.section
    lineBits.set(l.bits, j * WORDS)
  })
  return new Uint8Array(buf)
}

export function decodeSemanticIndex(buffer: ArrayBuffer): SemanticIndex {
  const view = new DataView(buffer)
  const [magic, version, dims, N, M, idsLength, namesLength] = [
    0, 1, 2, 3, 4, 5, 6
  ].map((i) => view.getUint32(i * 4, true))
  if (magic !== MAGIC || version !== VERSION || dims !== SEMANTIC_DIMS)
    throw new Error('Unsupported semantic index format')
  const decoder = new TextDecoder()
  const ids = JSON.parse(
    decoder.decode(new Uint8Array(buffer, HEADER_SIZE, idsLength))
  ) as string[]
  const idsEnd = HEADER_SIZE + align4(idsLength)
  const scaleEnd = idsEnd + N * 4
  const headingEnd = scaleEnd + N * SEMANTIC_DIMS
  const lineSectionEnd = headingEnd + align4(M * 2)
  const lineBitsEnd = lineSectionEnd + M * WORDS * 4
  return {
    ids,
    headingScale: new Float32Array(buffer, idsEnd, N),
    heading: new Int8Array(buffer, scaleEnd, N * SEMANTIC_DIMS),
    lineSection: new Uint16Array(buffer, headingEnd, M),
    lineBits: new Uint32Array(buffer, lineSectionEnd, M * WORDS),
    lineNames: JSON.parse(
      decoder.decode(new Uint8Array(buffer, lineBitsEnd, namesLength))
    ) as string[]
  }
}

function popcount(x: number) {
  x -= (x >>> 1) & 0x55555555
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

/** Ranks sections by similarity to an L2-normalized query embedding. */
export function scoreSemantic(
  index: SemanticIndex,
  query: Float32Array,
  {
    limit = SEMANTIC_LIMIT,
    minSimilarity = SEMANTIC_MIN_SIMILARITY
  }: { limit?: number; minSimilarity?: number } = {}
): SemanticHit[] {
  const N = index.ids.length
  const best = new Float32Array(N).fill(-1)
  const bestLine = new Int32Array(N).fill(-1)
  const qBits = binarize(query)
  const { lineBits, lineSection } = index
  for (let j = 0, o = 0; j < lineSection.length; j++, o += WORDS) {
    let distance = 0
    for (let w = 0; w < WORDS; w++)
      distance += popcount(lineBits[o + w] ^ qBits[w])
    // Angle between sign vectors ~ hamming distance (SimHash).
    const sim = Math.cos((Math.PI * distance) / SEMANTIC_DIMS)
    const s = lineSection[j]
    if (sim > best[s]) {
      best[s] = sim
      bestLine[s] = j
    }
  }
  const hits: SemanticHit[] = []
  for (let i = 0, o = 0; i < N; i++, o += SEMANTIC_DIMS) {
    let dot = 0
    for (let k = 0; k < SEMANTIC_DIMS; k++)
      dot += index.heading[o + k] * query[k]
    const similarity = (dot * index.headingScale[i] + best[i]) / 2
    if (similarity >= minSimilarity)
      hits.push({
        id: index.ids[i],
        similarity,
        line: index.lineNames[bestLine[i]] || undefined
      })
  }
  return hits.sort((a, b) => b.similarity - a.similarity).slice(0, limit)
}

/**
 * Reciprocal rank fusion of the keyword results (already ranked and filtered
 * the usual way) with the semantic hits. `toResult` builds a result for a
 * section only the semantic side found (null drops it).
 */
export function fuseSemantic<T extends { id: string }>(
  lexical: T[],
  semantic: SemanticHit[],
  toResult: (id: string) => T | null,
  k = RRF_K
): T[] {
  const scores = new Map<string, { result: T; score: number }>()
  lexical.forEach((result, i) => {
    if (!scores.has(result.id))
      scores.set(result.id, { result, score: 1 / (k + i + 1) })
  })
  semantic.forEach((hit, i) => {
    const entry = scores.get(hit.id)
    if (entry) {
      entry.score += 1 / (k + i + 1)
      return
    }
    const result = toResult(hit.id)
    if (result) scores.set(hit.id, { result, score: 1 / (k + i + 1) })
  })
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((e) => e.result)
}
