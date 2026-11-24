/**
 * The one tokenizer for local search: used at build time to index sections
 * (constants.ts `search.options.miniSearch.options`) and at query time by the
 * search modal (engine.ts), so index terms and query terms cannot drift.
 * Keep it free of Vue/DOM/Node imports.
 */

export const INVISIBLE_CHARS_RE = /\u2060|\u200B|\u200C|\u200D|\uFEFF/g

// Whitespace and punctuation that never belongs to a term. Hyphens, dots,
// underscores, apostrophes and "+" stay inside a term ("yt-dlp", "nyaa.si",
// "anna's", "c++"); processIndexTerm also indexes their parts.
export const TOKEN_SPLIT_RE =
  /[\s#%*,=/:;?[\]{}()&|<>!"`~^\u00A0\u2013\u2014\u2018\u201C\u201D\u2022\u00B7\u2026]+/u

export const MIN_TERM_LENGTH = 2

export const STOP_WORDS = new Set([
  'frontmatter',
  '$frontmatter.synopsis',
  'about',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'how',
  'in',
  'into',
  'is',
  'it',
  'its',
  'my',
  'now',
  'of',
  'on',
  'or',
  'so',
  'that',
  'the',
  'this',
  'to',
  'was',
  'what',
  'with',
  'you',
  'your'
])

const ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' '
}

