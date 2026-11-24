import type { SiteConfig } from 'vitepress'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker } from 'node:worker_threads'
import consola from 'consola'
import { indexedSections } from '../constants'
import {
  binarize,
  encodeSemanticIndex,
  entryLineWithContext,
  entryNameOfLine,
  quantizeInt8,
  sectionEntryLines,
  sectionHeadingText,
  SEMANTIC_DIMS,
  SEMANTIC_INDEX_FILE
} from '../theme/search/semantic'

const BATCH_SIZE = 256
// Embeddings of unchanged texts are reused across builds.
const CACHE_FILE = fileURLToPath(
  new URL('../cache/semantic-embeddings.bin', import.meta.url)
)

const hashOf = (text: string) =>
  createHash('sha1').update(text).digest('base64url')

// Format: uint32 header length, JSON array of text hashes, float32 vectors.
async function readCache(): Promise<Map<string, Float32Array>> {
  const cache = new Map<string, Float32Array>()
  try {
    const buf = await fs.readFile(CACHE_FILE)
    const headerLength = buf.readUInt32LE(0)
    const hashes = JSON.parse(
      buf.subarray(4, 4 + headerLength).toString()
    ) as string[]
    const start = 4 + headerLength
    const vectors = new Float32Array(
      buf.buffer.slice(
        buf.byteOffset + start,
        buf.byteOffset + start + hashes.length * SEMANTIC_DIMS * 4
      )
    )
    hashes.forEach((h, i) =>
      cache.set(h, vectors.subarray(i * SEMANTIC_DIMS, (i + 1) * SEMANTIC_DIMS))
    )
  } catch {
    // No cache yet (or unreadable): embed everything.
  }
  return cache
}

async function writeCache(hashes: string[], vectors: Float32Array) {
  const header = Buffer.from(JSON.stringify(hashes))
  const length = Buffer.alloc(4)
  length.writeUInt32LE(header.length)
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true })
  await fs.writeFile(
    CACHE_FILE,
    Buffer.concat([length, header, Buffer.from(vectors.buffer)])
  )
}

async function embedCached(texts: string[]): Promise<Float32Array> {
  const cache = await readCache()
  const hashes = texts.map(hashOf)
  const missing = [...new Set(texts.filter((_, i) => !cache.has(hashes[i])))]
  if (missing.length > 0) {
    const fresh = await embedAll(missing)
    missing.forEach((text, i) =>
      cache.set(
        hashOf(text),
        fresh.subarray(i * SEMANTIC_DIMS, (i + 1) * SEMANTIC_DIMS)
      )
    )
  }
  const out = new Float32Array(texts.length * SEMANTIC_DIMS)
  hashes.forEach((h, i) => out.set(cache.get(h)!, i * SEMANTIC_DIMS))
  if (missing.length > 0) await writeCache(hashes, out)
  return out
}

async function embedAll(texts: string[]): Promise<Float32Array> {
  const out = new Float32Array(texts.length * SEMANTIC_DIMS)
  const batches: number[] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) batches.push(i)
  const threads = Math.max(
    1,
    Math.min(os.availableParallelism() - 1, batches.length)
  )
  const workers = Array.from(
    { length: threads },
    () => new Worker(new URL('./semantic-worker.mjs', import.meta.url))
  )
  try {
    await Promise.all(
      workers.map(async (worker) => {
        for (let start = batches.shift(); start !== undefined;) {
          const texts_ = texts.slice(start, start + BATCH_SIZE)
          const vectors = await new Promise<Float32Array>((resolve, reject) => {
            worker.once('message', ({ out }) => resolve(out))
            worker.once('error', reject)
            worker.postMessage({ id: start, texts: texts_ })
          })
          worker.removeAllListeners('error')
          out.set(vectors, start * SEMANTIC_DIMS)
          start = batches.shift()
        }
      })
    )
  } finally {
    await Promise.all(workers.map((w) => w.terminate()))
  }
  return out
}

/** Writes the semantic search index (see theme/search/semantic.ts). */
export async function generateSemanticIndex(config: SiteConfig) {
  const start = performance.now()
  const sections = [...indexedSections.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, s]) => s)
  const headings = sections.map((s) => sectionHeadingText(s.titles))
  const lines = sections.flatMap((s, section) =>
    sectionEntryLines(s.text).map((text) => ({ section, text }))
  )
  const vectors = await embedCached([
    ...headings,
    ...lines.map((l) => entryLineWithContext(headings[l.section], l.text))
  ])
  const vector = (i: number) =>
    vectors.subarray(i * SEMANTIC_DIMS, (i + 1) * SEMANTIC_DIMS)
  const data = encodeSemanticIndex({
    ids: sections.map((s) => s.id),
    heading: sections.map((_, i) => quantizeInt8(vector(i))),
    lines: lines.map((l, j) => ({
      section: l.section,
      bits: binarize(vector(sections.length + j)),
      name: entryNameOfLine(l.text)
    }))
  })
  await fs.writeFile(path.join(config.outDir, SEMANTIC_INDEX_FILE), data)
  consola.success(
    `Semantic search index: ${sections.length} sections, ${lines.length} entries, ${(data.length / 1024).toFixed(0)} KiB in ${((performance.now() - start) / 1000).toFixed(1)}s`
  )
}
