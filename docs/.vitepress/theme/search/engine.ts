/**
 * Pure query-time search logic for the local search modal.
 *
 * Shared by VPLocalSearchBox.vue (browser) and the offline benchmark in eval/
 * (Node). Keep it free of Vue/DOM/VitePress-client imports so both can load it.
 */

import type { Query, SearchResult } from 'minisearch'
import type { SemanticHit } from './semantic'
import MiniSearch from 'minisearch'
import { normalizeSearchUrl, stripSchemeAndWww } from '../../shared'
import { planQuery, platformsIn } from './query'
import { fuseSemantic } from './semantic'
import {
  foldText,
  indexTermsOf,
  INVISIBLE_CHARS_RE,
  joinedFormOf,
  MIN_TERM_LENGTH,
  phraseKeys,
  processIndexTerm,
  processQueryTerm,
  stemPrefixOf,
  tokenizeSearchText
} from './tokenize'

export const RESULTS_PAGE_SIZE = 16
export const MAX_RESULTS_IN_MEMORY = 200
export const MAX_SUBSTRING_TERMS = 100
export const MAX_SUGGESTIONS = 3
export const MIN_CANDIDATE_POOL = 32

export type CustomMetadata = Record<
  string,
  { l?: string[]; s?: string[]; u?: string[]; su?: string[] }
>

export type SearchHit = SearchResult & Result

export interface Result {
  title: string
  titles: string[]
  text?: string
  urlMatched?: boolean
  urlMatchedStarred?: boolean
  // Came from the typo-tolerant fallback query, not the exact one.
  fallback?: boolean
  // Found only by semantic similarity, not by the keyword index.
  semantic?: boolean
  // The entry line the semantic match is about (highlighted in the excerpt).
  semanticLine?: string
}

export interface BoostFlags {
  hasStarredExact: boolean
  hasTitleExact: boolean
  hasTitleAll: boolean
  hasExact: boolean
  hasStarredPrefix: boolean
  hasPrefix: boolean
  hasTitlePhrase: boolean
  hasStarredWord: boolean
  hasStarredUrl: boolean
  hasLinkWord: boolean
  hasLinkUrl: boolean
}

export interface SidebarItem {
  text?: string
  link?: string
  items?: SidebarItem[]
}

// Section ids are the first path segment of a result id: "/gaming#anchor" -> "/gaming".
export function resultCategoryOf(id: string): string {
  const segment = id
    .split('#')[0]
    .replace(/\.html$/, '')
    .split('/')
    .filter(Boolean)[0]
  return segment ? `/${segment}` : '/'
}

export function computeCategoryCounts(results: (SearchResult & Result)[]) {
  const counts = new Map<string, number>()
  const seen = new Set<string>()
  for (const r of results) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    const category = resultCategoryOf(r.id)
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return counts
}

export { INVISIBLE_CHARS_RE } from './tokenize'

// Query/link text as index terms: whole terms (query-time normalization), or
// also their parts (yt-dlp -> yt, dlp, ytdlp) with `withParts`.
export function tokenizeIndexLike(text: string, withParts = false): string[] {
  if (withParts) return indexTermsOf(text)
  const out: string[] = []
  for (const token of tokenizeSearchText(text)) {
    const term = processQueryTerm(token)
    if (term) out.push(term)
  }
  return out
}

// Light suffix stripping for heading matches ("readers" ~ "reader",
// "adblocking" ~ "adblock"); never applied to the index itself.
const STEM_SUFFIXES = ['ing', 'ers', 'er', 's']
export function stemWord(word: string) {
  for (const suffix of STEM_SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3)
      return word.slice(0, -suffix.length)
  }
  return word
}

export function normalizeUrlSearchValue(value: string) {
  let decoded = value.trim()
  try {
    decoded = decodeURI(decoded)
  } catch {
    // Keep the raw value if it is not a valid encoded URI.
  }
  return decoded
    .replace(INVISIBLE_CHARS_RE, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

// Known multi-part public suffixes and subdomain-hosting platforms. For these
// the registrable *label* is the part left of the suffix, so "silentaperture"
// resolves silentaperture.gitlab.io and "example" resolves example.co.uk —
// while "vercel"/"itch"/"com" don't leak-match every site on the platform.
export const URL_HOST_SUFFIXES = new Set([
  // multi-part TLDs
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'com.br',
  'com.mx',
  'co.jp',
  'co.in',
  'co.nz',
  'co.za',
  'co.kr',
  // subdomain-as-product hosting platforms
  'github.io',
  'gitlab.io',
  'pages.dev',
  'workers.dev',
  'vercel.app',
  'netlify.app',
  'web.app',
  'firebaseapp.com',
  'surge.sh',
  'neocities.org',
  'itch.io',
  'blogspot.com',
  'wordpress.com',
  'js.org',
  'readthedocs.io',
  'notion.site',
  'sourceforge.io',
  'glitch.me',
  'repl.co',
  'fandom.com',
  'gitbook.io',
  'substack.com',
  'ghost.io',
  'pythonanywhere.com',
  'herokuapp.com'
])

// Ubiquitous shared platforms where the *domain* is not the entry's identity
// (github.com appears ~10k times in the wiki). Domain-mode URL search skips
// these so "github"/"discord"/"reddit" don't flood; they remain reachable via
// an explicit path query ("github.com/yt-dlp") and via normal title/text search.
export const URL_SHARED_DOMAINS = new Set([
  'github.com',
  'gitlab.com',
  'codeberg.org',
  'bitbucket.org',
  'sourceforge.net',
  'greasyfork.org',
  'reddit.com',
  'discord.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'facebook.com',
  'instagram.com',
  'medium.com',
  'archive.org',
  'play.google.com',
  'apps.apple.com',
  'chromewebstore.google.com',
  'addons.mozilla.org',
  'docs.google.com',
  'drive.google.com',
  'sites.google.com',
  'cse.google.com',
  'support.google.com'
])

// Per-domain and total ceilings on URL-only matches, so no single domain (or a
// broad query) can ever flood the result list regardless of the heuristics.
export const MAX_URL_MATCHES_PER_DOMAIN = 8
export const MAX_URL_MATCHES_TOTAL = 60

// Below this length a bare query only matches a label by prefix/exact, never a
// mid-label substring: "wco" should hit "wcofun" but not "showcode". Longer
// needles keep substring matching so intentional fragments still work.
export const MIN_SUBSTRING_NEEDLE_LENGTH = 4

// Edits allowed per term, by term length: short terms must be exact (every
// 3-letter edit is another real word), longer terms tolerate more typos.
export function fuzzyTolerance(term: string) {
  if (term.length < 5) return false
  return term.length < 9 ? 1 : 2
}

// Levenshtein (what MiniSearch's fuzzy uses) counts a swapped letter pair as
// two edits, so the most common typo ("stermio", "fitgril") falls outside the
// tolerance above. Index terms one adjacent swap away are added explicitly and
// weighted like a one-edit fuzzy match.
const termKeySets = new WeakMap<string[], Set<string>>()

function termKeySet(termKeys: string[]) {
  let keys = termKeySets.get(termKeys)
  if (!keys) {
    keys = new Set(termKeys)
    termKeySets.set(termKeys, keys)
  }
  return keys
}

function transpositionsInIndex(term: string, termKeys: string[]) {
  if (term.length < 4) return []
  const keys = termKeySet(termKeys)
  const found = new Set<string>()
  for (let i = 0; i < term.length - 1; i++) {
    if (term[i] === term[i + 1]) continue
    const swapped = term.slice(0, i) + term[i + 1] + term[i] + term.slice(i + 2)
    if (keys.has(swapped)) found.add(swapped)
  }
  return [...found]
}

const FUZZY_WEIGHT = 0.45

// Optimal string alignment distance (Levenshtein + adjacent swaps), capped:
// returns max + 1 as soon as the distance is known to exceed `max`.
function editDistanceWithin(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, prev2[j - 2] + 1)
      }
      cur.push(d)
      rowMin = Math.min(rowMin, d)
    }
    if (rowMin > max) return max + 1
    prev2 = prev
    prev = cur
  }
  return prev[b.length]
}

