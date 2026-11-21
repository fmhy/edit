/**
 * Pure query-time search logic for the local search modal.
 *
 * Shared by VPLocalSearchBox.vue (browser) and the offline benchmark in eval/
 * (Node). Keep it free of Vue/DOM/VitePress-client imports so both can load it.
 */

import type { Query, SearchResult } from 'minisearch'
import MiniSearch from 'minisearch'
import { normalizeSearchUrl, stripSchemeAndWww } from '../../shared'

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
}

export interface BoostFlags {
  hasStarredExact: boolean
  hasExact: boolean
  hasStarredPrefix: boolean
  hasPrefix: boolean
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
  for (const r of results) {
    const category = resultCategoryOf(r.id)
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return counts
}

// \u26A0 tokenizeIndexLike duplicates the tokenize + processTerm logic from
// constants.ts (miniSearch.options).  If you change the split regex, stop
// words, or min-length there, update this copy too \u2014 ranking breaks silently
// when they disagree.
export const TOKEN_STOP_WORDS = new Set([
  'frontmatter',
  '$frontmatter.synopsis',
  'and',
  'about',
  'but',
  'now',
  'the',
  'with',
  'you'
])
export const INVISIBLE_CHARS_RE = /\u2060|\u200B|\u200C|\u200D|\uFEFF/g
export const TOKEN_SPLIT_RE = /[\n\r #%*,=/:;?[\]{}()&]+/u
export const MIN_TERM_LENGTH = 2

export function tokenizeIndexLike(
  text: string,
  splitDottedParts = false
): string[] {
  const out: string[] = []
  const raw = text.replace(INVISIBLE_CHARS_RE, '').split(TOKEN_SPLIT_RE)
  for (const piece of raw) {
    if (!piece) continue
    const t = piece.trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '')
    if (t.length < MIN_TERM_LENGTH || TOKEN_STOP_WORDS.has(t)) continue
    out.push(t)
    if (splitDottedParts && t.includes('.')) {
      for (const part of t.split('.')) {
        if (part.length >= MIN_TERM_LENGTH && !TOKEN_STOP_WORDS.has(part))
          out.push(part)
      }
    }
  }
  return out
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

export function fuzzyTolerance(term: string) {
  if (term.length < 5) return false
  return term.length < 9 ? 1 : 2
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
      score: 1,
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

export function filterResults(
  results: (SearchResult & Result)[],
  filterTextValue: string
) {
  const clean = (s: string) =>
    s
      .replace(INVISIBLE_CHARS_RE, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

  const phrase = clean(filterTextValue)
  if (!phrase) return results

  return results.filter((r) => {
    if (clean(r.title).includes(phrase)) return true
    if (r.titles.some((t) => clean(t).includes(phrase))) return true
    if (r.urlMatched) return true
    if (!r.text) return true // Keep optimistically if text is not fetched yet
    return clean(r.text).includes(phrase)
  })
}

// `miniSearchConfig` is the theme's `search.options.miniSearch` (constants.ts).
export function createSearchIndex(
  parsed: any,
  miniSearchConfig?: { options?: object; searchOptions?: object }
) {
  return MiniSearch.loadJS<Result>(parsed, {
    fields: ['title', 'titles', 'text'],
    storeFields: ['title', 'titles'],
    tokenize: (text: string) =>
      text
        .replace(INVISIBLE_CHARS_RE, '')
        .split(TOKEN_SPLIT_RE)
        .filter((t) => t),
    searchOptions: {
      fuzzy: false,
      prefix: true,
      boost: { title: 4, text: 2, titles: 1 },
      ...miniSearchConfig?.searchOptions
    },
    ...miniSearchConfig?.options
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
        for (const w of tokenizeIndexLike(phrase, true)) {
          globalStarredLinks.add(w)
        }
      }
    }
    if (item.l) {
      for (const phrase of item.l) {
        for (const w of tokenizeIndexLike(phrase, true)) {
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
  const { index, customMetadata } = ctx
  let query: Query = filterTextValue
  let usedSubstringExpansion = false

  if (modes.fuzzy) {
    const parts = filterTextValue.split(/\s+/).filter((p) => p)
    if (parts.length > 0) {
      const dashed = parts.join('-')
      query = {
        combineWith: 'OR',
        queries: [
          {
            queries: parts,
            combineWith: 'AND',
            fuzzy: fuzzyTolerance
          },
          {
            queries: [dashed],
            combineWith: 'AND',
            fuzzy: fuzzyTolerance
          }
        ]
      }
    }
  }

  /**
   * Suffix Search / Substring Matching:
   * For exact mode, find index terms containing the query as a substring
   * (e.g. "abolic" → "parabolic") using the pre-cached term key list.
   */
  if (!modes.fuzzy && filterTextValue.length > 2) {
    const candidateTerms: string[] = []
    const match = filterTextValue.toLowerCase()
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
        queries: [filterTextValue, ...capped]
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
  const mergedResultsById = new Map<string, SearchHit>()
  for (const result of rawResults) {
    mergedResultsById.set(result.id, result)
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
    .map((r) => {
      const [id] = r.id.split('#')
      const cleanPath = '/' + id.replace(/\.html$/, '').replace(/^\//, '')
      const pageTitle = findPageTitle(sidebarItems, cleanPath)
      const titles = [...r.titles]

      if (pageTitle && !titles.includes(pageTitle) && r.title !== pageTitle) {
        titles.unshift(pageTitle)
      }

      return { ...r, titles }
    })

  // Ranking model:
  //   1. starredExact  – query exactly matches a starred-bold hyperlink
  //   2. exact         – query exactly matches any hyperlink
  //   3. starredPrefix – query is a prefix of a starred-bold hyperlink
  //   4. prefix        – query is a prefix of any hyperlink
  //   5. starredWord   – a query term is a word inside a starred hyperlink
  //   6. starredUrl    – a starred entry matched only on a link's URL
  //   7. linkWord      – a query term is a word inside any hyperlink
  //   8. linkUrl       – a non-starred entry matched only on a link's URL
  //   9. raw score (title/text match, etc.)
  // Bold-without-star is treated as a regular link (no special tier).
  // "Prefix"/"exact" compare the full query against the whole hyperlink text,
  // not against individual tokens. Strip zero-width characters from the
  // query to match the build-time normalization in extractLinkMetadata.
  const q = filterTextValue.replace(INVISIBLE_CHARS_RE, '').trim().toLowerCase()

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
        if (q && phrase === q) {
          hasExact = true
          if (isStarred) hasStarredExact = true
        } else if (q && phrase.startsWith(q)) {
          hasPrefix = true
          if (isStarred) hasStarredPrefix = true
        }
        if (lowerTerms.length > 0) {
          const tokens = new Set(tokenizeIndexLike(phrase, true))
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

    return {
      ...r,
      hasStarredExact,
      hasExact,
      hasStarredPrefix,
      hasPrefix,
      hasStarredWord,
      hasStarredUrl,
      hasLinkWord,
      hasLinkUrl
    }
  })

  const tierKeys: (keyof BoostFlags)[] = [
    'hasStarredExact',
    'hasExact',
    'hasStarredPrefix',
    'hasPrefix',
    'hasStarredWord',
    'hasStarredUrl',
    'hasLinkWord',
    'hasLinkUrl'
  ]

  boostedResults.sort((a, b) => {
    for (const key of tierKeys) {
      const av = a[key] ? 1 : 0
      const bv = b[key] ? 1 : 0
      if (av !== bv) return bv - av
    }
    if (b.score !== a.score) return b.score - a.score
    // Deterministic fallback for exact score ties so equal-scored results
    // don't reshuffle between fuzzy/exact modes (or re-renders). Compare by
    // title, then id, for a stable order.
    return (
      (a.title || '').localeCompare(b.title || '') || a.id.localeCompare(b.id)
    )
  })

  return { results: boostedResults, usedSubstringExpansion }
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
  return exact
    ? scopedResults.slice(0, Math.max(MIN_CANDIDATE_POOL, limit * 2))
    : scopedResults.slice(0, limit)
}

/**
 * Picks the page of results shown to the user from the ranked pool.
 * `textOf(id)` returns the section excerpt HTML ('' when not loaded).
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
} {
  const { limit, exact, detailed, filterText, textOf } = options
  const candidates = resultCandidates(scopedResults, limit, exact)
  if (exact) {
    // Exact mode runs in both views. A dynamic candidate pool keeps contiguous
    // phrase matches from being ranked away, and the list (and chips) look
    // the same in compact and detailed.
    const mapped = candidates.map((r) => ({ ...r, text: textOf(r.id) }))
    const filtered = filterResults(mapped, filterText)
    return {
      finalResults: filtered.slice(0, limit),
      totalCount: filtered.length,
      // Untested remainder beyond the candidate pool may contain more matches;
      // expanding the limit re-runs this with a larger candidate pool.
      mayHaveMore: scopedResults.length > candidates.length,
      postFiltered: filtered
    }
  }
  // Fuzzy search or substring expansion: slice to limit directly
  const mapped = candidates.map((r) => ({
    ...r,
    text: detailed ? textOf(r.id) : ''
  }))
  return {
    finalResults: mapped,
    totalCount: mapped.length + Math.max(0, scopedResults.length - limit),
    mayHaveMore: false,
    postFiltered: null
  }
}
