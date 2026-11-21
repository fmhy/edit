/**
 * Query understanding: turns what people type ("where can i watch anime
 * free", "yt dl", "manga app android") into an index query.
 *
 * Each query word becomes a group of alternatives (the word, its stem, and
 * dictionary expansions). Content words are required (AND); filler words and
 * platform words are optional: they only add score, so they rank the section
 * the user means first without emptying the result list when a section
 * doesn't spell them out.
 */

// Words that carry intent but rarely name what is wanted: question words,
// qualifiers and verbs. Headings do use some of them ("Free Fonts",
// "Streaming Apps"), hence boost-only, not dropped.
const FILLER_WORDS = new Set([
  'any',
  'app',
  'apps',
  'are',
  'best',
  'can',
  'do',
  'find',
  'for',
  'free',
  'from',
  'get',
  'good',
  'how',
  'in',
  'into',
  'is',
  'it',
  'listen',
  'make',
  'me',
  'my',
  'need',
  'of',
  'on',
  'online',
  'play',
  'program',
  'programs',
  'read',
  'remove',
  'send',
  'site',
  'sites',
  'software',
  'some',
  'that',
  'this',
  'to',
  'tool',
  'tools',
  'top',
  'track',
  'use',
  'want',
  'watch',
  'way',
  'website',
  'websites',
  'what',
  'where',
  'which',
  'without'
])

// Platform words narrow a request rather than name it ("manga app android").
// Values are the spelling used in headings.
const PLATFORM_WORDS: Record<string, string[]> = {
  android: [],
  ios: [],
  iphone: ['ios'],
  ipad: ['ios'],
  windows: [],
  pc: ['windows'],
  linux: [],
  mac: [],
  macos: ['mac'],
  osx: ['mac'],
  mobile: [],
  phone: ['mobile']
}

// One-way expansions: common abbreviations and wordings mapped to the words
// the wiki's headings and link texts use. Keep entries general (no single
// site names) and only add a target that exists in docs/.
const EXPANSIONS: Record<string, string[]> = {
  yt: ['youtube'],
  ytm: ['youtube music'],
  dl: ['download'],
  ddl: ['direct download'],
  vid: ['video'],
  vids: ['video'],
  pic: ['image'],
  pics: ['image'],
  photo: ['image'],
  photos: ['image'],
  picture: ['image'],
  pictures: ['image'],
  film: ['movie'],
  films: ['movie'],
  tv: ['television'],
  watch: ['stream'],
  listen: ['stream'],
  ad: ['adblock'],
  ads: ['adblock'],
  adblocker: ['adblock'],
  ebook: ['epub'],
  ebooks: ['epub'],
  email: ['mail'],
  temporary: ['temp'],
  disposable: ['temp'],
  vm: ['virtual machine'],
  tts: ['text to speech'],
  stt: ['speech to text'],
  mc: ['minecraft'],
  kdrama: ['drama'],
  subs: ['subtitle'],
  ps1: ['playstation'],
  ps2: ['playstation'],
  ps3: ['playstation'],
  ps4: ['playstation'],
  psp: ['playstation'],
  psx: ['playstation'],
  gba: ['nintendo'],
  nds: ['nintendo'],
  '3ds': ['nintendo'],
  n64: ['nintendo'],
  snes: ['nintendo'],
  nes: ['nintendo'],
  wii: ['nintendo'],
  song: ['music'],
  songs: ['music']
}

const MIN_STEM_LENGTH = 4

// Light suffix stripping. Index search is prefix-based, so a stem only has to
// be a prefix of the forms it should reach: "hosting" -> "host" also finds
// "hosts", "translate" -> "translat" also finds "translators".
export function stemQueryTerm(term: string): string {
  if (!/^[a-z]+$/.test(term)) return term
  const strip = (n: number) =>
    term.length - n >= MIN_STEM_LENGTH ? term.slice(0, -n) : term
  if (term.endsWith('ies')) return strip(3)
  if (term.endsWith('ing')) return strip(3)
  if (term.endsWith('ion')) return strip(3)
  if (term.endsWith('ers')) return strip(3)
  if (/(?:ss|us|is)$/.test(term)) return term
  if (/(?:x|sh|ch|ss)es$/.test(term)) return strip(2)
  if (term.endsWith('ed') || term.endsWith('er')) return strip(2)
  if (term.endsWith('s') || term.endsWith('e')) return strip(1)
  return term
}

export interface QueryPlan {
  /** Every group must match; a group matches if any alternative does. */
  required: string[][]
  /** Groups that only add score. */
  optional: string[][]
  /** The plan searches for more than the literal text. */
  rewritten: boolean
  /** Platforms the query asks for, by heading spelling ("iphone" -> "ios"). */
  platforms: string[]
}

const platformOf = (word: string) =>
  word in PLATFORM_WORDS ? (PLATFORM_WORDS[word][0] ?? word) : null

/** Platforms named in a heading ("Mac Adblock / Privacy" -> ["mac"]). */
export function platformsIn(text: string): string[] {
  const out = new Set<string>()
  for (const word of text.toLowerCase().split(/[^a-z]+/)) {
    const platform = platformOf(word)
    if (platform) out.add(platform)
  }
  return [...out]
}

function alternativesOf(word: string, extra: string[] = []) {
  const alts = [word, ...extra, ...(EXPANSIONS[word] ?? [])]
  const stem = stemQueryTerm(word)
  if (stem !== word) alts.push(stem)
  return [...new Set(alts)]
}

// `words` are the query's index-like tokens (tokenizeIndexLike).
export function planQuery(words: string[]): QueryPlan {
  const content: string[][] = []
  const platform: string[][] = []
  const filler: string[][] = []
  for (const word of words) {
    if (FILLER_WORDS.has(word)) filler.push(alternativesOf(word))
    else if (word in PLATFORM_WORDS)
      platform.push(alternativesOf(word, PLATFORM_WORDS[word]))
    else content.push(alternativesOf(word))
  }

  // Fall back to the next weakest kind of word when a query has nothing more
  // specific ("mac apps", "free").
  let required: string[][]
  let optional: string[][]
  if (content.length) {
    required = content
    optional = [...platform, ...filler]
  } else if (platform.length) {
    required = platform
    optional = filler
  } else {
    required = filler
    optional = []
  }

  const rewritten =
    optional.length > 0 || required.some((group) => group.length > 1)
  const platforms = [
    ...new Set(words.map(platformOf).filter((p): p is string => !!p))
  ]
  return { required, optional, rewritten, platforms }
}