// Whether index term `term` is what the user meant by query word `word`: the
// word itself or its completion, or, only when the word is not an index term
// (a typo), a term within its edit budget. Keeps "ublock" from treating
// "unblock" links as exact matches.
function standsForQueryWord(term: string, word: string, keys: Set<string>) {
  if (term.startsWith(word)) return true
  if (keys.has(word)) return false
  const budget = fuzzyTolerance(word) || (word.length >= 4 ? 1 : 0)
  return budget > 0 && editDistanceWithin(word, term, budget) <= budget
}

// Typo-tolerant query: every word must match (AND), as a prefix ("watch"
// also finds "watching", and the word being typed completes) or within its
// length based edit budget, or one transposition away. The dashed join keeps
// "yt dlp" -> "yt-dlp" working.
export function buildTypoTolerantQuery(
  text: string,
  termKeys: string[]
): Query | null {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const parts = words.flatMap((w) => tokenizeIndexLike(w))
  if (parts.length === 0) return null
  const keys = termKeySet(termKeys)
  const termQuery = (term: string): Query => {
    const swaps = transpositionsInIndex(term, termKeys)
    // Short words get one edit only when they are not words of the index
    // ("adon" -> "addon"), matching standsForQueryWord.
    const fuzzy =
      fuzzyTolerance(term) || (term.length >= 4 && !keys.has(term) ? 1 : false)
    const base: Query = { queries: [term], fuzzy, prefix: true }
    if (swaps.length === 0) return base
    const weight = (FUZZY_WEIGHT * term.length) / (term.length + 1)
    return {
      combineWith: 'OR',
      queries: [
        base,
        { queries: swaps, fuzzy: false, prefix: false, boostTerm: () => weight }
      ]
    }
  }
  const queries: Query[] = [
    {
      combineWith: 'AND',
      queries: parts.map(termQuery)
    }
  ]
  if (words.length > 1) queries.push(termQuery(words.join('-')))
  return { combineWith: 'OR', queries }
}

// Punctuation-insensitive form so "pihole" matches "pi-hole".
export function compactUrlValue(value: string) {
  return value.replace(/[^a-z0-9]/g, '')
}

// Resolve a host to its registrable label (the meaningful name) and registrable
// domain, honoring the multi-part / hosting suffixes above.
export function urlRegistrable(host: string): {
  label: string
  registrable: string
} {
  const labels = host.split('.')
  for (let i = 0; i < labels.length - 1; i++) {
    if (URL_HOST_SUFFIXES.has(labels.slice(i + 1).join('.'))) {
      return { label: labels[i], registrable: labels.slice(i).join('.') }
    }
  }
  return {
    label: labels[labels.length - 2] ?? labels[0],
    registrable: labels.slice(-2).join('.')
  }
}

export interface UrlQuery {
  // 'path' → the user typed a "/" so we match host + path directly.
  // 'domain' → match against the domain only.
  mode: 'path' | 'domain'
  // path mode: the host+path needle (e.g. "github.com/yt-dlp").
  needle: string
  // domain mode: query forms tested against the domain (raw + compacted).
  needles: string[]
  // domain mode: match the full host (query had a TLD, e.g. "pi-hole.net")
  // rather than the registrable label.
  matchFullHost: boolean
  // The user typed a scheme ("https://") or leading "www." — a literal
  // start-of-URL signal, so anchor to the host start (prefix) instead of
  // matching the needle anywhere inside the label. Keeps "https://wco" off
  // "showcode.app" (where "wco" sits mid-label) while still hitting "wcofun".
  anchored: boolean
}

