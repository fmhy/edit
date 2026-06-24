<script lang="ts">
import { h, ref } from 'vue'

const RESULTS_PAGE_SIZE = 16
const MAX_RESULTS_IN_MEMORY = 200
const MAX_SUBSTRING_TERMS = 100
const MAX_RECENT_SEARCHES = 20
const MAX_SUGGESTIONS = 3
const SEARCH_DEBOUNCE_MS = 350
const MIN_CANDIDATE_POOL = 32
const MARK_MERGE_DISTANCE_PX = 20
const MARK_SAME_LINE_THRESHOLD_PX = 5

// Permanent global cache for rendered excerpts keyed by page ID (build output is stable)
const globalExcerptCache = new Map<string, Map<string, string>>()

// Persisted results state across mount/unmount of the modal
const globalLastQuery = ref('')
const globalLastFuzzy = ref(false)
const globalLastUrlSearch = ref(false)
const globalLastDetailed = ref(false)
const globalResults = ref<any[]>([])
const globalAllResults = ref<any[]>([])
const globalTotalResultsCount = ref(0)
const globalResultMarks = ref<Map<number, HTMLElement[][]>>(new Map())
const globalCurrentMarkIndex = ref<Map<number, number>>(new Map())
const globalResultLimit = ref(RESULTS_PAGE_SIZE)
const globalUsedSubstringExpansion = ref(false)
const globalMayHaveMore = ref(false)
</script>

<script lang="ts" setup>
import type { SearchResult } from 'minisearch'
import type { ModalTranslations } from 'vitepress/types/local-search'
import type { Component, Ref } from 'vue'
import localSearchIndex from '@localSearchIndex'
import {
  computedAsync,
  debouncedWatch,
  onKeyStroke,
  useEventListener,
  useLocalStorage,
  useScrollLock,
  useSessionStorage
} from '@vueuse/core'
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap'
import Mark from 'mark.js/src/vanilla.js'
import MiniSearch from 'minisearch'
import { dataSymbol, inBrowser, useRouter } from 'vitepress'
import { pathToFile } from 'vitepress/dist/client/app/utils'
import { escapeRegExp } from 'vitepress/dist/client/shared'
import { useData } from 'vitepress/dist/client/theme-default/composables/data'
import { createSearchTranslate } from 'vitepress/dist/client/theme-default/support/translation'
import {
  computed,
  createApp,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  triggerRef,
  watch,
  watchEffect
} from 'vue'
import { sidebar, stripSchemeAndWww } from '../../shared'
import { sanitizeRichHtml, sanitizeSearchHtml } from '../composables/sanitize'
import {
  cancelPendingScroll,
  pendingScrollQuery,
  scheduleScrollToMatch
} from '../composables/searchScroll'
import Tooltip from './Tooltip.vue'

defineEmits<{
  (e: 'close'): void
}>()

const show = ref(true)

function close() {
  show.value = false
}

const el = shallowRef<HTMLElement>()
const resultsEl = shallowRef<HTMLElement>()

/* Search */

const searchIndexData = shallowRef(localSearchIndex)

// Hot Module Replacement - updates search index without full page reload during development
if (import.meta.hot) {
  import.meta.hot.accept('@localSearchIndex', (m: { default: unknown }) => {
    if (m) {
      searchIndexData.value = m.default as typeof localSearchIndex
    }
  })
}

interface Result {
  title: string
  titles: string[]
  text?: string
  urlMatched?: boolean
}

interface BoostFlags {
  hasStarredExact: boolean
  hasExact: boolean
  hasStarredPrefix: boolean
  hasPrefix: boolean
  hasStarredWord: boolean
  hasStarredUrl: boolean
  hasLinkWord: boolean
  hasLinkUrl: boolean
}

const vitePressData = useData()
const { activate } = useFocusTrap(el, {
  allowOutsideClick: true,
  clickOutsideDeactivates: true,
  escapeDeactivates: true
})
const { localeIndex, theme } = vitePressData

/**
 * Fuzzy search toggle state.
 * - false: Exact phrase matching (default)
 * - true: Fuzzy matching with typo tolerance and multi-word queries
 * Persisted in localStorage for user preference across sessions.
 */
const isFuzzySearch = useLocalStorage('vitepress:local-search-fuzzy', false)
// Opt-in: also match results by the URLs (link hrefs) they contain. Default off.
const isUrlSearch = useLocalStorage('vitepress:local-search-url', false)

const customMetadata = shallowRef<
  Record<string, { l?: string[]; s?: string[]; u?: string[] }>
>({})