function decodeEntities(text: string) {
  return text.replace(
    /&(#\d+|#x[\da-f]+|[a-z]+);/gi,
    (entity, name: string) => {
      if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? entity
      const code =
        name[1] === 'x' || name[1] === 'X'
          ? parseInt(name.slice(2), 16)
          : parseInt(name.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity
    }
  )
}

const LETTER_FOLDS: Record<string, string> = {
  ß: 'ss',
  æ: 'ae',
  Æ: 'AE',
  œ: 'oe',
  Œ: 'OE',
  ø: 'o',
  Ø: 'O',
  ł: 'l',
  Ł: 'L',
  đ: 'd',
  Đ: 'D'
}

// Compatibility forms (fullwidth, 𝖒𝖆𝖙𝖍 letters, ligatures) and Latin/Greek/
// Cyrillic diacritics fold to their base letters. Other combining marks (e.g.
// Japanese dakuten) are recomposed, so non-Latin scripts keep their meaning.
// Case is preserved so camelCase can still be split afterwards.
export function foldText(text: string) {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .normalize('NFC')
    .replace(/[ßæÆœŒøØłŁđĐ]/g, (c) => LETTER_FOLDS[c])
}

export function tokenizeSearchText(text: string): string[] {
  return decodeEntities(text)
    .replace(INVISIBLE_CHARS_RE, '')
    .split(TOKEN_SPLIT_RE)
    .filter(Boolean)
}

const EDGE_PUNCT_RE = /^[-._'\u2019]+|[-._'\u2019]+$/g
const INNER_SEPARATOR_RE = /[-_'\u2019+]+/
// "uBlock" -> u|Block, "LibreOffice" -> Libre|Office, "JDownloader" ->
// J|Downloader. An acronym's plural ("PDFs", "GPUs") is not split.
const CAMEL_BOUNDARY_RE =
  /(?<=[\p{Ll}\p{N}])(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll}{2})/u

function cleanTerm(term: string) {
  return foldText(term).trim().replace(EDGE_PUNCT_RE, '')
}

function isIndexable(term: string) {
  return term.length >= MIN_TERM_LENGTH && !STOP_WORDS.has(term)
}

/**
 * Index-time term processing. Besides the whole term it indexes the pieces a
 * user may type instead: "yt-dlp" -> yt-dlp, yt, dlp, ytdlp; "uBlock" ->
 * ublock, block; "nyaa.si" -> nyaa.si, nyaa, si.
 */
export function processIndexTerm(term: string): string | string[] | false {
  const cleaned = cleanTerm(term)
  const full = cleaned.toLowerCase()
  if (!isIndexable(full)) return false

  const out = new Set([full])
  const segments = cleaned.split(/\.+/).filter(Boolean)
  for (const segment of segments) {
    const parts = segment
      .split(INNER_SEPARATOR_RE)
      .flatMap((p) => p.split(CAMEL_BOUNDARY_RE))
      .map((p) => p.toLowerCase())
      .filter(Boolean)
    if (segments.length > 1) out.add(segment.toLowerCase())
    if (parts.length > 1) {
      for (const part of parts) out.add(part)
      out.add(parts.join(''))
    }
  }
  const terms = [...out].filter(isIndexable)
  return terms.length > 1 ? terms : terms[0] || false
}

/** Query-time term processing: the whole term, normalized like the index. */
export function processQueryTerm(term: string): string | false {
  const full = cleanTerm(term).toLowerCase()
  return isIndexable(full) ? full : false
}

/** Every index term a piece of text produces (e.g. a link's visible text). */
export function indexTermsOf(text: string): string[] {
  const out: string[] = []
  for (const token of tokenizeSearchText(text)) {
    const terms = processIndexTerm(token)
    if (terms) out.push(...(Array.isArray(terms) ? terms : [terms]))
  }
  return out
}

// Words that end like plurals but aren't.
const STEM_EXCEPTIONS = new Set([
  'news',
  'series',
  'species',
  'ios',
  'macos',
  'ipados',
  'tvos',
  'watchos',
  'chromeos',
  'windows'
])

const VOWEL_RE = /[aeiouy]/

/**
 * Light English stemmer for plural / -ing / -ed forms, applied to query and
 * text alike: "emulators", "torrenting", "hosts" and "libraries" meet
 * "emulator", "torrent", "hosting" and "library". Only plain lowercase words
 * of 4+ letters are touched.
 */
export function stemTerm(term: string): string {
  if (term.length < 4 || !/^[a-z]+$/.test(term) || STEM_EXCEPTIONS.has(term))
    return term
  let w = term
  if (w.endsWith('ies') && w.length > 4) w = w.slice(0, -2)
  else if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1)
  else if (w.endsWith('ing') && VOWEL_RE.test(w.slice(0, -3)) && w.length > 5)
    w = w.slice(0, -3)
  else if (
    w.endsWith('ed') &&
    !w.endsWith('eed') &&
    VOWEL_RE.test(w.slice(0, -2)) &&
    w.length > 4
  )
    w = w.slice(0, -2)
  if (w !== term && /([^aeioulsz])\1$/.test(w)) w = w.slice(0, -1)
  if (w.length > 3 && /[^e]e$/.test(w)) w = w.slice(0, -1)
  else if (w.length > 3 && /[^aeiou]y$/.test(w)) w = w.slice(0, -1) + 'i'
  return w
}

/**
 * Index prefix that covers every inflection of `term` ("libraries" -> "librar"
 * matches library/libraries, "gaming" -> "gam" matches game/games), or null
 * when the term has none worth adding.
 */
export function stemPrefixOf(term: string): string | null {
  // Prefix search already covers what follows the base form ("game" finds
  // "games"); only inflected forms and a final consonant+y need a stem.
  if (!/(s|ing|ed|[^aeiou]y)$/.test(term)) return null
  const stem = stemTerm(term)
  if (stem === term) return null
  const prefix =
    stem.endsWith('i') && !term.endsWith('i') ? stem.slice(0, -1) : stem
  return prefix.length >= 3 && prefix !== term ? prefix : null
}

/** The whole term with inner separators removed ("yt-dlp" -> "ytdlp"). */
export function joinedFormOf(term: string): string | null {
  if (!INNER_SEPARATOR_RE.test(term)) return null
  const joined = term.split(INNER_SEPARATOR_RE).join('')
  return isIndexable(joined) ? joined : null
}

const NON_WORD_RE = /[^\p{L}\p{N}]+/u

/**
 * Separator-, case-, accent- and inflection-insensitive keys for checking that
 * a query appears as a phrase in some text: "yt dlp", "YT-DLP" and "ytdlp"
 * all become "ytdlp"; "image hosting" and "Image Hosts" become "imagehost".
 * `raw` keeps the words unstemmed (for prefixes typed mid-word), `stemmed`
 * stems each word. Standalone stop words are dropped unless `keepStopWords`,
 * as the index drops them.
 */
export function phraseKeys(
  text: string,
  keepStopWords = false
): { raw: string; stemmed: string } {
  const words: string[] = []
  for (const token of tokenizeSearchText(text.replace(/<[^>]*>/g, ' '))) {
    const folded = foldText(token).toLowerCase()
    if (!keepStopWords && STOP_WORDS.has(folded)) continue
    for (const word of folded.split(NON_WORD_RE)) if (word) words.push(word)
  }
  return { raw: words.join(''), stemmed: words.map(stemTerm).join('') }
}