// Parse the query once so it can be tested against many stored URLs cheaply.
// Returns null when the query is too short to be a meaningful URL match.
export function buildUrlQuery(query: string): UrlQuery | null {
  const normalized = normalizeUrlSearchValue(query)
  if (normalized.length < 3) return null

  // A typed scheme or leading "www." anchors the match to the host start.
  const anchored =
    /^[a-z][a-z0-9+.-]*:\/\//.test(normalized) || normalized.startsWith('www.')
  const stripped = normalizeSearchUrl(normalized)
  // A "/" means the user typed a path, so match against host + path directly.
  if (stripped.includes('/')) {
    return {
      mode: 'path',
      needle: stripped,
      needles: [],
      matchFullHost: false,
      anchored
    }
  }
  // A "." means the user typed a domain with its TLD (pi-hole.net) → match the
  // full host. Otherwise it's a bare word → match the registrable label.
  return {
    mode: 'domain',
    needle: '',
    needles: [
      ...new Set([stripped, compactUrlValue(stripped)].filter(Boolean))
    ],
    matchFullHost: stripped.includes('.'),
    anchored
  }
}

export function looksLikeUrlQuery(query: string) {
  const normalized = normalizeUrlSearchValue(query)
  const stripped = stripSchemeAndWww(normalized)
  const isSingleToken = !/\s/.test(query.trim())
  return (
    /^[a-z][a-z0-9+.-]*:\/\//.test(normalized) ||
    normalized.startsWith('www.') ||
    (isSingleToken && stripped.includes('.')) ||
    (isSingleToken && stripped.includes('/'))
  )
}