const globalLinksData = computed(() => {
  const globalStarredLinks = new Set<string>()
  const globalLinks = new Set<string>()
  for (const key in customMetadata.value) {
    const item = customMetadata.value[key]
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
})

// \u26A0 tokenizeIndexLike duplicates the tokenize + processTerm logic from
// constants.ts (miniSearch.options).  If you change the split regex, stop
// words, or min-length there, update this copy too \u2014 ranking breaks silently
// when they disagree.
const TOKEN_STOP_WORDS = new Set([
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
const INVISIBLE_CHARS_RE = /\u2060|\u200B|\u200C|\u200D|\uFEFF/g
const TOKEN_SPLIT_RE = /[\n\r #%*,=/:;?[\]{}()&]+/u
const MIN_TERM_LENGTH = 2

function tokenizeIndexLike(text: string, splitDottedParts = false): string[] {
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

function normalizeUrlSearchValue(value: string) {
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
const URL_HOST_SUFFIXES = new Set([
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
const URL_SHARED_DOMAINS = new Set([
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
const MAX_URL_MATCHES_PER_DOMAIN = 8
const MAX_URL_MATCHES_TOTAL = 60

// Below this length a bare query only matches a label by prefix/exact, never a
// mid-label substring: "wco" should hit "wcofun" but not "showcode". Longer
// needles keep substring matching so intentional fragments still work.
const MIN_SUBSTRING_NEEDLE_LENGTH = 4

function fuzzyTolerance(term: string) {
  if (term.length < 5) return false
  return term.length < 9 ? 1 : 2
}

// Punctuation-insensitive form so "pihole" matches "pi-hole".
function compactUrlValue(value: string) {
  return value.replace(/[^a-z0-9]/g, '')
}

// Resolve a host to its registrable label (the meaningful name) and registrable
// domain, honoring the multi-part / hosting suffixes above.
function urlRegistrable(host: string): { label: string; registrable: string } {
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

interface UrlQuery {
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
function buildUrlQuery(query: string): UrlQuery | null {
  const normalized = normalizeUrlSearchValue(query)
  if (normalized.length < 3) return null

  // A typed scheme or leading "www." anchors the match to the host start.
  const anchored =
    /^[a-z][a-z0-9+.-]*:\/\//.test(normalized) || normalized.startsWith('www.')
  const stripped = stripSchemeAndWww(normalized)
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

function looksLikeUrlQuery(query: string) {
  const normalized = normalizeUrlSearchValue(query)
  const stripped = stripSchemeAndWww(normalized)
  return (
    /^[a-z][a-z0-9+.-]*:\/\//.test(normalized) ||
    normalized.startsWith('www.') ||
    stripped.includes('.') ||
    stripped.includes('/')
  )
}

// `normalizedUrl` is expected already normalized + scheme/www-stripped (the form
// stored in the index). Callers passing a raw href must normalize first.
function urlMatchesNormalizedUrl(normalizedUrl: string, urlQuery: UrlQuery) {
  const hostPath = stripSchemeAndWww(normalizedUrl)
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
interface UrlRecord {
  id: string
  hostPath: string // host + path (e.g. "github.com/yt-dlp")
  host: string // host only (e.g. "github.com")
  label: string // registrable label (e.g. "pi-hole")
  registrable: string // registrable domain (e.g. "pi-hole.net")
  compactHost: string // punctuation-stripped host
  compactLabel: string // punctuation-stripped label
  isShared: boolean // host/registrable is a suppressed shared platform
}

// Flatten customMetadata into one parsed record per stored URL. Recomputed only
// when the metadata changes (locale switch / HMR), not per search, so the parse
// cost is paid once instead of on every keystroke (see findUrlMatches).
const urlIndex = computed<UrlRecord[]>(() => {
  const records: UrlRecord[] = []
  for (const id in customMetadata.value) {
    const urls = customMetadata.value[id].u
    if (!urls) continue
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
          URL_SHARED_DOMAINS.has(host) || URL_SHARED_DOMAINS.has(registrable)
      })
    }
  }
  return records
})

// How strongly a haystack matches a needle: 3 = exact, 2 = prefix, 1 = substring,
// 0 = no match. Lets findUrlMatches keep the most relevant matches when a cap
// forces a cut, instead of dropping by arbitrary index order.
function matchStrength(haystack: string, needle: string) {
  if (haystack === needle) return 3
  if (haystack.startsWith(needle)) return 2
  if (haystack.includes(needle)) return 1
  return 0
}

// Rank a pre-parsed record against the query (0 = no match). Mirrors
// urlMatchesNormalizedUrl's matching, but reads the precomputed host parts
// instead of re-deriving them, and returns a strength instead of a boolean.
function recordMatchRank(rec: UrlRecord, urlQuery: UrlQuery) {
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

const searchIndex = computedAsync(async () => {
  const rawIndex = (await searchIndexData.value[localeIndex.value]?.())?.default
  if (!rawIndex) return null
  let parsed: any
  try {
    parsed = typeof rawIndex === 'string' ? JSON.parse(rawIndex) : rawIndex
  } catch {
    return null
  }
  customMetadata.value = parsed?.customMetadata || {}
  return markRaw(
    MiniSearch.loadJS<Result>(parsed, {
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
        ...(theme.value.search?.provider === 'local' &&
          theme.value.search.options?.miniSearch?.searchOptions)
      },
      ...(theme.value.search?.provider === 'local' &&
        theme.value.search.options?.miniSearch?.options)
    })
  )
})

const disableQueryPersistence = computed(() => {
  return (
    theme.value.search?.provider === 'local' &&
    theme.value.search.options?.disableQueryPersistence === true
  )
})

const filterText = disableQueryPersistence.value
  ? ref('')
  : useSessionStorage('vitepress:local-search-filter', '')

const showDetailedList = useLocalStorage(
  'vitepress:local-search-detailed-list',
  theme.value.search?.provider === 'local' &&
    theme.value.search.options?.detailedView === true
)

const disableDetailedView = computed(() => {
  return (
    theme.value.search?.provider === 'local' &&
    (theme.value.search.options?.disableDetailedView === true ||
      theme.value.search.options?.detailedView === false)
  )
})

const buttonText = computed(() => {
  const options = theme.value.search?.options ?? theme.value.algolia

  return (
    options?.locales?.[localeIndex.value]?.translations?.button?.buttonText ||
    options?.translations?.button?.buttonText ||
    'Search'
  )
})

watchEffect(() => {
  if (disableDetailedView.value) {
    showDetailedList.value = false
  }
})

function matchesGlobalState() {
  return (
    inBrowser &&
    filterText.value === globalLastQuery.value &&
    isFuzzySearch.value === globalLastFuzzy.value &&
    isUrlSearch.value === globalLastUrlSearch.value &&
    showDetailedList.value === globalLastDetailed.value
  )
}

const isRestoring = matchesGlobalState()

const results: Ref<(SearchResult & Result)[]> = shallowRef(
  isRestoring ? globalResults.value : []
)
const allResults = shallowRef<(SearchResult & Result)[]>(
  isRestoring ? globalAllResults.value : []
)
const totalResultsCount = ref(isRestoring ? globalTotalResultsCount.value : 0)
const resultMarks = shallowRef<Map<number, HTMLElement[][]>>(
  isRestoring ? new Map(globalResultMarks.value) : new Map()
)
const currentMarkIndex = shallowRef<Map<number, number>>(
  isRestoring ? new Map(globalCurrentMarkIndex.value) : new Map()
)

const enableNoResults = ref(isRestoring)
const isSearching = ref(!isRestoring && !!filterText.value)
const usedSubstringExpansion = ref(
  isRestoring ? globalUsedSubstringExpansion.value : false
)
const resultLimit = ref(
  isRestoring ? globalResultLimit.value : RESULTS_PAGE_SIZE
)
const mayHaveMore = ref(isRestoring ? globalMayHaveMore.value : false)

const recentSearches = useLocalStorage<string[]>(
  'vitepress:local-search-recent',
  []
)

const shouldResetScroll = ref(false)

const autoSuggestions = computed(() => {
  if (!filterText.value || results.value.length > 0 || !searchIndex.value)
    return []

  const query = filterText.value.trim()
  if (/\s/.test(query)) return []

  try {
    const rawSuggestions = searchIndex.value.autoSuggest(query, {
      fuzzy: (term) => (term.length >= 5 ? 2 : 1),
      prefix: true
    }) as { suggestion: string; terms: string[]; score: number }[]

    const { globalStarredLinks, globalLinks } = globalLinksData.value

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
})

watch([filterText, isFuzzySearch, isUrlSearch], () => {
  enableNoResults.value = false
  resultLimit.value = RESULTS_PAGE_SIZE
  shouldResetScroll.value = true
})

const cache = globalExcerptCache

function getRelativeOffsetTop(
  element: HTMLElement,
  ancestor: HTMLElement
): number {
  let offsetTop = 0
  let curr: HTMLElement | null = element
  while (curr && curr !== ancestor) {
    offsetTop += curr.offsetTop
    curr = curr.offsetParent as HTMLElement | null
  }
  return offsetTop
}

// Cached term keys for substring matching — rebuilt only when the search index changes
let cachedTermKeys: string[] = []

interface SidebarItem {
  text?: string
  link?: string
  items?: SidebarItem[]
}

function findPageTitle(items: SidebarItem[], path: string): string | null {
  for (const item of items) {
    if (item.link === path) return item.text ?? null
    if (item.items) {
      const found = findPageTitle(item.items, path)
      if (found) return found
    }
  }
  return null
}

function findUrlMatches(index: MiniSearch<Result>, query: string) {
  const matches: (SearchResult & Result)[] = []
  const urlQuery = buildUrlQuery(query)
  if (!urlQuery) return matches

  // Gather one candidate per entry first, keeping the best-ranked matching URL
  // for that entry. One entry can own several URLs; mirror the old `meta.u.find`
  // by counting each entry at most once.
  const candidates = new Map<string, UrlRecord & { rank: number }>()
  for (const rec of urlIndex.value) {
    const rank = recordMatchRank(rec, urlQuery)
    if (rank === 0) continue
    const existing = candidates.get(rec.id)
    if (!existing || rank > existing.rank) {
      candidates.set(rec.id, { ...rec, rank })
    }
  }

  // Sort by relevance before applying the ceilings, so when a cap forces a cut
  // we drop the *least* relevant matches: curated/starred entries first, then
  // by match strength (exact > prefix > substring). Within-cap order doesn't
  // matter — the merged result set is re-sorted globally by tier/score later.
  const ranked = [...candidates.values()].sort((a, b) => {
    const aStarred = customMetadata.value[a.id]?.s?.length ? 1 : 0
    const bStarred = customMetadata.value[b.id]?.s?.length ? 1 : 0
    return bStarred - aStarred || b.rank - a.rank
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
      urlMatched: true
    })
    if (matches.length >= MAX_URL_MATCHES_TOTAL) break
  }
  return matches
}

/**
 * Main search handler - debounced to avoid excessive re-renders while typing.
 * Watches: search index, filter text, detail view toggle, and fuzzy search mode.
 */
watch(
  [filterText, isFuzzySearch, isUrlSearch, showDetailedList, searchIndex],
  () => {
    isSearching.value = !matchesGlobalState() && !!filterText.value
  },
  { immediate: true }
)

// Rebuild term keys and clear cache on index change (locale switch or HMR)
watch(
  searchIndex,
  (index) => {
    cache.clear()
    if (index) {
      const ms = index as unknown as { _index?: Map<string, unknown> }
      cachedTermKeys = ms?._index ? [...ms._index.keys()] : []
    } else {
      cachedTermKeys = []
    }
  },
  { immediate: true }
)

// 1. Debounced Search watcher: Only runs the index query and gets the raw matching results list
debouncedWatch(
  () =>
    [
      searchIndex.value,
      filterText.value,
      isFuzzySearch.value,
      isUrlSearch.value,
      showDetailedList.value
    ] as const,
  async ([index, filterTextValue], old, onCleanup) => {
    const indexChanged = old && old[0] !== undefined && old[0] !== index
    if (!indexChanged && matchesGlobalState()) {
      return
    }

    let canceled = false
    onCleanup(() => {
      canceled = true
    })

    if (!index || !filterTextValue.trim()) {
      allResults.value = []
      totalResultsCount.value = 0
      mayHaveMore.value = false

      // Clear global cache for empty query
      globalAllResults.value = []
      globalTotalResultsCount.value = 0
      globalLastQuery.value = ''
      globalResults.value = []
      globalResultMarks.value = new Map()
      globalCurrentMarkIndex.value = new Map()
      globalMayHaveMore.value = false
      return
    }

    let query: string | object = filterTextValue
    usedSubstringExpansion.value = false

    if (isFuzzySearch.value) {
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
    if (!isFuzzySearch.value && filterTextValue.length > 2) {
      const candidateTerms: string[] = []
      const match = filterTextValue.toLowerCase()
      for (const term of cachedTermKeys) {
        if (term.includes(match) && term !== match) {
          candidateTerms.push(term)
        }
      }
      if (candidateTerms.length > 0) {
        // Sort by length ascending so shorter words win the cap
        candidateTerms.sort((a, b) => a.length - b.length)
        const capped = candidateTerms.slice(0, MAX_SUBSTRING_TERMS)
        usedSubstringExpansion.value = true
        query = {
          combineWith: 'OR',
          queries: [filterTextValue, ...capped]
        }
      }
    }

    // fuzzy only matters for string queries; structured queries carry their own per-clause fuzzy
    const searchOptions = {
      combineWith: 'AND',
      fuzzy:
        isFuzzySearch.value && typeof query === 'string'
          ? fuzzyTolerance
          : false
    }

    // Search and retrieve all matches (up to 200 max in memory)
    const rawResults = index.search(query, searchOptions) as (SearchResult &
      Result)[]
    const searchUrls = isUrlSearch.value || looksLikeUrlQuery(filterTextValue)
    const urlResults = searchUrls ? findUrlMatches(index, filterTextValue) : []
    const mergedResultsById = new Map<string, SearchResult & Result>()
    for (const result of rawResults) {
      mergedResultsById.set(result.id, result)
    }
    for (const result of urlResults) {
      const existing = mergedResultsById.get(result.id)
      if (existing) {
        existing.score += result.score
        existing.urlMatched = true
      } else {
        mergedResultsById.set(result.id, result)
      }
    }

    const sidebarItems = Array.isArray(sidebar) ? sidebar : []
    const currentResults: (SearchResult & Result)[] = [
      ...mergedResultsById.values()
    ]
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
    //   1. starredExact  \u2013 query exactly matches a starred-bold hyperlink
    //   2. exact         \u2013 query exactly matches any hyperlink
    //   3. starredPrefix \u2013 query is a prefix of a starred-bold hyperlink
    //   4. prefix        \u2013 query is a prefix of any hyperlink
    //   5. starredWord   \u2013 a query term is a word inside a starred hyperlink
    //   6. starredUrl    \u2013 a starred entry matched only on a link's URL
    //   7. linkWord      \u2013 a query term is a word inside any hyperlink
    //   8. linkUrl       \u2013 a non-starred entry matched only on a link's URL
    //   9. raw score (title/text match, etc.)
    // Bold-without-star is treated as a regular link (no special tier).
    // "Prefix"/"exact" compare the full query against the whole hyperlink text,
    // not against individual tokens. Strip zero-width characters from the
    // query to match the build-time normalization in extractLinkMetadata.
    const q = filterTextValue
      .replace(INVISIBLE_CHARS_RE, '')
      .trim()
      .toLowerCase()

    const boostedResults = currentResults.map((r) => {
      const meta = customMetadata.value[r.id]
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
      const isStarred = !!meta?.s?.length
      const hasStarredUrl = !!r.urlMatched && isStarred
      const hasLinkUrl = !!r.urlMatched && !isStarred

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

    enableNoResults.value = true

    if (canceled) return
    allResults.value = boostedResults

    // Save to global cache (totalResultsCount is set by watcher 2 after excerpt filtering)
    globalAllResults.value = boostedResults
    globalLastQuery.value = filterTextValue
    globalLastFuzzy.value = isFuzzySearch.value
    globalLastUrlSearch.value = isUrlSearch.value
    globalLastDetailed.value = showDetailedList.value
    globalUsedSubstringExpansion.value = usedSubstringExpansion.value
  },
  { debounce: SEARCH_DEBOUNCE_MS, immediate: true }
)

// 2. Synchronous Watcher: Handles slicing, excerpt fetching, DOM rendering, and highlight marking instantly
watch(
  () => [allResults.value, resultLimit.value, showDetailedList.value] as const,
  async ([allRes, limit, showDetailedListValue], old, onCleanup) => {
    let canceled = false
    onCleanup(() => {
      canceled = true
    })

    const sliced = allRes.slice(0, limit)
    if (sliced.length === 0) {
      results.value = []
      resultMarks.value = new Map()
      currentMarkIndex.value = new Map()
      if (!(old === undefined && filterText.value)) {
        isSearching.value = false
      }
      totalResultsCount.value = 0
      mayHaveMore.value = false
      return
    }

    const terms = new Set<string>()

    const mapResult = (r: SearchResult & Result, text: string) => {
      if (isFuzzySearch.value) {
        for (const term of Object.keys(r.match || {})) {
          terms.add(term)
        }
      }
      return { ...r, text }
    }

    let finalResults: (SearchResult & Result)[]
    let totalCount: number
    let mayHaveMoreValue = false

    const isExactSearch = !isFuzzySearch.value && !usedSubstringExpansion.value

    if (showDetailedListValue && isExactSearch) {
      // For exact search, we fetch excerpts for a dynamic candidate pool
      // to ensure contiguous phrase matches are not lost due to ranking.
      const candidateLimit = Math.max(MIN_CANDIDATE_POOL, limit * 2)
      const candidates = allRes.slice(0, candidateLimit)

      const candidatesToFetch = candidates.filter((r) => {
        const [id] = r.id.split('#')
        return !cache.has(id)
      })
      const mods = await Promise.all(
        candidatesToFetch.map((r) => fetchExcerpt(r.id))
      )
      if (canceled) return

      await processExcerpts(mods, vitePressData, () => canceled)
      if (canceled) return

      const mapped = candidates.map((r) => {
        const [id, anchor] = r.id.split('#')
        const map = cache.get(id)
        const text = map?.get(anchor) ?? ''
        return mapResult(r, text)
      })

      const filtered = filterResults(mapped, filterText.value)
      finalResults = filtered.slice(0, limit)
      totalCount = filtered.length
      // Untested remainder beyond the candidate pool may contain more matches;
      // expanding resultLimit re-runs this branch with a larger candidateLimit.
      mayHaveMoreValue = allRes.length > candidateLimit
    } else {
      // Fuzzy search or substring expansion: slice to limit directly
      const slicedToFetch = showDetailedListValue
        ? sliced.filter((r) => {
            const [id] = r.id.split('#')
            return !cache.has(id)
          })
        : []
      const mods = await Promise.all(
        slicedToFetch.map((r) => fetchExcerpt(r.id))
      )
      if (canceled) return

      await processExcerpts(mods, vitePressData, () => canceled)
      if (canceled) return

      const mapped = sliced.map((r) => {
        const [id, anchor] = r.id.split('#')
        const map = showDetailedListValue ? cache.get(id) : undefined
        const text = map?.get(anchor) ?? ''
        return mapResult(r, text)
      })

      finalResults = mapped
      totalCount = mapped.length + Math.max(0, allRes.length - limit)
    }

    if (!isFuzzySearch.value) {
      terms.add(filterText.value)
    }

    results.value = finalResults
    totalResultsCount.value = totalCount
    mayHaveMore.value = mayHaveMoreValue

    await nextTick()
    if (canceled) return

    await new Promise<void>((resolve) => {
      if (!resultsEl.value) {
        resolve()
        return
      }
      const targets = resultsEl.value.querySelectorAll(
        '.result-item:not(.result-list-leave-active) .titles, .result-item:not(.result-list-leave-active) .excerpt'
      )
      if (targets.length === 0) {
        resolve()
        return
      }
      const m = new Mark(Array.from(targets))
      m.unmark({
        done: () => {
          m.markRegExp(formMarkRegex(terms, filterText.value), {
            exclude: ['.title-icon'],
            acrossElements: false,
            done: () => resolve()
          })
        }
      })
    })
    if (canceled) return

    if (isFuzzySearch.value) {
      mergeNearbyMarks()
    }

    // URL matches match on a link's href, which mark.js can't highlight because
    // the query text isn't in the visible link text. Highlight the specific
    // link(s) in the excerpt whose href matched the query.
    if (finalResults.some((r) => r.urlMatched)) {
      const urlQuery = buildUrlQuery(filterText.value)
      for (const r of finalResults) {
        if (!r.urlMatched || !urlQuery) continue
        const item = resultsEl.value?.querySelector(
          `[data-id="${CSS.escape(r.id)}"]`
        )
        if (!item) continue
        const anchors =
          item.querySelectorAll<HTMLAnchorElement>('.excerpt a[href]')
        for (const anchor of anchors) {
          const href = anchor.getAttribute('href') ?? ''
          if (!urlMatchesNormalizedUrl(normalizeUrlSearchValue(href), urlQuery))
            continue
          if (anchor.querySelector('mark[data-markjs="true"]')) continue
          const mark = document.createElement('mark')
          mark.setAttribute('data-markjs', 'true')
          mark.append(...anchor.childNodes)
          anchor.appendChild(mark)
        }
      }
    }

    const excerpts = Array.from(
      resultsEl.value?.querySelectorAll(
        '.result-item:not(.result-list-leave-active) .result .excerpt'
      ) ?? []
    ) as HTMLElement[]
    const scrollTargets: { excerpt: HTMLElement; scrollTop: number }[] = []
    for (const excerpt of excerpts) {
      const markElement = excerpt.querySelector(
        'mark[data-markjs="true"]'
      ) as HTMLElement | null
      if (markElement) {
        const markRelTop = getRelativeOffsetTop(markElement, excerpt)
        const scrollTop =
          markRelTop -
          (excerpt.clientHeight || 80) / 2 +
          markElement.offsetHeight / 2
        scrollTargets.push({ excerpt, scrollTop })
      }
    }
    for (const { excerpt, scrollTop } of scrollTargets) {
      excerpt.scrollTop = scrollTop
    }

    /**
     * Custom feature: Initialize match navigation state.
     */
    const newResultMarks = new Map<number, HTMLElement[][]>()
    const newCurrentMarkIndex = new Map<number, number>()

    results.value.forEach((r, index) => {
      const item = resultsEl.value?.querySelector(
        `[data-id="${CSS.escape(r.id)}"]`
      )
      const marks = Array.from(
        item?.querySelectorAll('.excerpt mark[data-markjs="true"]') ?? []
      ) as HTMLElement[]
      if (marks.length > 0) {
        newResultMarks.set(index, groupMarks(marks))
        newCurrentMarkIndex.set(index, 0)
      }
    })
    resultMarks.value = newResultMarks
    currentMarkIndex.value = newCurrentMarkIndex

    if (resultsEl.value && shouldResetScroll.value) {
      resultsEl.value.scrollTop = 0
      shouldResetScroll.value = false
    }

    isSearching.value = false

    // Save to global cache
    globalResults.value = finalResults
    globalTotalResultsCount.value = totalCount
    globalResultMarks.value = resultMarks.value
    globalCurrentMarkIndex.value = currentMarkIndex.value
    globalResultLimit.value = limit
    globalMayHaveMore.value = mayHaveMoreValue
  },
  { immediate: true }
)

/**
 * Merges adjacent highlight marks that are visually close together.
 * This reduces the number of navigation stops in fuzzy mode where
 * each individual word match would otherwise be a separate highlight.
 *
 * Merging criteria (tuned via constants at top of file):
 * - Marks must be on the same line (within MARK_SAME_LINE_THRESHOLD_PX)
 * - Marks must be close horizontally (< MARK_MERGE_DISTANCE_PX)
 */
function mergeNearbyMarks() {
  const excerpts = Array.from(
    resultsEl.value?.querySelectorAll(
      '.result-item:not(.result-list-leave-active) .result .excerpt'
    ) ?? []
  )

  for (const excerpt of excerpts) {
    const marks = Array.from(
      excerpt.querySelectorAll('mark[data-markjs="true"]')
    ) as HTMLElement[]
    if (marks.length <= 1) continue

    // Snapshot all rects in one pass before any mutations to avoid layout thrash
    type Rect = { left: number; right: number; top: number }
    const rects: Rect[] = marks.map((m) => {
      const r = m.getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top }
    })

    let i = 0
    while (i < marks.length - 1) {
      if (marks[i].parentNode !== marks[i + 1].parentNode) {
        i++
        continue
      }

      const distance = rects[i + 1].left - rects[i].right
      const onSameLine =
        Math.abs(rects[i].top - rects[i + 1].top) < MARK_SAME_LINE_THRESHOLD_PX

      if (distance >= 0 && distance < MARK_MERGE_DISTANCE_PX && onSameLine) {
        let node = marks[i].nextSibling
        while (node && node !== marks[i + 1]) {
          const next = node.nextSibling
          marks[i].appendChild(node as Node)
          node = next
        }
        // Also move all children of marks[i + 1] into marks[i]
        while (marks[i + 1].firstChild) {
          marks[i].appendChild(marks[i + 1].firstChild as Node)
        }
        marks[i + 1].remove()
        marks.splice(i + 1, 1)
        // Update rect to the merged right edge so chained merges use correct distance
        rects[i].right = rects[i + 1].right
        rects.splice(i + 1, 1)
      } else {
        i++
      }
    }
  }
}

/**
 * Custom feature: Navigate to the next highlighted match in the current result.
 * Cycles back to the first match when reaching the end.
 * Smoothly scrolls the excerpt to center the highlighted match.
 */
function nextMatch(index: number) {
  if (selectedIndex.value !== index) {
    selectedIndex.value = index
  }
  const marks = resultMarks.value.get(index)
  let curr = currentMarkIndex.value.get(index) ?? 0
  if (!marks) return

  // Remove 'current' class from previous group of marks
  marks[curr]?.forEach((m) => m.classList.remove('current'))

  curr = (curr + 1) % marks.length
  currentMarkIndex.value.set(index, curr)
  triggerRef(currentMarkIndex)

  // Add 'current' class to new group of marks
  const newGroup = marks[curr]
  if (newGroup && newGroup.length > 0) {
    newGroup.forEach((m) => m.classList.add('current'))
    const newMark = newGroup[0]
    const excerpt = newMark.closest<HTMLElement>('.excerpt')
    if (excerpt) {
      const markRelTop = getRelativeOffsetTop(newMark, excerpt)
      excerpt.scrollTo({
        top: markRelTop - excerpt.clientHeight / 2 + newMark.offsetHeight / 2,
        behavior: 'smooth'
      })
    }
  }
}

/**
 * Custom feature: Navigate to the previous highlighted match in the current result.
 * Cycles to the last match when going before the first.
 * Smoothly scrolls the excerpt to center the highlighted match.
 */
function prevMatch(index: number) {
  if (selectedIndex.value !== index) {
    selectedIndex.value = index
  }
  const marks = resultMarks.value.get(index)
  let curr = currentMarkIndex.value.get(index) ?? 0
  if (!marks) return

  // Remove 'current' class from previous group of marks
  marks[curr]?.forEach((m) => m.classList.remove('current'))

  curr = (curr - 1 + marks.length) % marks.length
  currentMarkIndex.value.set(index, curr)
  triggerRef(currentMarkIndex)

  // Add 'current' class to new group of marks
  const newGroup = marks[curr]
  if (newGroup && newGroup.length > 0) {
    newGroup.forEach((m) => m.classList.add('current'))
    const newMark = newGroup[0]
    const excerpt = newMark.closest<HTMLElement>('.excerpt')
    if (excerpt) {
      const markRelTop = getRelativeOffsetTop(newMark, excerpt)
      excerpt.scrollTo({
        top: markRelTop - excerpt.clientHeight / 2 + newMark.offsetHeight / 2,
        behavior: 'smooth'
      })
    }
  }
}

async function fetchExcerpt(id: string) {
  const hashIndex = id.indexOf('#')
  const cleanId = hashIndex === -1 ? id : id.slice(0, hashIndex)
  const file = pathToFile(cleanId)
  try {
    if (!file) throw new Error(`Cannot find file for id: ${id}`)
    return { id, mod: await import(/*@vite-ignore*/ file) }
  } catch (e) {
    console.error(e)
    return { id, mod: {} }
  }
}

interface ComponentModule {
  default?: unknown
  render?: unknown
  setup?: unknown
}

interface VitePressData {
  frontmatter: Ref<Record<string, unknown>>
  page: Ref<{ params?: unknown }>
}

const VDropdownStub = {
  name: 'VDropdown',
  render(this: any) {
    return h('span', { class: 'v-popper' }, this.$slots.default?.())
  }
}

async function processExcerpts(
  mods: { id: string; mod: ComponentModule }[],
  vitePressData: VitePressData,
  isCanceled: () => boolean
) {
  for (const { id, mod } of mods) {
    if (isCanceled()) return
    const hashIndex = id.indexOf('#')
    const mapId = hashIndex === -1 ? id : id.slice(0, hashIndex)
    let map = cache.get(mapId)
    if (map) continue
    map = new Map()
    cache.set(mapId, map)
    const comp = (mod.default ?? mod) as { render?: unknown; setup?: unknown }
    if (comp && typeof comp === 'object' && (comp.render || comp.setup)) {
      try {
        const app = createApp(comp as Component)
        app.component('VDropdown', VDropdownStub)
        app.component('Tooltip', Tooltip)
        app.config.warnHandler = () => {}
        app.provide(dataSymbol, vitePressData)
        Object.defineProperties(app.config.globalProperties, {
          $frontmatter: {
            get() {
              return vitePressData.frontmatter.value
            }
          },
          $params: {
            get() {
              return vitePressData.page.value.params
            }
          }
        })
        const div = document.createElement('div')
        app.mount(div)
        try {
          const headings = div.querySelectorAll('h1, h2, h3, h4, h5, h6')
          headings.forEach((heading) => {
            const href = heading.querySelector('a')?.getAttribute('href')
            const anchor = href?.startsWith('#') && href.slice(1)
            if (!anchor) return
            let html = ''
            let next: Element | null = heading.nextElementSibling
            while (next && !/^h[1-6]$/i.test(next.tagName)) {
              // Skip note/infobox custom blocks (:::tip/:::info/:::warning/
              // :::danger) so the excerpt highlights the real curated link
              // instead of a note that merely mentions the query. Mirrors the
              // index-time strip in constants.ts so preview and ranking agree.
              const cls = next.classList
              const isNoteBlock =
                cls.contains('custom-block') &&
                (cls.contains('tip') ||
                  cls.contains('info') ||
                  cls.contains('warning') ||
                  cls.contains('danger'))
              if (!isNoteBlock) html += next.outerHTML
              next = next.nextElementSibling
            }
            map!.set(anchor, html)
          })
        } finally {
          app.unmount()
        }
      } catch (e) {
        console.error('Error processing excerpt for ' + id, e)
      }
    }
  }
}

function filterResults(
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

/* Search input focus */

const searchInput = ref<HTMLInputElement>()
const disableReset = computed(() => {
  return !filterText.value
})
function focusSearchInput(select = true) {
  searchInput.value?.focus()
  if (select) {
    searchInput.value?.select()
  }
}

function applySuggestion(s: string) {
  filterText.value = s
  focusSearchInput(false)
}

function onSearchBarClick(event: PointerEvent) {
  if (event.pointerType === 'mouse') {
    focusSearchInput(false)
  }
}

/* Search keyboard selection */

const selectedIndex = ref(-1)
const disableMouseOver = ref(true)
// Flag to track whether the selection was driven by keyboard navigation.
// Used to limit excerpt smooth-scrolling strictly to keyboard events to prevent scroll/hover performance lag.
const isKeyboardAction = ref(false)

watch(results, (newR, oldR) => {
  // Show-more expansion: first result is unchanged and list grew — keep current position
  if (
    oldR.length > 0 &&
    newR.length > oldR.length &&
    newR[0]?.id === oldR[0]?.id
  )
    return

  // Default to -1 (no selection) so first result is not pre-selected while typing
  let newIdx = -1
  if (
    oldR.length > 0 &&
    selectedIndex.value >= 0 &&
    selectedIndex.value < oldR.length
  ) {
    const prevSelectedId = oldR[selectedIndex.value]?.id
    const foundIdx = newR.findIndex((r) => r.id === prevSelectedId)
    if (foundIdx !== -1) {
      newIdx = foundIdx
    }
  }
  selectedIndex.value = newIdx
  scrollToSelectedResult()
})

function scrollToSelectedResult() {
  nextTick(() => {
    // Avoid querying transitioning/leaving items to prevent scroll-into-view selector collisions.
    const selectedEl = resultsEl.value?.querySelector(
      '.result-item:not(.result-list-leave-active) .result.selected'
    )
    selectedEl?.scrollIntoView({ block: 'nearest' })
  })
}

watch(selectedIndex, (newIdx, oldIdx) => {
  if (oldIdx !== undefined && oldIdx >= 0) {
    const marks = resultMarks.value.get(oldIdx)
    const curr = currentMarkIndex.value.get(oldIdx) ?? 0
    marks?.[curr]?.forEach((m) => m.classList.remove('current'))
  }

  if (newIdx !== undefined && newIdx >= 0) {
    // Add current class and scroll active match into view
    const isKb = isKeyboardAction.value
    isKeyboardAction.value = false

    nextTick(() => {
      const updatedMarks = resultMarks.value.get(newIdx)
      const updatedCurr = currentMarkIndex.value.get(newIdx) ?? 0
      updatedMarks?.[updatedCurr]?.forEach((m) => m.classList.add('current'))

      const activeMark = updatedMarks?.[updatedCurr]?.[0]
      const excerpt = activeMark?.closest<HTMLElement>('.excerpt')
      // Only smooth-scroll excerpt to center match if selection was keyboard-driven (prevents layout thrashing on hover)
      if (isKb && excerpt && activeMark) {
        const markRelTop = getRelativeOffsetTop(activeMark, excerpt)
        excerpt.scrollTo({
          top:
            markRelTop - excerpt.clientHeight / 2 + activeMark.offsetHeight / 2,
          behavior: 'smooth'
        })
      }
    })
  }
})

onKeyStroke('ArrowUp', (event) => {
  event.preventDefault()
  isKeyboardAction.value = true

  if (
    resultsEl.value &&
    document.activeElement === resultsEl.value &&
    selectedIndex.value === 0
  ) {
    selectedIndex.value = -1
    searchInput.value?.focus()
    return
  }

  if (resultsEl.value && document.activeElement === searchInput.value) {
    resultsEl.value.focus()
    // Fall through to wrap to bottom
  }

  selectedIndex.value--
  if (selectedIndex.value < 0) {
    selectedIndex.value = results.value.length - 1
  }
  disableMouseOver.value = true
  scrollToSelectedResult()
})

onKeyStroke('ArrowDown', (event) => {
  event.preventDefault()
  isKeyboardAction.value = true

  if (resultsEl.value && document.activeElement === searchInput.value) {
    resultsEl.value.focus()
    // Fall through to select first item (from -1 to 0)
  }

  selectedIndex.value++
  if (selectedIndex.value >= results.value.length) {
    selectedIndex.value = 0
  }
  disableMouseOver.value = true
  scrollToSelectedResult()
})

const router = useRouter()

onKeyStroke('Enter', (e) => {
  if (e.isComposing) return

  if (e.target instanceof HTMLButtonElement && e.target.type !== 'submit')
    return

  let selectedPackage = results.value[selectedIndex.value]
  // Fallback to first result if Enter is pressed in search input with no active selection
  if (
    !selectedPackage &&
    selectedIndex.value === -1 &&
    results.value.length > 0
  ) {
    selectedPackage = results.value[0]
  }

  if (e.target instanceof HTMLInputElement && !selectedPackage) {
    e.preventDefault()
    return
  }

  if (selectedPackage) {
    addRecentSearch(filterText.value)
    const idx = results.value.indexOf(selectedPackage)
    const matchCtx = idx >= 0 ? getMatchContext(idx) : null
    navigateToResult(selectedPackage.id, matchCtx)
  }
})

onKeyStroke('Escape', () => {
  close()
})

/**
 * Custom feature: Keyboard navigation for cycling through highlights.
 * Left/Right arrow keys navigate prev/next match within the selected result.
 * Only active when detailed view is enabled and matches exist.
 */
onKeyStroke('ArrowLeft', (event) => {
  if (event.repeat) return
  const targetIndex = selectedIndex.value === -1 ? 0 : selectedIndex.value

  if (document.activeElement === searchInput.value) {
    if (event.altKey || event.ctrlKey) {
      // modifier always forces nav
    } else {
      // mirror ArrowRight: hijack only when caret is at start of input
      const { selectionStart, selectionEnd } = searchInput.value!
      if (selectionStart !== 0 || selectionEnd !== 0) return
      isKeyboardAction.value = true
      if (selectedIndex.value === -1) selectedIndex.value = 0
      resultsEl.value?.focus()
      event.preventDefault()
      return
    }
  }

  // Navigate to previous match - only when viewing detailed excerpts with highlights
  if (
    showDetailedList.value &&
    (resultMarks.value.get(targetIndex)?.length ?? 0) > 0
  ) {
    event.preventDefault()
    prevMatch(targetIndex)
  }
})

onKeyStroke('ArrowRight', (event) => {
  if (event.repeat) return
  const targetIndex = selectedIndex.value === -1 ? 0 : selectedIndex.value

  if (document.activeElement === searchInput.value) {
    if (event.shiftKey) return
    if (event.altKey || event.ctrlKey) {
      // Allow modifier to force nav
    } else {
      // Shortcut: If at end of input, go down to results list without cycling matches
      const { selectionStart, selectionEnd, value } = searchInput.value!
      if (selectionStart !== value.length || selectionEnd !== value.length)
        return

      // Use the target index (0) if we were at -1
      isKeyboardAction.value = true
      if (selectedIndex.value === -1) selectedIndex.value = 0
      resultsEl.value?.focus()
      event.preventDefault()
      return
    }
  }

  // Navigate to next match - only when viewing detailed excerpts with highlights
  if (
    showDetailedList.value &&
    (resultMarks.value.get(targetIndex)?.length ?? 0) > 0
  ) {
    event.preventDefault()
    nextMatch(targetIndex)
  }
})

// Translations
const defaultTranslations: { modal: ModalTranslations } = {
  modal: {
    displayDetails: 'Display detailed list',
    resetButtonTitle: 'Reset search',
    backButtonTitle: 'Close search',
    noResultsText: 'No results for',
    footer: {
      selectText: 'to select',
      selectKeyAriaLabel: 'enter',
      navigateText: 'to navigate',
      navigateUpKeyAriaLabel: 'up arrow',
      navigateDownKeyAriaLabel: 'down arrow',
      closeText: 'to close',
      closeKeyAriaLabel: 'escape'
    }
  }
}

const translate = createSearchTranslate(defaultTranslations)

const customTitles = {
  prevMatch: 'Previous match',
  nextMatch: 'Next match',
  fuzzyOn: 'Switch to Exact Search',
  fuzzyOff: 'Switch to Fuzzy Search',
  urlOn: 'Only search names and text',
  urlOff: 'Search link URLs too',
  searching: 'Searching...',
  cycleMatches: 'to cycle matches'
}

// Back

useEventListener('popstate', () => {
  close()
})

/** Lock body */
const isLocked = useScrollLock(inBrowser ? document.body : null)

onMounted(() => {
  focusSearchInput()
  window.history.pushState ? window.history.pushState(null, '', null) : null
  nextTick(() => {
    isLocked.value = true
    nextTick().then(() => activate())
  })
})

onBeforeUnmount(() => {
  isLocked.value = false
  resultMarks.value = new Map()
  currentMarkIndex.value = new Map()
  globalResultMarks.value = new Map()
  globalCurrentMarkIndex.value = new Map()
})

function addRecentSearch(query: string) {
  const q = query.trim()
  if (!q) return
  recentSearches.value = [
    q,
    ...recentSearches.value.filter((s) => s !== q)
  ].slice(0, MAX_RECENT_SEARCHES)
}

function removeRecentSearch(query: string) {
  recentSearches.value = recentSearches.value.filter((s) => s !== query)
  nextTick().then(() => focusSearchInput(false))
}

function clearAllRecentSearches() {
  recentSearches.value = []
  nextTick().then(() => focusSearchInput(false))
}

/**
 * Extract the text content of the element containing the currently active
 * match highlight in the search excerpt. This identifies the SPECIFIC item
 * the user was looking at (e.g., "SpotifyPublic" vs "EeveeSpotifyRevived")
 * so we scroll to the right one on the page.
 */
function getMatchContext(resultIndex: number): string | null {
  const marks = resultMarks.value.get(resultIndex)
  const curr = currentMarkIndex.value.get(resultIndex) ?? 0
  if (!marks || !marks[curr] || marks[curr].length === 0) return null

  const mark = marks[curr][0]
  // Find the closest content container (same selectors used on the actual page)
  const container = mark.closest('li, p, td, dd, blockquote')
  if (!container) return null

  return container.textContent?.trim() || null
}

function handleResultClick(e: MouseEvent, id: string) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
    return
  }
  e.preventDefault()
  addRecentSearch(filterText.value)

  // Find which result index was clicked to get the match context
  const index = results.value.findIndex((r) => r.id === id)
  const matchContext = index >= 0 ? getMatchContext(index) : null
  navigateToResult(id, matchContext)
}

function navigateToResult(id: string, matchContext: string | null = null) {
  // Dismiss mobile keyboard immediately by blurring the active input.
  // This triggers a viewport resize so we calculate the correct scroll position.
  if (
    typeof document !== 'undefined' &&
    document.activeElement instanceof HTMLElement
  ) {
    document.activeElement.blur()
  }

  const [path, hash] = id.split('#')
  const query = filterText.value
  let decodedHash: string | null = null
  try {
    decodedHash = hash ? decodeURIComponent(hash) : null
  } catch {
    /* malformed URI */
  }

  // Cancel any previous scroll-to-match operation
  cancelPendingScroll()

  if (decodedHash && isSamePageComparison(path)) {
    const targetEl = document.getElementById(decodedHash)
    if (targetEl) {
      close()
      window.history.pushState(null, '', `#${hash}`)
      // Single scroll directly to the matching element. For same-page,
      // use a longer delay on mobile so the virtual keyboard can dismiss
      // and the viewport height can settle before scrolling.
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const delay = isMobile ? 300 : 80
      scheduleScrollToMatch(hash, query, delay, matchContext)
      return
    }
  }

  // Cross-page navigation: store query (with destination path so the router
  // hook can reject it if a different navigation supersedes this one), close
  // modal, start navigation.
  pendingScrollQuery.value = { query, matchContext, path }
  close()
  router.go(id)
}

function resetSearch() {
  filterText.value = ''
  nextTick().then(() => focusSearchInput(false))
}

function toggleDetailedList() {
  showDetailedList.value = !showDetailedList.value
}

function handleInput(e: Event) {
  filterText.value = (e.target as HTMLInputElement).value
}

function toggleFuzzySearch() {
  isFuzzySearch.value = !isFuzzySearch.value
}

function toggleUrlSearch() {
  isUrlSearch.value = !isUrlSearch.value
}

function groupMarks(marks: HTMLElement[]): HTMLElement[][] {
  const groups: HTMLElement[][] = []
  if (marks.length === 0) return groups
  if (typeof document === 'undefined') return [marks]

  let currentGroup = [marks[0]]
  for (let i = 1; i < marks.length; i++) {
    const prev = marks[i - 1]
    const curr = marks[i]
    if (prev.parentNode !== curr.parentNode) {
      groups.push(currentGroup)
      currentGroup = [curr]
      continue
    }
    try {
      const range = document.createRange()
      range.setStartAfter(prev)
      range.setEndBefore(curr)
      const textBetween = range.toString()
      if (/^[\s\W]{0,20}$/.test(textBetween)) {
        currentGroup.push(curr)
      } else {
        groups.push(currentGroup)
        currentGroup = [curr]
      }
    } catch {
      groups.push(currentGroup)
      currentGroup = [curr]
    }
  }
  groups.push(currentGroup)
  return groups
}

function formMarkRegex(terms: Set<string>, rawQuery: string) {
  const allTerms = new Set<string>()
  for (const term of terms) {
    allTerms.add(term)
  }
  if (isFuzzySearch.value) {
    const words = rawQuery
      .trim()
      .split(/[\s\W]+/)
      .filter(Boolean)
    for (const word of words) {
      allTerms.add(word)
    }
  } else {
    allTerms.add(rawQuery.trim())
  }
  return new RegExp(
    [...allTerms]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map((term) => `(${escapeRegExp(term)})`)
      .join('|'),
    'gi'
  )
}

let lastMouseX = 0
let lastMouseY = 0

function onMouseMove(e: MouseEvent) {
  if (e.clientX === lastMouseX && e.clientY === lastMouseY) {
    return
  }
  lastMouseX = e.clientX
  lastMouseY = e.clientY

  if (disableMouseOver.value) {
    disableMouseOver.value = false
    return
  }

  const el = (e.target as HTMLElement)?.closest<HTMLElement>('.result-item')
  const index = el?.dataset?.index ? Number.parseInt(el.dataset.index) : -1
  if (index >= 0 && index !== selectedIndex.value) {
    selectedIndex.value = index
  }
}

function isSamePageComparison(destPath: string) {
  if (!destPath) return true
  const base = vitePressData.site?.value?.base || '/'
  const clean = (p: string) => {
    let cleaned = p
      .replace(/^\.?\//, '/')
      .replace(/\.html$/, '')
      .replace(/\/index$/, '')
      .replace(/\/$/, '')
      .toLowerCase()
    if (
      base !== '/' &&
      cleaned.startsWith(base.toLowerCase().replace(/\/$/, ''))
    ) {
      cleaned = cleaned.slice(base.toLowerCase().replace(/\/$/, '').length)
    }
    return cleaned || '/'
  }
  const current = clean(window.location.pathname) || '/'
  const dest = clean(destPath) || '/'
  return current === dest
}
</script>

<template>
  <Teleport to="body">
    <Transition
      name="vp-local-search"
      appear
      :duration="150"
      @after-leave="$emit('close')"
    >
      <div
        v-if="show"
        ref="el"
        role="button"
        :aria-owns="results?.length ? 'localsearch-list' : undefined"
        aria-expanded="true"
        aria-haspopup="listbox"
        aria-labelledby="localsearch-label"
        class="VPLocalSearchBox"
      >
        <div class="backdrop" @click="close" />

        <div class="shell">
          <form
            class="search-bar"
            @pointerup="onSearchBarClick($event)"
            @submit.prevent
          >
            <label
              id="localsearch-label"
              :title="buttonText"
              for="localsearch-input"
            >
              <span
                aria-hidden="true"
                class="vpi-search search-icon local-search-icon"
              />
            </label>
            <div class="search-actions before">
              <button
                class="back-button"
                :title="translate('modal.backButtonTitle')"
                @click="close"
              >
                <span class="vpi-arrow-left local-search-icon" />
              </button>
            </div>
            <input
              id="localsearch-input"
              ref="searchInput"
              :value="filterText"
              :aria-activedescendant="
                selectedIndex > -1
                  ? 'localsearch-item-' + selectedIndex
                  : undefined
              "
              aria-autocomplete="both"
              :aria-controls="results?.length ? 'localsearch-list' : undefined"
              aria-labelledby="localsearch-label"
              autocapitalize="off"
              autocomplete="off"
              autocorrect="off"
              class="search-input"
              enterkeyhint="go"
              maxlength="64"
              :placeholder="buttonText"
              spellcheck="false"
              type="search"
              @input="handleInput"
            />
            <div class="search-actions">
              <span
                v-if="isSearching"
                class="vp-search-spinner"
                style="align-self: center; margin: 0 4px"
                :title="customTitles.searching"
              />

              <button
                v-if="!disableDetailedView"
                class="toggle-layout-button"
                type="button"
                :class="{ 'detailed-list': showDetailedList }"
                :aria-pressed="showDetailedList"
                :title="translate('modal.displayDetails')"
                @click="toggleDetailedList"
              >
                <span class="vpi-layout-list local-search-icon" />
              </button>

              <button
                class="toggle-fuzzy-button"
                type="button"
                :class="{ 'fuzzy-active': isFuzzySearch }"
                :aria-pressed="isFuzzySearch"
                :title="
                  isFuzzySearch ? customTitles.fuzzyOn : customTitles.fuzzyOff
                "
                @click="toggleFuzzySearch"
              >
                <span v-if="isFuzzySearch" class="fuzzy-icon">~</span>
                <span v-else class="exact-icon">=</span>
                <span class="visually-hidden">
                  {{
                    isFuzzySearch
                      ? 'Fuzzy Search Active'
                      : 'Exact Search Active'
                  }}
                </span>
              </button>

              <button
                class="toggle-url-button"
                type="button"
                :class="{ 'url-active': isUrlSearch }"
                :aria-pressed="isUrlSearch"
                :title="isUrlSearch ? customTitles.urlOn : customTitles.urlOff"
                @click="toggleUrlSearch"
              >
                <span class="url-icon i-lucide:link" />
                <span class="visually-hidden">
                  {{ isUrlSearch ? 'URL Search Active' : 'URL Search Off' }}
                </span>
              </button>

              <button
                class="clear-button"
                type="reset"
                :disabled="disableReset"
                :title="translate('modal.resetButtonTitle')"
                @click="resetSearch"
              >
                <span class="vpi-delete local-search-icon" />
              </button>
            </div>
          </form>

          <ul
            :id="results?.length ? 'localsearch-list' : undefined"
            ref="resultsEl"
            :role="results?.length ? 'listbox' : undefined"
            :aria-labelledby="results?.length ? 'localsearch-label' : undefined"
            class="results"
            tabindex="-1"
            @mousemove="onMouseMove"
          >
            <TransitionGroup name="result-list">
              <li
                v-if="filterText && results.length"
                key="results-info"
                class="results-info"
              >
                Showing {{ results.length }} of {{ totalResultsCount
                }}{{ mayHaveMore ? '+' : '' }} matches
              </li>
              <li
                v-for="(p, index) in results"
                :id="'localsearch-item-' + index"
                :key="p.id"
                :data-id="p.id"
                :aria-selected="selectedIndex === index ? 'true' : 'false'"
                role="option"
                class="result-item"
                :data-index="index"
              >
                <div
                  class="result"
                  :class="{
                    selected: selectedIndex === index
                  }"
                  @mouseenter="!disableMouseOver && (selectedIndex = index)"
                  @focusin="selectedIndex = index"
                  @click="handleResultClick($event, p.id)"
                >
                  <div>
                    <div class="titles">
                      <span class="title-icon">#</span>
                      <span
                        v-for="(t, titleIndex) in p.titles"
                        :key="titleIndex"
                        class="title"
                      >
                        <span class="text" v-html="sanitizeSearchHtml(t)" />
                        <span class="vpi-chevron-right local-search-icon" />
                      </span>
                      <span class="title main">
                        <a
                          :href="p.id"
                          class="result-link"
                          :aria-label="[...p.titles, p.title].join(' > ')"
                        >
                          <span
                            class="text"
                            v-html="sanitizeSearchHtml(p.title)"
                          />
                        </a>
                      </span>
                    </div>
                    <div v-if="showDetailedList" class="excerpt-wrapper">
                      <div v-if="p.text" class="excerpt" inert>
                        <div class="vp-doc" v-html="sanitizeRichHtml(p.text)" />
                      </div>

                      <div class="excerpt-gradient-bottom" />
                      <div class="excerpt-gradient-top" />
                      <Transition name="match-actions-fade">
                        <div
                          v-if="(resultMarks.get(index)?.length ?? 0) > 1"
                          class="excerpt-actions"
                          @click.stop.prevent
                        >
                          <button
                            type="button"
                            class="match-nav-button"
                            :title="customTitles.prevMatch"
                            @click.stop.prevent="prevMatch(index)"
                          >
                            <span class="vpi-chevron-left navigate-icon" />
                          </button>
                          <span class="match-count">
                            {{ (currentMarkIndex.get(index) ?? 0) + 1 }}/{{
                              resultMarks.get(index)?.length
                            }}
                          </span>
                          <button
                            type="button"
                            class="match-nav-button"
                            :title="customTitles.nextMatch"
                            @click.stop.prevent="nextMatch(index)"
                          >
                            <span class="vpi-chevron-right navigate-icon" />
                          </button>
                        </div>
                      </Transition>
                    </div>
                  </div>
                </div>
              </li>
              <li
                v-if="
                  filterText &&
                  !results.length &&
                  !isSearching &&
                  enableNoResults
                "
                key="no-results"
                class="no-results"
              >
                <div>
                  {{ translate('modal.noResultsText') }} "{{ filterText }}"
                </div>
                <div v-if="!isFuzzySearch" class="no-results-actions">
                  <button class="try-fuzzy-btn" @click="isFuzzySearch = true">
                    Try fuzzy search?
                  </button>
                  <template v-if="autoSuggestions.length">
                    <span class="did-you-mean">Did you mean:</span>
                    <button
                      v-for="s in autoSuggestions"
                      :key="s"
                      class="suggestion-btn"
                      @click="applySuggestion(s)"
                    >
                      {{ s }}
                    </button>
                  </template>
                </div>
              </li>
              <li
                v-if="!filterText && recentSearches.length"
                key="recent-searches"
                class="recent-searches"
              >
                <div class="recent-header">
                  <span class="recent-label">Recent</span>
                  <button class="clear-all-btn" @click="clearAllRecentSearches">
                    Clear all
                  </button>
                </div>
                <div class="recent-items">
                  <div
                    v-for="s in recentSearches"
                    :key="s"
                    class="recent-item-wrapper"
                  >
                    <button class="recent-item" @click="applySuggestion(s)">
                      {{ s }}
                    </button>
                    <button
                      class="recent-delete-btn"
                      title="Remove search"
                      @click.stop.prevent="removeRecentSearch(s)"
                    >
                      <span class="vpi-delete delete-icon-mini" />
                    </button>
                  </div>
                </div>
              </li>
              <li
                v-if="
                  !isSearching &&
                  (results.length < totalResultsCount || mayHaveMore)
                "
                key="show-more"
                class="show-more-item"
              >
                <button
                  class="show-more-btn"
                  @click="resultLimit += RESULTS_PAGE_SIZE"
                >
                  Show more results
                  <template
                    v-if="!mayHaveMore && totalResultsCount > results.length"
                  >
                    ({{ totalResultsCount - results.length }} remaining)
                  </template>
                </button>
              </li>
            </TransitionGroup>
          </ul>

          <div class="search-keyboard-shortcuts">
            <span>
              <kbd
                :aria-label="translate('modal.footer.navigateUpKeyAriaLabel')"
              >
                <span class="vpi-arrow-up navigate-icon" />
              </kbd>
              <kbd
                :aria-label="translate('modal.footer.navigateDownKeyAriaLabel')"
              >
                <span class="vpi-arrow-down navigate-icon" />
              </kbd>
              {{ translate('modal.footer.navigateText') }}
            </span>
            <span>
              <kbd :aria-label="translate('modal.footer.selectKeyAriaLabel')">
                <span class="vpi-corner-down-left navigate-icon" />
              </kbd>
              {{ translate('modal.footer.selectText') }}
            </span>
            <span v-if="showDetailedList">
              <kbd>
                <span class="vpi-arrow-left navigate-icon" />
              </kbd>
              <kbd>
                <span class="vpi-arrow-right navigate-icon" />
              </kbd>
              {{ customTitles.cycleMatches }}
            </span>
            <span>
              <kbd :aria-label="translate('modal.footer.closeKeyAriaLabel')">
                esc
              </kbd>
              {{ translate('modal.footer.closeText') }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.VPLocalSearchBox {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
}
.backdrop {
  position: absolute;
  inset: 0;
  background: var(--vp-backdrop-bg-color);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  will-change: opacity;
}

.shell {
  position: relative;
  padding: 12px;
  margin: 64px auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--vp-local-search-bg);
  width: min(100vw - 60px, 900px);
  height: min-content;
  max-height: min(100vh - 128px, 900px);
  border-radius: 6px;
  will-change: transform, opacity;
}

@media (max-width: 767px) {
  .shell {
    margin: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    max-height: none;
    border-radius: 0;
    overflow: hidden;
  }
}

.search-bar {
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  cursor: text;
}

@media (max-width: 767px) {
  .search-bar {
    padding: 0 8px;
  }
}

.search-bar:focus-within {
  border-color: var(--vp-c-brand-1);
}

.local-search-icon {
  display: block;
  font-size: 18px;
}

.navigate-icon {
  display: block;
  font-size: 14px;
}

.search-icon {
  margin: 8px;
}

@media (max-width: 767px) {
  .search-icon {
    display: none;
  }
}

.search-input {
  padding: 6px 12px;
  font-size: inherit;
  width: 100%;
}

.search-input::-webkit-search-cancel-button,
.search-input::-webkit-search-decoration,
.search-input::-webkit-search-results-button,
.search-input::-webkit-search-results-decoration {
  display: none;
}

/* Custom Feature: Match navigation controls overlay */
.result-item {
  position: relative;
}

.excerpt-actions {
  position: absolute;
  bottom: 4px;
  right: 4px;
  z-index: 2000;
  cursor: default;
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 2px 4px;
  box-shadow: var(--vp-shadow-1);
  transition:
    gap 0.2s,
    padding 0.2s;
}

.match-nav-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  color: var(--vp-c-text-2);
  transition:
    color 0.2s,
    background-color 0.2s,
    transform 0.1s ease;
  cursor: pointer;
}

.match-nav-button::before {
  content: '';
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
}

.match-nav-button:active {
  transform: scale(0.92);
}

@media (any-pointer: coarse) {
  .excerpt-actions {
    gap: 12px;
    padding: 4px 8px;
  }
  .match-nav-button {
    width: 32px;
    height: 32px;
  }
  .match-count {
    font-size: 13px;
  }
}

.match-nav-button:hover {
  color: var(--vp-c-text-1);
  background-color: var(--vp-c-bg-soft);
}

.match-count {
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
  user-select: none;
  min-width: 24px;
  text-align: center;
}

@media (max-width: 767px) {
  .search-input {
    padding: 6px 4px;
  }
}

.search-actions {
  display: flex;
  gap: 4px;
}

@media (any-pointer: coarse) {
  .search-actions {
    gap: 8px;
  }
}

@media (min-width: 769px) {
  .search-actions.before {
    display: none;
  }
}

.search-actions button {
  padding: 8px;
}

.search-actions button:not([disabled]):hover,
.toggle-layout-button.detailed-list,
.toggle-fuzzy-button.fuzzy-active,
.toggle-url-button.url-active {
  color: var(--vp-c-brand-1);
}

.search-actions button.clear-button:disabled {
  opacity: 0.37;
}

.search-keyboard-shortcuts {
  font-size: 0.8rem;
  opacity: 75%;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  line-height: 14px;
}

.search-keyboard-shortcuts span {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 767px) {
  .search-keyboard-shortcuts {
    display: none;
  }
}

.search-keyboard-shortcuts kbd {
  background: rgba(128, 128, 128, 0.1);
  border-radius: 4px;
  padding: 3px 6px;
  min-width: 24px;
  display: inline-block;
  text-align: center;
  vertical-align: middle;
  border: 1px solid rgba(128, 128, 128, 0.15);
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.1);
}

.results {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  outline: none;
  gap: 6px;
  padding-block-start: 4px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.result {
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 4px;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;
  line-height: 1rem;
  border: solid 2px var(--vp-local-search-result-border);
  outline: none;
}

.result-link {
  color: inherit;
  text-decoration: none;
}

.result-link::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
}

/* Match navigation controls fade/slide transition */
.match-actions-fade-enter-active,
.match-actions-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.match-actions-fade-enter-from,
.match-actions-fade-leave-to {
  opacity: 0;
  transform: translateY(2px) scale(0.98);
}

.result > div {
  margin: 12px;
  width: 100%;
  overflow: hidden;
}

@media (max-width: 767px) {
  .result > div {
    margin: 8px;
  }
}

.titles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  position: relative;
  z-index: 1001;
  padding: 2px 0;
}

.title {
  display: flex;
  align-items: center;
  gap: 4px;
}

.title-icon + .title .text {
  font-weight: 600;
  border-bottom: 1px solid var(--vp-c-brand-1);
}

.title.main {
  font-weight: 500;
}

.title-icon {
  opacity: 0.5;
  font-weight: 500;
  color: var(--vp-c-brand-1);
}

.title svg {
  opacity: 0.5;
}

.result.selected {
  --vp-local-search-result-bg: var(--vp-local-search-result-selected-bg);
  border-color: var(--vp-local-search-result-selected-border);
}

.excerpt-wrapper {
  position: relative;
}

.excerpt {
  pointer-events: none;
  max-height: 140px;
  overflow: hidden;
  position: relative;
  margin-top: 4px;
  will-change: opacity;
  transform: translateZ(0);
}

@media (hover: hover) {
  .excerpt {
    opacity: 0.8;
  }
}

.result.selected .excerpt {
  opacity: 1;
}

/*
 * Scale the entire excerpt down by setting the root font-size only,
 * then re-assert the page formatting (bold, code, links, lists) with
 * enough contrast to stay readable at preview size and through the
 * opacity used for unselected results.
 */
.excerpt {
  font-size: 14.5px;
  line-height: 1.6;
}

.excerpt :deep(strong),
.excerpt :deep(b) {
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.excerpt :deep(em),
.excerpt :deep(i) {
  font-style: italic;
}

.excerpt :deep(a) {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-style: solid;
  text-decoration-color: transparent;
}

.excerpt :deep(strong a),
.excerpt :deep(a strong),
.excerpt :deep(b a),
.excerpt :deep(a b) {
  font-weight: bold;
}

.excerpt :deep(p) {
  margin: 0.5em 0;
}

.excerpt :deep(ul),
.excerpt :deep(ol) {
  margin: 0.5em 0;
  padding-inline-start: 1.5em;
}

.excerpt :deep(ul) {
  list-style-type: disc;
}

.excerpt :deep(ol) {
  list-style-type: decimal;
}

.excerpt :deep(li) {
  display: list-item;
  margin: 0.5em 0;
}

.excerpt :deep(:not(pre) > code) {
  background-color: var(--vp-c-bg-alt);
  padding: 0.1em 0.35em;
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.9em;
  border: 1px solid var(--vp-c-divider);
}

.excerpt :deep(blockquote) {
  border-left: 3px solid var(--vp-c-divider);
  padding-left: 0.8em;
  margin: 0.5em 0;
  color: var(--vp-c-text-2);
}

/* Highlight styles - default state */
.excerpt :deep(mark) {
  background-color: var(--vp-local-search-highlight-bg);
  color: var(--vp-local-search-highlight-text);
  border-radius: 2px;
  padding: 0 2px;
  margin: 0 -2px;
  transition: background-color 0.2s;
}

.titles :deep(mark) {
  background-color: var(--vp-local-search-highlight-bg);
  color: var(--vp-local-search-highlight-text);
  border-radius: 2px;
  padding: 0;
  margin: 0;
  transition: background-color 0.2s;
}

/* Custom Feature: Currently focused highlight (during navigation) */
.excerpt :deep(mark.current) {
  background-color: var(--vp-c-yellow-3);
  color: #000;
  font-weight: bold;
}

.excerpt :deep(.vp-code-group) .tabs {
  display: none;
}

.excerpt :deep(.vp-code-group) div[class*='language-'] {
  border-radius: 8px !important;
}

.excerpt-gradient-bottom {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 8px;
  background: linear-gradient(transparent, var(--vp-local-search-result-bg));
  z-index: 1000;
}

.excerpt-gradient-top {
  position: absolute;
  top: -1px;
  left: 0;
  width: 100%;
  height: 8px;
  background: linear-gradient(var(--vp-local-search-result-bg), transparent);
  z-index: 1000;
}

.result.selected .titles,
.result.selected .title-icon {
  color: var(--vp-c-brand-1) !important;
}

.no-results {
  font-size: 0.9rem;
  text-align: center;
  padding: 12px;
}

svg {
  flex: none;
}

.vp-local-search-enter-from .backdrop,
.vp-local-search-leave-to .backdrop {
  opacity: 0;
}

.vp-local-search-enter-active .backdrop {
  transition: opacity 0.15s ease-out;
}

.vp-local-search-leave-active .backdrop {
  transition: opacity 0.1s ease-in;
}

@keyframes vp-shell-enter {
  from {
    opacity: 0;
    transform: scale(0.975) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.vp-local-search-enter-active .shell {
  animation: vp-shell-enter 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.vp-local-search-leave-active .shell {
  animation: vp-shell-enter 0.1s cubic-bezier(0.16, 1, 0.3, 1) reverse both;
}

.searching {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.vp-search-spinner {
  display: block;
  width: 18px;
  height: 18px;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: vp-spin 0.6s linear infinite;
}

@keyframes vp-spin {
  to {
    transform: rotate(360deg);
  }
}

.no-results-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 0.8rem;
}

.try-fuzzy-btn,
.suggestion-btn {
  padding: 2px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  color: var(--vp-c-brand-1);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.15s;
}

.try-fuzzy-btn:hover,
.suggestion-btn:hover {
  background-color: var(--vp-c-bg-soft);
}

.did-you-mean {
  color: var(--vp-c-text-2);
}

.recent-searches {
  padding: 8px 12px;
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.clear-all-btn {
  font-size: 0.75rem;
  color: var(--vp-c-brand-1);
  opacity: 0.75;
  cursor: pointer;
  transition: opacity 0.15s;
  background: transparent;
  border: none;
}

.clear-all-btn:hover {
  opacity: 1;
}

.recent-label {
  display: block;
  font-size: 0.75rem;
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.recent-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.recent-item-wrapper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: transparent;
  transition: background-color 0.15s;
}

.recent-item-wrapper:hover {
  background-color: var(--vp-c-bg-soft);
}

.recent-item-wrapper .recent-item {
  border: none;
  background: transparent;
  padding: 3px 6px 3px 10px;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: color 0.15s;
}

.recent-item-wrapper:hover .recent-item {
  color: var(--vp-c-text-1);
}

.recent-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 3px 8px 3px 4px;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: color 0.15s;
}

.recent-delete-btn:hover {
  color: var(--vp-c-danger-1);
}

.delete-icon-mini {
  font-size: 11px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.results-info {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  padding: 6px 12px;
  border-bottom: 1px dashed var(--vp-c-divider);
  margin-top: -12px;
  margin-bottom: 4px;
}

.show-more-item {
  text-align: center;
  padding: 6px;
}

.show-more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  font-size: 0.8rem;
  color: var(--vp-c-brand-1);
  opacity: 0.75;
  padding: 0 12px;
  border-radius: 4px;
  transition:
    opacity 0.15s,
    background-color 0.15s;
}

.show-more-btn:hover {
  opacity: 1;
  background-color: var(--vp-c-bg-soft);
}

/* Custom Feature: Fuzzy search toggle button styling */
.toggle-fuzzy-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 4px;
  transition: all 0.2s;
}

.toggle-fuzzy-button .fuzzy-icon,
.toggle-fuzzy-button .exact-icon {
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
}

.toggle-fuzzy-button:hover {
  background: var(--vp-c-bg-soft);
}

.toggle-fuzzy-button.fuzzy-active {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

/* Custom Feature: URL search toggle button styling */
.toggle-url-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 4px;
  transition: all 0.2s;
}

.toggle-url-button .url-icon {
  width: 18px;
  height: 18px;
}

.toggle-url-button:hover {
  background: var(--vp-c-bg-soft);
}

.toggle-url-button.url-active {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.result-list-enter-active,
.result-list-leave-active {
  transition: opacity 0.15s ease;
}
.result-list-enter-from,
.result-list-leave-to {
  opacity: 0;
}
</style>