// `normalizedUrl` may be a raw href or the stored normalized form; normalize it
// here so query params are encoded the same way as build-time URL metadata.
export function urlMatchesNormalizedUrl(
  normalizedUrl: string,
  urlQuery: UrlQuery
) {
  const hostPath = normalizeSearchUrl(normalizedUrl)
  if (urlQuery.mode === 'path') {
    return hostPath.includes(urlQuery.needle)
  }
  const host = hostPath.split(/[/?#]/)[0]
  const { label, registrable } = urlRegistrable(host)
  // Skip ubiquitous shared platforms in domain mode (see URL_SHARED_DOMAINS).
  if (URL_SHARED_DOMAINS.has(host) || URL_SHARED_DOMAINS.has(registrable)) {
    return false
  }
  const target = urlQuery.matchFullHost ? host : label
  const haystacks = [target, compactUrlValue(target)]
  return urlQuery.needles.some((needle) => {
    // Mirror recordMatchRank: anchored queries and short needles match by
    // prefix only, longer needles also match a mid-label substring.
    const prefixOnly =
      urlQuery.anchored || needle.length < MIN_SUBSTRING_NEEDLE_LENGTH
    return haystacks.some((haystack) =>
      prefixOnly ? haystack.startsWith(needle) : haystack.includes(needle)
    )
  })
}

// A stored URL with its host parts parsed once at index-build time so the hot
// search path never re-strips/-splits the same URL on every keystroke.
export interface UrlRecord {
  id: string
  hostPath: string // host + path (e.g. "github.com/yt-dlp")
  host: string // host only (e.g. "github.com")
  label: string // registrable label (e.g. "pi-hole")
  registrable: string // registrable domain (e.g. "pi-hole.net")
  compactHost: string // punctuation-stripped host
  compactLabel: string // punctuation-stripped label
  isShared: boolean // host/registrable is a suppressed shared platform
  starred: boolean // URL came from a starred list item
}

// How strongly a haystack matches a needle: 3 = exact, 2 = prefix, 1 = substring,
// 0 = no match. Lets findUrlMatches keep the most relevant matches when a cap
// forces a cut, instead of dropping by arbitrary index order.
export function matchStrength(haystack: string, needle: string) {
  if (haystack === needle) return 3
  if (haystack.startsWith(needle)) return 2
  if (haystack.includes(needle)) return 1
  return 0
}

// Rank a pre-parsed record against the query (0 = no match). Mirrors
// urlMatchesNormalizedUrl's matching, but reads the precomputed host parts
// instead of re-deriving them, and returns a strength instead of a boolean.
export function recordMatchRank(rec: UrlRecord, urlQuery: UrlQuery) {
  if (urlQuery.mode === 'path') {
    return matchStrength(rec.hostPath, urlQuery.needle)
  }
  if (rec.isShared) return 0
  const haystacks = urlQuery.matchFullHost
    ? [rec.host, rec.compactHost]
    : [rec.label, rec.compactLabel]
  let best = 0
  for (const needle of urlQuery.needles) {
    // Anchored queries (typed scheme / www.) and short needles only accept
    // exact/prefix matches (strength >= 2), never a mid-label substring.
    const minStrength =
      urlQuery.anchored || needle.length < MIN_SUBSTRING_NEEDLE_LENGTH ? 2 : 1
    for (const haystack of haystacks) {
      const s = matchStrength(haystack, needle)
      if (s >= minStrength) best = Math.max(best, s)
    }
  }
  return best
}

export function findPageTitle(
  items: SidebarItem[],
  path: string
): string | null {
  for (const item of items) {
    if (item.link === path) return item.text ?? null
    if (item.items) {
      const found = findPageTitle(item.items, path)
      if (found) return found
    }
  }
  return null
}

export function findUrlMatches(
  index: MiniSearch<Result>,
  query: string,
  urlIndex: UrlRecord[]
) {
  const matches: (SearchResult & Result)[] = []
  const urlQuery = buildUrlQuery(query)
  if (!urlQuery) return matches

  // Gather one candidate per entry first, keeping the best-ranked matching URL
  // for that entry. One entry can own several URLs; mirror the old `meta.u.find`
  // by counting each entry at most once.
  const candidates = new Map<string, UrlRecord & { rank: number }>()
  for (const rec of urlIndex) {
    const rank = recordMatchRank(rec, urlQuery)
    if (rank === 0) continue
    const existing = candidates.get(rec.id)
    if (
      !existing ||
      rank > existing.rank ||
      (rank === existing.rank && rec.starred)
    ) {
      candidates.set(rec.id, { ...rec, rank })
    }
  }

  // Sort by relevance before applying the ceilings, so when a cap forces a cut
  // we drop the *least* relevant matches: curated/starred entries first, then
  // by match strength (exact > prefix > substring). Within-cap order doesn't
  // matter — the merged result set is re-sorted globally by tier/score later.
  const ranked = [...candidates.values()].sort((a, b) => {
    return Number(b.starred) - Number(a.starred) || b.rank - a.rank
  })

  // Hard ceilings (see MAX_URL_MATCHES_*) so no single domain or broad query
  // can flood the result list, even past the matching heuristics.
  const perDomain = new Map<string, number>()
  for (const rec of ranked) {
    const seen = perDomain.get(rec.registrable) ?? 0
    if (seen >= MAX_URL_MATCHES_PER_DOMAIN) continue

    const storedFields = index.getStoredFields(rec.id) as Result | undefined
    if (!storedFields) continue

    perDomain.set(rec.registrable, seen + 1)
    matches.push({
      id: rec.id,
      // A URL that is the site itself (no path) names the entry, rather than
      // a guide or sub-page linked from it.
      score: rec.rank + (rec.hostPath.replace(/\/$/, '') === rec.host ? 1 : 0),
      terms: [query],
      queryTerms: [query],
      match: {},
      ...storedFields,
      urlMatched: true,
      urlMatchedStarred: rec.starred
    })
    if (matches.length >= MAX_URL_MATCHES_TOTAL) break
  }
  return matches
}

// Bounded memo for per-keystroke work on strings that repeat across queries
// (link phrases, section excerpts).
function memoize<T>(fn: (text: string) => T, limit = 2000) {
  const cache = new Map<string, T>()
  return (text: string) => {
    let value = cache.get(text)
    if (value === undefined) {
      if (cache.size >= limit) cache.clear()
      value = fn(text)
      cache.set(text, value)
    }
    return value
  }
}

export const cachedPhraseKeys = memoize((text) => phraseKeys(text))
const cachedLinkKey = memoize((text) => phraseKeys(text, true).raw)
const cachedLinkTerms = memoize((phrase) => new Set(indexTermsOf(phrase)))

// The query must appear as a phrase, compared on the same normalized words the
// index uses (see phraseKeys), so "yt dlp" matches "yt-dlp" and "image
// hosting" matches "Image Hosts".
export function filterResults(
  results: (SearchResult & Result)[],
  filterTextValue: string
) {
  const phrase = cachedPhraseKeys(filterTextValue)
  if (!phrase.raw) return results

  const contains = (text: string) => {
    const keys = cachedPhraseKeys(text)
    return (
      keys.raw.includes(phrase.raw) || keys.stemmed.includes(phrase.stemmed)
    )
  }

  return results.filter((r) => {
    if (contains(r.title)) return true
    if (r.titles.some(contains)) return true
    if (r.urlMatched || r.semantic) return true
    if (!r.text) return true // Keep optimistically if text is not fetched yet
    return contains(r.text)
  })
}

// `miniSearchConfig` is the theme's `search.options.miniSearch` (constants.ts).
export function createSearchIndex(
  parsed: any,
  miniSearchConfig?: { options?: object; searchOptions?: object }
) {
  // Tokenizer and term processing come from the shared module rather than
  // the serialized theme config, so they always match the build.
  return MiniSearch.loadJS<Result>(parsed, {
    fields: ['title', 'titles', 'text'],
    storeFields: ['title', 'titles'],
    ...miniSearchConfig?.options,
    tokenize: tokenizeSearchText,
    processTerm: processIndexTerm,
    searchOptions: {
      fuzzy: false,
      prefix: true,
      boost: { title: 4, text: 2, titles: 1 },
      ...miniSearchConfig?.searchOptions,
      processTerm: processQueryTerm
    }
  })
}

export function getIndexTermKeys(index: MiniSearch<Result> | null): string[] {
  const ms = index as unknown as { _index?: Map<string, unknown> } | null
  return ms?._index ? [...ms._index.keys()] : []
}

// Flatten customMetadata into one parsed record per stored URL. Built once per
// index (not per search) so the hot path never re-parses URLs.
export function buildUrlIndex(customMetadata: CustomMetadata): UrlRecord[] {
  const records: UrlRecord[] = []
  for (const id in customMetadata) {
    const urls = customMetadata[id].u
    if (!urls) continue
    const starredUrls = new Set(customMetadata[id].su ?? [])
    for (const url of urls) {
      // Stored URLs are already normalized + scheme/www-stripped at build time.
      const hostPath = stripSchemeAndWww(url)
      const host = hostPath.split(/[/?#]/)[0]
      const { label, registrable } = urlRegistrable(host)
      records.push({
        id,
        hostPath,
        host,
        label,
        registrable,
        compactHost: compactUrlValue(host),
        compactLabel: compactUrlValue(label),
        isShared:
          URL_SHARED_DOMAINS.has(host) || URL_SHARED_DOMAINS.has(registrable),
        starred: starredUrls.has(url)
      })
    }
  }
  return records
}

export function buildGlobalLinksData(customMetadata: CustomMetadata) {
  const globalStarredLinks = new Set<string>()
  const globalLinks = new Set<string>()
  for (const key in customMetadata) {
    const item = customMetadata[key]
    if (item.s) {
      for (const phrase of item.s) {
        for (const w of indexTermsOf(phrase)) {
          globalStarredLinks.add(w)
        }
      }
    }
    if (item.l) {
      for (const phrase of item.l) {
        for (const w of indexTermsOf(phrase)) {
          globalLinks.add(w)
        }
      }
    }
  }
  return { globalStarredLinks, globalLinks }
}

// "Did you mean" suggestions, shown only when a single-word query has no results.
export function rankAutoSuggestions(
  index: MiniSearch<Result>,
  filterTextValue: string,
  globalLinksData: ReturnType<typeof buildGlobalLinksData>
): string[] {
  const query = filterTextValue.trim()
  if (/\s/.test(query)) return []

  try {
    const rawSuggestions = index.autoSuggest(query, {
      fuzzy: (term) => (term.length >= 5 ? 2 : 1),
      prefix: true
    }) as { suggestion: string; terms: string[]; score: number }[]

    const { globalStarredLinks, globalLinks } = globalLinksData

    const cleanQuery = query.toLowerCase()
    const sortedSuggestions = [...rawSuggestions].sort((a, b) => {
      const aSug = a.suggestion.toLowerCase()
      const bSug = b.suggestion.toLowerCase()

      const aPrefix = aSug.startsWith(cleanQuery) ? 1 : 0
      const bPrefix = bSug.startsWith(cleanQuery) ? 1 : 0
      if (aPrefix !== bPrefix) return bPrefix - aPrefix

      const aStarred = globalStarredLinks.has(aSug) ? 1 : 0
      const bStarred = globalStarredLinks.has(bSug) ? 1 : 0
      if (aStarred !== bStarred) return bStarred - aStarred

      const aLink = globalLinks.has(aSug) ? 1 : 0
      const bLink = globalLinks.has(bSug) ? 1 : 0
      if (aLink !== bLink) return bLink - aLink

      return (b.score || 0) - (a.score || 0)
    })

    return sortedSuggestions
      .map((s) => s.suggestion)
      .filter((s) => s && !/\s/.test(s) && s !== query.toLowerCase())
      .slice(0, MAX_SUGGESTIONS)
  } catch {
    return []
  }
}

// Archive-like pages (posts, other, removed/unsafe lists) and the
// language-specific lists rank after the main wiki, unless the query matched
// the section's ancestor headings (e.g. "italian streaming", "recently removed").
const ARCHIVE_PAGE_RE = /^\/(posts|other|recently-removed|unsafe)\b/
const LOCALIZED_PAGE_RE = /^\/non-english\b/

export function sectionPageRank(r: SearchHit) {
  const archive = ARCHIVE_PAGE_RE.test(r.id)
  if (!archive && !LOCALIZED_PAGE_RE.test(r.id)) return 0
  const matchedAncestors = Object.values(r.match ?? {}).some((fields) =>
    fields.includes('titles')
  )
  if (matchedAncestors) return 0
  return archive ? 2 : 1
}

export interface SearchContext {
  index: MiniSearch<Result>
  termKeys: string[]
  customMetadata: CustomMetadata
  urlIndex: UrlRecord[]
  sidebar: SidebarItem[]
}

export interface SearchModes {
  fuzzy: boolean
  url: boolean
  // Ranked semantic matches for the query, fused with the keyword results.
  semantic?: SemanticHit[]
}

const MAX_HEADING_PHRASES = 16

// Every way of spelling the query from one alternative per word group:
// [["yt", "youtube"], ["dl", "download"]] -> "yt dl", "yt download", ...
function headingPhrases(groups: string[][]): string[] {
  let phrases = ['']
  for (const group of groups) {
    const next: string[] = []
    for (const prefix of phrases) {
      for (const alt of group) {
        if (next.length < MAX_HEADING_PHRASES)
          next.push(prefix ? `${prefix} ${alt}` : alt)
      }
    }
    phrases = next
  }
  return phrases.filter(Boolean)
}

// `needle` occurs in `haystack` starting at a word boundary.
function startsWordIn(haystack: string, needle: string) {
  let from = haystack.indexOf(needle)
  while (from !== -1) {
    if (from === 0 || !/[\p{L}\p{N}]/u.test(haystack[from - 1])) return true
    from = haystack.indexOf(needle, from + 1)
  }
  return false
}

const OTHER_PLATFORM_FACTOR = 0.5

function withPageTitle(sidebar: SidebarItem[], r: SearchHit): SearchHit {
  const [id] = r.id.split('#')
  const cleanPath = '/' + id.replace(/\.html$/, '').replace(/^\//, '')
  const pageTitle = findPageTitle(sidebar, cleanPath)
  const titles = [...r.titles]

  if (pageTitle && !titles.includes(pageTitle) && r.title !== pageTitle) {
    titles.unshift(pageTitle)
  }

  return { ...r, titles }
}

type QueryPlanContext = {
  rewritten: boolean
  plan: ReturnType<typeof planQuery>
  groupQuery: (group: string[]) => Query
  words: string[]
  queryLooksLikeUrl: boolean
}

interface Vocabulary {
  terms: Set<string>
  sorted: string[]
}
const vocabularies = new WeakMap<string[], Vocabulary>()

function vocabularyOf(termKeys: string[]): Vocabulary {
  let vocab = vocabularies.get(termKeys)
  if (!vocab) {
    vocab = { terms: new Set(termKeys), sorted: [...termKeys].sort() }
    vocabularies.set(termKeys, vocab)
  }
  return vocab
}

function hasTermWithPrefix(vocab: Vocabulary, prefix: string) {
  const { sorted } = vocab
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < prefix) lo = mid + 1
    else hi = mid
  }
  return lo < sorted.length && sorted[lo].startsWith(prefix)
}

// A run-together word that matches nothing ("ublockorigin") as two index
// words, the second one possibly still being typed: ublock + origin.
function splitCompound(vocab: Vocabulary, word: string): string[] | null {
  if (!/^[\p{L}\p{N}]+$/u.test(word) || hasTermWithPrefix(vocab, word))
    return null
  for (let i = word.length - MIN_TERM_LENGTH; i >= MIN_TERM_LENGTH; i--) {
    const head = word.slice(0, i)
    const tail = word.slice(i)
    if (vocab.terms.has(head) && hasTermWithPrefix(vocab, tail))
      return [head, tail]
  }
  return null
}

/**
 * One query clause per word, also accepting the forms the index stores for
 * the same thing: the joined form ("yt-dlp" -> ytdlp), the stem ("emulators"
 * -> emulator) and a compound split ("ublockorigin" -> ublock + origin).
 * Returns null when no word needs more than itself.
 */
export function expandQueryWords(
  termKeys: string[],
  text: string
): (string | Query)[] | null {
  const vocab = vocabularyOf(termKeys)
  let expanded = false
  const clauses: (string | Query)[] = []
  for (const token of tokenizeSearchText(text)) {
    const word = processQueryTerm(token)
    if (!word) continue
    const forms: (string | Query)[] = [word]
    for (const form of [joinedFormOf(word), stemPrefixOf(word)]) {
      if (form && !forms.includes(form)) forms.push(form)
    }
    const split = splitCompound(vocab, word)
    if (split) forms.push({ combineWith: 'AND', queries: split })
    expanded ||= forms.length > 1
    clauses.push(
      forms.length > 1 ? { combineWith: 'OR', queries: forms } : word
    )
  }
  return expanded ? clauses : null
}

/**
 * Runs the index query for `filterTextValue` and returns the full ranked pool
 * (before excerpt filtering / pagination, see selectResultsPage).
 */
export function runSearch(
  ctx: SearchContext,
  filterTextValue: string,
  modes: SearchModes
): { results: SearchHit[]; usedSubstringExpansion: boolean } {
  const { index } = ctx
  const expandedWords = expandQueryWords(ctx.termKeys, filterTextValue)
  const wordsQuery: Query = expandedWords
    ? { combineWith: 'AND', queries: expandedWords }
    : filterTextValue
  let query: Query = wordsQuery
  let usedSubstringExpansion = false

  const words = tokenizeIndexLike(filterTextValue)
  const plan = planQuery(words)
  const rewritten = plan.rewritten && plan.required.length > 0
  const fuzzy = modes.fuzzy ? fuzzyTolerance : false
  // Typo tolerance applies to what the user typed, not to expansions.
  const groupQuery = (group: string[]): Query => ({
    combineWith: 'OR',
    queries: group.map((alt, i) =>
      alt.includes(' ')
        ? { combineWith: 'AND', queries: alt.split(' '), fuzzy: false }
        : { queries: [alt], fuzzy: i === 0 ? fuzzy : false }
    )
  })

  if (rewritten) {
    const parts = filterTextValue.split(/\s+/).filter((p) => p)
    const plannedQuery: Query = {
      combineWith: 'AND',
      queries: plan.required.map(groupQuery)
    }
    query =
      modes.fuzzy && parts.length > 1
        ? {
            combineWith: 'OR',
            queries: [
              plannedQuery,
              { queries: [parts.join('-')], combineWith: 'AND', fuzzy }
            ]
          }
        : plannedQuery
  } else if (modes.fuzzy) {
    query = buildTypoTolerantQuery(filterTextValue, ctx.termKeys) ?? query
  }

  /**
   * Suffix Search / Substring Matching:
   * For exact mode, find index terms containing the query as a substring
   * (e.g. "abolic" → "parabolic") using the pre-cached term key list.
   */
  if (
    !modes.fuzzy &&
    filterTextValue.length > 2 &&
    (!rewritten || (words.length === 1 && plan.optional.length === 0))
  ) {
    const candidateTerms: string[] = []
    const match = foldText(filterTextValue).toLowerCase()
    for (const term of ctx.termKeys) {
      if (term.includes(match) && term !== match) {
        candidateTerms.push(term)
      }
    }
    if (candidateTerms.length > 0) {
      // Sort by length ascending so shorter words win the cap
      candidateTerms.sort((a, b) => a.length - b.length)
      const capped = candidateTerms.slice(0, MAX_SUBSTRING_TERMS)
      usedSubstringExpansion = true
      query = {
        combineWith: 'OR',
        queries: [rewritten ? query : wordsQuery, ...capped]
      }
    }
  }

  // fuzzy only matters for string queries; structured queries carry their own per-clause fuzzy
  const searchOptions = {
    combineWith: 'AND' as const,
    fuzzy: modes.fuzzy && typeof query === 'string' ? fuzzyTolerance : false
  }

  const queryLooksLikeUrl = looksLikeUrlQuery(filterTextValue)
  // Pasted URLs should search URLs only. Running the normal text index too
  // turns URL punctuation into generic terms and leaks unrelated results.
  const rawResults = queryLooksLikeUrl
    ? []
    : (index.search(query, searchOptions) as SearchHit[])
  const searchUrls = modes.url || queryLooksLikeUrl
  const urlResults = searchUrls
    ? findUrlMatches(index, filterTextValue, ctx.urlIndex)
    : []
  const planned: QueryPlanContext = {
    rewritten,
    plan,
    groupQuery,
    words,
    queryLooksLikeUrl
  }
  const results = rankResults(
    ctx,
    filterTextValue,
    rawResults,
    urlResults,
    modes.fuzzy,
    planned
  )

  // Fallback chain: when the exact query finds nothing (or, for multi-word
  // queries or expanded words, may find nothing once the phrase check runs on
  // excerpts), also run the typo-tolerant query. Its hits are appended as a separate pool
  // (a section can be in both) that is only shown when no exact hit survives
  // (see selectResultsPage).
  // A rewritten query searches for more than the literal text, so like
  // substring expansion it must skip the literal-phrase excerpt filter.
  if (rewritten) usedSubstringExpansion = true
  const exact = isExactSearchMode(modes.fuzzy, usedSubstringExpansion)
  const mayNeedFallback =
    !modes.fuzzy &&
    !queryLooksLikeUrl &&
    (results.length === 0 ||
      (exact && (!!expandedWords || /\s/.test(filterTextValue.trim()))))
  const fallbackQuery = mayNeedFallback
    ? buildTypoTolerantQuery(filterTextValue, ctx.termKeys)
    : null
  if (fallbackQuery) {
    const fallbackRaw = index.search(fallbackQuery, {
      combineWith: 'AND'
    }) as SearchHit[]
    for (const r of rankResults(
      ctx,
      filterTextValue,
      fallbackRaw,
      [],
      true,
      planned
    )) {
      results.push({ ...r, fallback: true })
    }
  }

  if (!modes.semantic?.length || queryLooksLikeUrl)
    return { results, usedSubstringExpansion }

  // Semantic hits fuse into the pool that will be shown: the exact one, or
  // the typo-tolerant one when the exact query found nothing.
  const fallback = !results.some((r) => !r.fallback)
  const pool = results.filter((r) => !!r.fallback === fallback)
  const lines = new Map(modes.semantic.map((h) => [h.id, h.line]))
  const fused = fuseSemantic(pool, modes.semantic, (id) => {
    const stored = index.getStoredFields(id) as
      Pick<Result, 'title' | 'titles'> | undefined
    if (!stored) return null
    return withPageTitle(ctx.sidebar, {
      id,
      score: 0,
      terms: [],
      queryTerms: [],
      match: {},
      title: stored.title,
      titles: stored.titles,
      semantic: true,
      fallback
    } as SearchHit)
  }).map((r) => ({ ...r, semanticLine: lines.get(r.id) }))
  return {
    results: fused.slice(0, MAX_RESULTS_IN_MEMORY),
    usedSubstringExpansion
  }
}

function rankResults(
  ctx: SearchContext,
  filterTextValue: string,
  rawResults: SearchHit[],
  urlResults: SearchHit[],
  typoTolerant: boolean,
  planned: QueryPlanContext
): SearchHit[] {
  const { customMetadata, index } = ctx
  const { rewritten, plan, groupQuery } = planned
  const mergedResultsById = new Map<string, SearchHit>()
  for (const result of rawResults) {
    mergedResultsById.set(result.id, result)
  }
  // Optional words (fillers, platforms) only reorder what the required words
  // found. Searched separately so their matches don't count as matched terms
  // for the link tiers below.
  if (rewritten && rawResults.length > 0 && plan.optional.length > 0) {
    const optionalHits = index.search(
      { combineWith: 'OR', queries: plan.optional.map(groupQuery) },
      { combineWith: 'OR', fuzzy: false }
    )
    for (const hit of optionalHits) {
      const existing = mergedResultsById.get(hit.id)
      if (existing) existing.score += hit.score
    }
  }
  // Sections about a different platform than the one asked for ("remove ads
  // android" vs "Mac Adblock") rank below the rest.
  if (plan.platforms.length > 0) {
    const wanted = new Set(plan.platforms)
    if (wanted.has('android') || wanted.has('ios')) wanted.add('mobile')
    for (const result of mergedResultsById.values()) {
      const named = platformsIn([...result.titles, result.title].join(' '))
      if (named.length > 0 && !named.some((p) => wanted.has(p)))
        result.score *= OTHER_PLATFORM_FACTOR
    }
  }
  for (const result of urlResults) {
    const existing = mergedResultsById.get(result.id)
    if (existing) {
      existing.score += result.score
      existing.urlMatched = true
      existing.urlMatchedStarred =
        existing.urlMatchedStarred || result.urlMatchedStarred
    } else {
      mergedResultsById.set(result.id, result)
    }
  }

  const sidebarItems = ctx.sidebar
  const currentResults: SearchHit[] = [...mergedResultsById.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS_IN_MEMORY)
    .map((r) => withPageTitle(sidebarItems, r))

  // Ranking model:
  //   1. starredExact  – query exactly matches a starred-bold hyperlink
  //   2. exact         – query exactly matches any hyperlink
  //   3. starredPrefix – query is a prefix of a starred-bold hyperlink
  //   4. prefix        – query is a prefix of any hyperlink
  //   5. titlePhrase   – the section heading spells the query's words in order
  //   6. starredWord   – a query term is a word inside a starred hyperlink
  //   7. starredUrl    – a starred entry matched only on a link's URL
  //   8. linkWord      – a query term is a word inside any hyperlink
  //   9. linkUrl       – a non-starred entry matched only on a link's URL
  //  10. raw score (title/text match, etc.)
  // Bold-without-star is treated as a regular link (no special tier).
  // "Prefix"/"exact" compare the full query against the whole hyperlink text,
  // not against individual tokens. Strip zero-width characters from the
  // query to match the build-time normalization in extractLinkMetadata.
  const q = filterTextValue.replace(INVISIBLE_CHARS_RE, '').trim().toLowerCase()
  // Typo-tolerant hits matched corrected terms ("obsidain" -> "obsidian"), so
  // the literal query never equals a link text. Compare the link's leading
  // words with the terms the hit actually matched instead.
  // Two readings, as in buildTypoTolerantQuery: the separate words (unless
  // a one-letter word was dropped by the tokenizer) and the dashed join
  // ("u block" -> "u-block" ~ "ublock").
  const rawWords = typoTolerant ? q.split(/\s+/).filter(Boolean) : []
  const queryReadings: string[][] = []
  if (rawWords.length > 0) {
    if (rawWords.every((w) => w.length >= MIN_TERM_LENGTH)) {
      queryReadings.push(rawWords.flatMap((w) => tokenizeIndexLike(w)))
    }
    if (rawWords.length > 1) queryReadings.push([rawWords.join('-')])
  }
  const keys = termKeySet(ctx.termKeys)
  const queryStems = tokenizeIndexLike(q).map(stemWord)
  const titlePhrases = planned.queryLooksLikeUrl
    ? []
    : headingPhrases(rewritten ? plan.required : planned.words.map((w) => [w]))
  const qKey = cachedLinkKey(filterTextValue)

  const boostedResults = currentResults.map((r) => {
    const meta = customMetadata[r.id]
    let hasStarredExact = false
    let hasExact = false
    let hasStarredPrefix = false
    let hasPrefix = false
    let hasStarredWord = false
    let hasLinkWord = false

    const lowerTerms = r.terms ? r.terms.map((t) => t.toLowerCase()) : []

    const processPhrases = (
      phrases: string[] | undefined,
      isStarred: boolean
    ) => {
      if (!phrases) return
      for (const phrase of phrases) {
        const phraseKey = cachedLinkKey(phrase)
        let exact = !!qKey && phraseKey === qKey
        let prefix = !exact && !!qKey && phraseKey.startsWith(qKey)
        if (queryReadings.length > 0 && !exact && !prefix) {
          const words = tokenizeIndexLike(phrase)
          for (const reading of queryReadings) {
            if (
              reading.length > 0 &&
              words.length >= reading.length &&
              reading.every(
                (qw, i) =>
                  lowerTerms.includes(words[i]) &&
                  standsForQueryWord(words[i], qw, keys)
              )
            ) {
              exact = words.length === reading.length
              prefix = !exact
              if (exact) break
            }
          }
        }
        if (exact) {
          hasExact = true
          if (isStarred) hasStarredExact = true
        } else if (prefix) {
          hasPrefix = true
          if (isStarred) hasStarredPrefix = true
        }
        if (lowerTerms.length > 0) {
          const tokens = cachedLinkTerms(phrase)
          if (lowerTerms.some((t) => tokens.has(t))) {
            if (isStarred) hasStarredWord = true
            else hasLinkWord = true
          }
        }
      }
    }

    processPhrases(meta?.s, true)
    processPhrases(meta?.l, false)

    // URL matches hit the href, not the visible link text, so the phrase
    // tiers above never fire for them. Give them their own tier keyed off
    // whether the entry is starred, so a starred-link URL match interleaves
    // with the other curated results instead of sinking to the bottom on raw
    // score alone.
    const hasStarredUrl = !!r.urlMatchedStarred
    const hasLinkUrl = !!r.urlMatched && !hasStarredUrl
    const heading = r.title.toLowerCase()
    const hasTitlePhrase = titlePhrases.some((p) => startsWordIn(heading, p))

    // The section's own heading names what the user typed: "recipes" ->
    // Recipes, "rss reader" -> RSS Readers.
    const titleStems = tokenizeIndexLike(r.title || '').map(stemWord)
    const hasTitleAll =
      queryStems.length > 0 && queryStems.every((t) => titleStems.includes(t))
    const hasTitleExact =
      hasTitleAll && titleStems.join(' ') === queryStems.join(' ')

    return {
      ...r,
      pageRank: sectionPageRank(r),
      hasStarredExact,
      hasTitleExact,
      hasTitleAll,
      hasExact,
      hasStarredPrefix,
      hasPrefix,
      hasTitlePhrase,
      hasStarredWord,
      hasStarredUrl,
      hasLinkWord,
      hasLinkUrl
    }
  })

  const tierKeys: (keyof BoostFlags)[] = [
    'hasStarredExact',
    'hasTitleAll',
    'hasExact',
    'hasStarredPrefix',
    'hasPrefix',
    'hasTitlePhrase',
    'hasStarredWord',
    'hasStarredUrl',
    'hasLinkWord',
    'hasLinkUrl'
  ]

  boostedResults.sort((a, b) => {
    if (a.pageRank !== b.pageRank) return a.pageRank - b.pageRank
    for (const key of tierKeys) {
      const av = a[key] ? 1 : 0
      const bv = b[key] ? 1 : 0
      if (av !== bv) return bv - av
      // Among heading matches, the heading that is exactly the query wins.
      if (key === 'hasTitleAll' && av && a.hasTitleExact !== b.hasTitleExact)
        return a.hasTitleExact ? -1 : 1
    }
    if (b.score !== a.score) return b.score - a.score
    // Deterministic fallback for exact score ties so equal-scored results
    // don't reshuffle between fuzzy/exact modes (or re-renders). Compare by
    // title, then id, for a stable order.
    return (
      (a.title || '').localeCompare(b.title || '') || a.id.localeCompare(b.id)
    )
  })

  return boostedResults
}

// Exact mode (no fuzzy, no substring expansion) verifies the phrase against
// excerpts, so it needs a larger candidate pool than the page it shows.
export function isExactSearchMode(
  fuzzy: boolean,
  usedSubstringExpansion: boolean
) {
  return !fuzzy && !usedSubstringExpansion
}

export function resultCandidates(
  scopedResults: SearchHit[],
  limit: number,
  exact: boolean
) {
  if (!exact) return scopedResults.slice(0, limit)
  // The phrase check needs excerpts for the exact pool; the typo-tolerant
  // fallback page is shown as is, so only its first page needs them.
  const exactPool = scopedResults.filter((r) => !r.fallback)
  const fallbackPool = scopedResults.filter((r) => r.fallback)
  return [
    ...exactPool.slice(0, Math.max(MIN_CANDIDATE_POOL, limit * 2)),
    ...fallbackPool.slice(0, limit)
  ]
}

/**
 * Picks the page of results shown to the user from the ranked pool.
 * `textOf(id)` returns the section excerpt HTML ('' when not loaded).
 * `relaxed` = the page comes from the typo-tolerant query, so highlight the
 * matched terms rather than the literal query.
 */
export function selectResultsPage(
  scopedResults: SearchHit[],
  options: {
    limit: number
    exact: boolean
    detailed: boolean
    filterText: string
    textOf: (id: string) => string
  }
): {
  finalResults: SearchHit[]
  totalCount: number
  mayHaveMore: boolean
  postFiltered: SearchHit[] | null
  relaxed: boolean
} {
  const { limit, exact, detailed, filterText, textOf } = options
  const exactPool = scopedResults.filter((r) => !r.fallback)
  const fallbackPool = scopedResults.filter((r) => r.fallback)
  if (exact && exactPool.length > 0) {
    // Exact mode runs in both views. A dynamic candidate pool keeps contiguous
    // phrase matches from being ranked away, and the list (and chips) look
    // the same in compact and detailed.
    const candidates = exactPool.slice(
      0,
      Math.max(MIN_CANDIDATE_POOL, limit * 2)
    )
    const mapped = candidates.map((r) => ({ ...r, text: textOf(r.id) }))
    const filtered = filterResults(mapped, filterText)
    if (filtered.length > 0 || fallbackPool.length === 0) {
      return {
        finalResults: filtered.slice(0, limit),
        totalCount: filtered.length,
        // Untested remainder beyond the candidate pool may contain more
        // matches; expanding the limit re-runs this with a larger pool.
        mayHaveMore: exactPool.length > candidates.length,
        postFiltered: filtered,
        relaxed: false
      }
    }
  }
  // Fuzzy search, substring expansion or the typo-tolerant fallback: slice to
  // limit directly
  const pool = exact || exactPool.length === 0 ? fallbackPool : scopedResults
  const mapped = pool.slice(0, limit).map((r) => ({
    ...r,
    text: detailed ? textOf(r.id) : ''
  }))
  return {
    finalResults: mapped,
    totalCount: pool.length,
    mayHaveMore: false,
    postFiltered: pool === scopedResults ? null : pool,
    relaxed: pool === fallbackPool
  }
}
