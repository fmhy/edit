<script lang="ts">
import { h, ref } from 'vue'
import { RESULTS_PAGE_SIZE } from '../search/engine'

const MAX_RECENT_SEARCHES = 20
const SEARCH_DEBOUNCE_MS = 350
const MARK_MERGE_DISTANCE_PX = 20
const MARK_SAME_LINE_THRESHOLD_PX = 5

// Permanent global cache for rendered excerpts keyed by page ID (build output is stable)
const globalExcerptCache = new Map<string, Map<string, string>>()
let excerptCacheIndex: object | null = null
// Excerpts come from the stable per-page cache, so sanitize each one once
// rather than on every re-render of the results list.
const sanitizedExcerpts = new Map<string, string>()

// Persisted results state across mount/unmount of the modal
const globalLastQuery = ref('')
const globalLastFuzzy = ref(false)
const globalLastUrlSearch = ref(false)
const globalLastSemantic = ref(false)
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
import type { Result, SidebarItem } from '../search/engine'
import type { SemanticHit } from '../search/semantic'
import localSearchIndex from '@localSearchIndex'
import {
  computedAsync,
  onKeyStroke,
  useEventListener,
  useLocalStorage,
  useScrollLock,
  useSessionStorage,
  watchDebounced
} from '@vueuse/core'
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap'
import Mark from 'mark.js/src/vanilla.js'
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
import {
  buildUrlQuery,
  computeCategoryCounts,
  isExactSearchMode,
  looksLikeUrlQuery,
  normalizeUrlSearchValue,
  rankAutoSuggestions,
  resultCandidates,
  resultCategoryOf,
  runSearch,
  selectResultsPage,
  urlMatchesNormalizedUrl
} from '../search/engine'
import { pickEntry } from '../search/entries'
import { loadSearchIndex } from '../search/indexLoader'
import { loadSemanticSearch, semanticSearch } from '../search/semantic-client'
import CriticalBadge from './CriticalBadge.vue'
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

// Opt-in: ranks by meaning too, using an on-device embedding model that is
// downloaded on first use (see search/semantic.ts).
const isSemanticSearch = useLocalStorage(
  'vitepress:local-search-semantic',
  false
)
const semanticStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')

// Start downloading the model as soon as semantic search is on, so it is
// usually ready by the time the first query is typed.
watch(
  isSemanticSearch,
  (on) => {
    if (!on || !inBrowser || semanticStatus.value !== 'idle') return
    semanticStatus.value = 'loading'
    loadSemanticSearch().then(
      () => (semanticStatus.value = 'ready'),
      (error) => {
        semanticStatus.value = 'error'
        console.error('Semantic search unavailable:', error)
      }
    )
  },
  { immediate: true }
)

// Categories and labels come from the sidebar, which is static at build time,
// so this runs once. Wiki and Tools entries pointing at the same page
// (e.g. /audio#audio-tools) keep the first (Wiki) label.
const searchCategories = (() => {
  const entries: { id: string; label: string }[] = []
  const seen = new Set<string>()
  const collect = (items: SidebarItem[]) => {
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      if (Array.isArray(item.items)) {
        collect(item.items)
      } else if (typeof item.link === 'string' && item.link.startsWith('/')) {
        const id = resultCategoryOf(item.link)
        if (seen.has(id)) continue
        seen.add(id)
        entries.push({
          id,
          label: (item.text ?? '').replace(/<[^>]*>/g, '').trim()
        })
      }
    }
  }
  collect(Array.isArray(sidebar) ? sidebar : [])
  return entries
})()

const activeCategory = ref('')

// Chips count what's actually displayed (after excerpt filtering in
// detailed view), not the raw pool. Rebuilt in watcher 2 when the
// underlying result set changes.
const categoryCounts = shallowRef<Map<string, number>>(new Map())

const totalCategoryCount = computed(() =>
  [...categoryCounts.value.values()].reduce((sum, n) => sum + n, 0)
)

const visibleCategories = computed(() =>
  searchCategories
    .filter(
      (c) =>
        (categoryCounts.value.get(c.id) ?? 0) > 0 ||
        activeCategory.value === c.id
    )
    // Most matches first; ties keep the sidebar order (stable sort).
    .sort(
      (a, b) =>
        (categoryCounts.value.get(b.id) ?? 0) -
        (categoryCounts.value.get(a.id) ?? 0)
    )
)

const activeCategoryLabel = computed(
  () => searchCategories.find((c) => c.id === activeCategory.value)?.label ?? ''
)

function selectCategory(id: string) {
  activeCategory.value = activeCategory.value === id ? '' : id
  resultLimit.value = RESULTS_PAGE_SIZE
  shouldResetScroll.value = true
}

function onCategoryWheel(event: WheelEvent) {
  const el = event.currentTarget as HTMLElement
  if (el.scrollWidth <= el.clientWidth) return
  if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
  event.preventDefault()
  el.scrollLeft += event.deltaY
}

const loadedIndex = computedAsync(() =>
  loadSearchIndex(
    searchIndexData.value,
    localeIndex.value,
    theme.value.search?.provider === 'local'
      ? theme.value.search.options?.miniSearch
      : undefined
  )
)
const searchIndex = computed(() => loadedIndex.value?.index ?? null)

const disableQueryPersistence = computed(() => {
  return (
    theme.value.search?.provider === 'local' &&
    theme.value.search.options?.disableQueryPersistence === true
  )
})

const filterText = disableQueryPersistence.value
  ? ref('')
  : useSessionStorage('vitepress:local-search-filter', '')

// URL matching also kicks in automatically when the query *looks* like a URL even with the manual toggle off.
const urlSearchAuto = computed(
  () =>
    !isUrlSearch.value &&
    !!filterText.value &&
    looksLikeUrlQuery(filterText.value)
)

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
    isSemanticSearch.value === globalLastSemantic.value &&
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
  return rankAutoSuggestions(
    searchIndex.value,
    filterText.value,
    loadedIndex.value!.globalLinksData
  )
})

watch([filterText, isFuzzySearch, isUrlSearch, isSemanticSearch], () => {
  activeCategory.value = ''
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

/**
 * Main search handler - debounced to avoid excessive re-renders while typing.
 * Watches: search index, filter text, detail view toggle, and fuzzy search mode.
 */
watch(
  [
    filterText,
    isFuzzySearch,
    isUrlSearch,
    isSemanticSearch,
    showDetailedList,
    searchIndex
  ],
  () => {
    isSearching.value = !matchesGlobalState() && !!filterText.value
  },
  { immediate: true }
)

// Excerpts belong to the index's build; drop them only when it is replaced
// (locale switch or HMR), not every time the modal reopens.
watch(
  searchIndex,
  (index) => {
    if (index && index !== excerptCacheIndex) {
      if (excerptCacheIndex) {
        cache.clear()
        sanitizedExcerpts.clear()
      }
      excerptCacheIndex = index
    }
  },
  { immediate: true }
)

// 1. Debounced Search watcher: Only runs the index query and gets the raw matching results list
watchDebounced(
  () =>
    [
      searchIndex.value,
      filterText.value,
      isFuzzySearch.value,
      isUrlSearch.value,
      isSemanticSearch.value,
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

    const search = (semantic?: SemanticHit[]) =>
      runSearch(
        {
          index,
          termKeys: loadedIndex.value!.termKeys,
          customMetadata: loadedIndex.value!.customMetadata,
          urlIndex: loadedIndex.value!.urlIndex,
          sidebar: Array.isArray(sidebar) ? sidebar : []
        },
        filterTextValue,
        { fuzzy: isFuzzySearch.value, url: isUrlSearch.value, semantic }
      )
    let { results: boostedResults, usedSubstringExpansion: usedExpansion } =
      search()
    if (isSemanticSearch.value && !looksLikeUrlQuery(filterTextValue)) {
      // Keyword results show at once; the semantic ranking replaces them when
      // the model is ready (the first query downloads it).
      if (semanticStatus.value !== 'ready') {
        allResults.value = boostedResults
        semanticStatus.value = 'loading'
      }
      try {
        const hits = await semanticSearch(filterTextValue)
        semanticStatus.value = 'ready'
        if (canceled) return
        ;({ results: boostedResults, usedSubstringExpansion: usedExpansion } =
          search(hits))
      } catch (error) {
        semanticStatus.value = 'error'
        console.error('Semantic search unavailable:', error)
      }
    }
    usedSubstringExpansion.value = usedExpansion

    enableNoResults.value = true

    if (canceled) return
    allResults.value = boostedResults

    // Save to global cache (totalResultsCount is set by watcher 2 after excerpt filtering)
    globalAllResults.value = boostedResults
    globalLastQuery.value = filterTextValue
    globalLastFuzzy.value = isFuzzySearch.value
    globalLastUrlSearch.value = isUrlSearch.value
    globalLastSemantic.value = isSemanticSearch.value
    globalLastDetailed.value = showDetailedList.value
    globalUsedSubstringExpansion.value = usedSubstringExpansion.value
  },
  { debounce: SEARCH_DEBOUNCE_MS, immediate: true }
)

// 2. Synchronous Watcher: Handles slicing, excerpt fetching, DOM rendering, and highlight marking instantly
watch(
  () =>
    [
      allResults.value,
      resultLimit.value,
      showDetailedList.value,
      activeCategory.value
    ] as const,
  async ([allRes, limit, showDetailedListValue], old, onCleanup) => {
    let canceled = false
    onCleanup(() => {
      canceled = true
    })

    // Only rebuild chips when the result set itself changed (new query,
    // pagination, detail view), switching category doesn't.
    const resultSetChanged =
      !old ||
      allRes !== old[0] ||
      limit !== old[1] ||
      showDetailedListValue !== old[2]

    // Section filter slices the in-memory results before pagination; switching
    // sections doesn't re-run the index query
    const category = activeCategory.value
    const scopedResults = category
      ? allRes.filter((r) => resultCategoryOf(r.id) === category)
      : allRes

    const sliced = scopedResults.slice(0, limit)
    if (sliced.length === 0) {
      results.value = []
      resultMarks.value = new Map()
      currentMarkIndex.value = new Map()
      if (!(old === undefined && filterText.value)) {
        isSearching.value = false
      }
      totalResultsCount.value = 0
      mayHaveMore.value = false
      if (resultSetChanged) {
        categoryCounts.value = computeCategoryCounts(allRes)
      }
      return
    }

    const terms = new Set<string>()

    const isExactSearch = isExactSearchMode(
      isFuzzySearch.value,
      usedSubstringExpansion.value
    )
    // Exact mode verifies the phrase against excerpts in both views; fuzzy and
    // substring expansion only need excerpts for the detailed view.
    const needsExcerpts = isExactSearch || showDetailedListValue
    const toFetch = needsExcerpts
      ? resultCandidates(scopedResults, limit, isExactSearch).filter((r) => {
          const [id] = r.id.split('#')
          return !cache.has(id)
        })
      : []
    const mods = await Promise.all(toFetch.map((r) => fetchExcerpt(r.id)))
    if (canceled) return

    await processExcerpts(mods, vitePressData, () => canceled)
    if (canceled) return

    const {
      finalResults,
      totalCount,
      mayHaveMore: mayHaveMoreValue,
      postFiltered,
      relaxed
    } = selectResultsPage(scopedResults, {
      limit,
      exact: isExactSearch,
      detailed: showDetailedListValue,
      filterText: filterText.value,
      textOf: lookupExcerptText
    })

    // Fuzzy, substring-expanded, rewritten and typo-tolerant queries match
    // index terms the user didn't type, so highlight those terms.
    if (!isExactSearch || relaxed) {
      for (const r of finalResults) {
        for (const term of Object.keys(r.match || {})) {
          terms.add(term)
        }
      }
    }

    if (resultSetChanged) {
      // Category active = excerpt filter only covers that category, so count
      // the raw pool or the other chips disappear and you can't switch back.
      // Without a category, the post filtered set is what's shown (fuzzy/compact
      // don't filter, so allRes is it).
      // allRes holds the exact pool and the typo-tolerant fallback pool;
      // count only the one being shown.
      categoryCounts.value = computeCategoryCounts(
        postFiltered && !category
          ? postFiltered
          : allRes.filter((r) => !!r.fallback === relaxed)
      )
    }

    if (!highlightMatchedTerms) {
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

    // Semantic matches may share no words with the query: highlight the
    // entry the match is about so the excerpt and the page can focus it.
    for (const r of finalResults) {
      if (!r.semanticLine) continue
      const item = resultsEl.value?.querySelector(
        `[data-id="${CSS.escape(r.id)}"]`
      )
      const lis = entryItemsOf(item)
      const best = pickEntry(
        lis.map((li) => ({
          name: entryNameOf(li),
          starred: li.classList.contains('starred')
        })),
        r.semanticLine,
        []
      )
      const link = best === -1 ? null : lis[best].querySelector('a')
      if (!link || lis[best].querySelector('mark[data-markjs="true"]')) continue
      const mark = document.createElement('mark')
      mark.setAttribute('data-markjs', 'true')
      mark.append(...link.childNodes)
      link.appendChild(mark)
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
        const groups = groupMarks(marks)
        newResultMarks.set(index, groups)
        newCurrentMarkIndex.set(index, focusedMarkGroup(item, groups, r))
      }
    })

    const scrollTargets: { excerpt: HTMLElement; scrollTop: number }[] = []
    for (const [index, groups] of newResultMarks) {
      const markElement = groups[newCurrentMarkIndex.get(index) ?? 0][0]
      const excerpt = markElement.closest<HTMLElement>('.excerpt')
      if (!excerpt) continue
      const markRelTop = getRelativeOffsetTop(markElement, excerpt)
      const scrollTop =
        markRelTop -
        (excerpt.clientHeight || 80) / 2 +
        markElement.offsetHeight / 2
      scrollTargets.push({ excerpt, scrollTop })
    }
    for (const { excerpt, scrollTop } of scrollTargets) {
      excerpt.scrollTop = scrollTop
    }
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

// Curated entries are the top-level list items of an excerpt whose first link
// is the entry name (only a star or bold may precede it).
function entryNameOf(li: HTMLLIElement): string {
  const link = li.querySelector('a')
  const text = li.textContent ?? ''
  const name = link?.textContent ?? ''
  const at = name ? text.indexOf(name) : -1
  if (at === -1 || text.slice(0, at).replace(/[\s⭐🌟]/gu, '')) return ''
  return name
}

function entryItemsOf(item: Element | null | undefined) {
  return Array.from(
    item?.querySelectorAll<HTMLLIElement>('.excerpt .vp-doc > ul > li') ?? []
  )
}

// Starts match navigation (excerpt scroll, current mark, page highlight) on the
// entry the result is about instead of the section's first match.
function focusedMarkGroup(
  item: Element | null | undefined,
  groups: HTMLElement[][],
  r: Result & SearchResult & { semanticLine?: string }
): number {
  const lis = entryItemsOf(item)
  const entries = lis.map((li) => ({
    name: entryNameOf(li),
    starred: li.classList.contains('starred')
  }))
  let best = pickEntry(entries, filterText.value, Object.keys(r.match ?? {}))
  if (best === -1 && r.semanticLine)
    best = pickEntry(entries, r.semanticLine, [])
  if (best === -1) return 0
  return Math.max(
    0,
    groups.findIndex((g) => lis[best].contains(g[0]))
  )
}

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

function renderExcerpt(text: string) {
  let html = sanitizedExcerpts.get(text)
  if (html === undefined) {
    html = sanitizeRichHtml(text)
    sanitizedExcerpts.set(text, html)
  }
  return html
}

function lookupExcerptText(resultId: string): string {
  const hashIndex = resultId.indexOf('#')
  if (hashIndex === -1) return ''
  const pageId = resultId.slice(0, hashIndex)
  const map = cache.get(pageId)
  if (!map) return ''
  const anchor = resultId.slice(hashIndex + 1)
  const direct = map.get(anchor)
  if (direct) return direct
  // The search index (constants.ts) and the excerpt DOM derive heading slugs
  // from two separate render passes that can disagree: e.g. an emoji in a
  // heading is dropped from the index slug ("stars-added") but baked into the
  // mounted component's slug ("stars-added-⭐"). Recover by matching the index
  // anchor as a prefix of a DOM key — but only when exactly one key matches, so
  // an ambiguous prefix never silently returns a sibling section's excerpt.
  const prefix = anchor + '-'
  let found: string | null = null
  for (const [key, html] of map) {
    if (!key.startsWith(prefix)) continue
    if (found !== null) return ''
    found = html
  }
  return found ?? ''
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

const VDropdownStub = {
  name: 'VDropdown',
  render(this: any) {
    return h('span', { class: 'v-popper' }, this.$slots.default?.())
  }
}

async function processExcerpts(
  mods: { id: string; mod: ComponentModule }[],
  vitePressData: ReturnType<typeof useData>,
  isCanceled: () => boolean
) {
  for (const { id, mod } of mods) {
    if (isCanceled()) return
    const hashIndex = id.indexOf('#')
    const mapId = hashIndex === -1 ? id : id.slice(0, hashIndex)
    if (cache.has(mapId)) continue
    const map = new Map<string, string>()
    const comp = (mod.default ?? mod) as { render?: unknown; setup?: unknown }
    if (comp && typeof comp === 'object' && (comp.render || comp.setup)) {
      try {
        const app = createApp(comp as Component)
        app.component('VDropdown', VDropdownStub)
        app.component('CriticalBadge', CriticalBadge)
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
            // VitePress sets the heading's id and its anchor href to the same
            // slug, so one key suffices; fall back to id if the anchor link is
            // missing for any reason.
            const href = heading.querySelector('a')?.getAttribute('href')
            const anchor = href?.startsWith('#')
              ? href.slice(1)
              : (heading.getAttribute('id') ?? undefined)
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
            map.set(anchor, html)
          })
          cache.set(mapId, map)
        } finally {
          app.unmount()
        }
      } catch (e) {
        console.error('Error processing excerpt for ' + id, e)
      }
    }
  }
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
  urlAuto: 'URL detected — searching link URLs. Click to keep this on.',
  semanticOn: 'Semantic search on. Click to search keywords only',
  semanticOff: 'Search by meaning too (downloads a 7 MB model once)',
  semanticLoading: 'Loading semantic search model...',
  semanticError: 'Semantic search failed to load. Click to turn it off',
  searching: 'Searching...',
  cycleMatches: 'to cycle matches',
  detailedViewOn: 'Detailed view',
  detailedViewOff: 'Compact view'
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
  setUrlQuery(filterText.value.trim())
  nextTick(() => {
    isLocked.value = true
    nextTick().then(() => activate())
  })
})

// Mirror the query into ?q= while the modal is open so the address bar is a
// shareable link (useSearchFromQuery opens it again); dropped on close.
function setUrlQuery(query: string) {
  const url = new URL(window.location.href)
  if (query) url.searchParams.set('q', query)
  else url.searchParams.delete('q')
  if (url.href !== window.location.href) {
    window.history.replaceState(window.history.state, '', url.href)
  }
}

watchDebounced(
  filterText,
  (query) => {
    if (inBrowser && show.value) setUrlQuery(query.trim())
  },
  { debounce: SEARCH_DEBOUNCE_MS }
)

onBeforeUnmount(() => {
  if (inBrowser) setUrlQuery('')
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

function toggleSemanticSearch() {
  isSemanticSearch.value = !isSemanticSearch.value
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
  if (isFuzzySearch.value && !looksLikeUrlQuery(rawQuery)) {
    const words = rawQuery
      .trim()
      .split(/[\s\W]+/)
      .filter(Boolean)
    for (const word of words) {
      allTerms.add(word)
    }
  } else {
    const trimmed = rawQuery.trim()
    allTerms.add(trimmed)
    if (looksLikeUrlQuery(rawQuery)) {
      const stripped = stripSchemeAndWww(normalizeUrlSearchValue(trimmed))
      if (stripped && stripped !== trimmed.toLowerCase()) {
        allTerms.add(stripped)
      }
    }
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

// When the results list (or an item within it) holds focus — e.g. after arrow
// navigation — a printable keystroke would otherwise be lost. Redirect it back
// to the search input so the user can keep typing; focusing synchronously in
// keydown lets the character land in the input.
function onResultsKeydown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key.length !== 1) return // ignore non-printable keys (arrows, Enter, …)
  if (document.activeElement === searchInput.value) return
  focusSearchInput(false)
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
              maxlength="256"
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
                :class="{
                  'url-active': isUrlSearch,
                  'url-auto': urlSearchAuto
                }"
                :aria-pressed="isUrlSearch"
                :title="
                  isUrlSearch
                    ? customTitles.urlOn
                    : urlSearchAuto
                      ? customTitles.urlAuto
                      : customTitles.urlOff
                "
                @click="toggleUrlSearch"
              >
                <span class="url-icon i-lucide:link" />
                <span class="visually-hidden">
                  {{
                    isUrlSearch
                      ? 'URL Search Active'
                      : urlSearchAuto
                        ? 'URL Search Auto-Active'
                        : 'URL Search Off'
                  }}
                </span>
              </button>

              <button
                class="toggle-semantic-button"
                type="button"
                :class="{
                  'semantic-active': isSemanticSearch,
                  'semantic-error':
                    isSemanticSearch && semanticStatus === 'error'
                }"
                :aria-pressed="isSemanticSearch"
                :title="
                  !isSemanticSearch
                    ? customTitles.semanticOff
                    : semanticStatus === 'loading'
                      ? customTitles.semanticLoading
                      : semanticStatus === 'error'
                        ? customTitles.semanticError
                        : customTitles.semanticOn
                "
                @click="toggleSemanticSearch"
              >
                <span class="semantic-icon i-lucide:sparkles" />
                <span class="visually-hidden">
                  {{
                    isSemanticSearch
                      ? 'Semantic Search Active'
                      : 'Semantic Search Off'
                  }}
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

          <div v-if="filterText" class="results-header">
            <span v-if="results.length" class="results-info-text">
              Showing {{ results.length }} of {{ totalResultsCount
              }}{{ mayHaveMore ? '+' : '' }} matches
            </span>
            <button
              v-if="!disableDetailedView"
              class="toggle-layout-button"
              type="button"
              :class="{ 'detailed-list': showDetailedList }"
              :aria-pressed="showDetailedList"
              :title="translate('modal.displayDetails')"
              @click="toggleDetailedList"
            >
              <span class="vpi-layout-list toggle-layout-icon" />
              <span class="toggle-layout-label">
                {{
                  showDetailedList
                    ? customTitles.detailedViewOn
                    : customTitles.detailedViewOff
                }}
              </span>
            </button>
          </div>

          <div
            v-if="filterText && visibleCategories.length"
            class="category-filters"
            @wheel="onCategoryWheel"
          >
            <button
              type="button"
              class="category-chip"
              :class="{ active: !activeCategory }"
              :aria-pressed="!activeCategory"
              title="All sections"
              @click="selectCategory('')"
            >
              All
              <span class="chip-count">{{ totalCategoryCount }}</span>
            </button>
            <button
              v-for="cat in visibleCategories"
              :key="cat.id"
              type="button"
              class="category-chip"
              :class="{ active: activeCategory === cat.id }"
              :aria-pressed="activeCategory === cat.id"
              :title="cat.label"
              @click="selectCategory(cat.id)"
            >
              {{ cat.label }}
              <span class="chip-count">
                {{ categoryCounts.get(cat.id) ?? 0 }}
              </span>
            </button>
          </div>

          <ul
            :id="results?.length ? 'localsearch-list' : undefined"
            ref="resultsEl"
            :role="results?.length ? 'listbox' : undefined"
            :aria-labelledby="results?.length ? 'localsearch-label' : undefined"
            class="results"
            tabindex="-1"
            @mousemove="onMouseMove"
            @keydown="onResultsKeydown"
          >
            <TransitionGroup name="result-list">
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
                        <div class="vp-doc" v-html="renderExcerpt(p.text)" />
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
                <div
                  v-if="activeCategory && totalCategoryCount > 0"
                  class="no-results-category"
                >
                  No results in {{ activeCategoryLabel }}
                  <button
                    class="try-fuzzy-btn"
                    @click="selectCategory(activeCategory)"
                  >
                    Show all sections
                  </button>
                </div>
                <div v-else>
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
  gap: 12px;
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
.toggle-url-button.url-active,
.toggle-semantic-button.semantic-active {
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

/* With highlights in the excerpt, show only the entries that contain them. */
.excerpt-wrapper :deep(.excerpt:has(mark) .vp-doc > :not(:has(mark))),
.excerpt-wrapper :deep(.excerpt:has(mark) li:not(:has(mark))) {
  display: none;
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

/* Currently focused search highlight */
.excerpt :deep(mark.current) {
  background-color: var(--vp-focus-highlight-bg);
  color: black;
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

.results-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-top: -4px;
  padding: 4px 4px 10px;
  border-bottom: 1px dashed var(--vp-c-divider);
}

.results-info-text {
  flex: 1;
  min-width: 0;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  padding-left: 8px;
}

/* Custom Feature: Category filter chips */
.category-filters {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  padding: 0 4px 2px;
  margin-top: -6px;
}

@supports not selector(::-moz-progress-bar) {
  .category-filters {
    margin-bottom: -6px;
  }

  .category-filters::-webkit-scrollbar {
    height: 8px;
  }

  .category-filters::-webkit-scrollbar-track {
    background: transparent;
  }

  .category-filters::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: 999px;
    background-color: var(--vp-c-text-3);
    background-clip: content-box;
  }

  .category-filters::-webkit-scrollbar-thumb:hover {
    background-color: var(--vp-c-text-2);
  }
}

@supports selector(::-moz-progress-bar) {
  .category-filters {
    padding-bottom: 8px;
    margin-bottom: -8px;
    scrollbar-color: var(--vp-c-text-3) transparent;
  }

  .category-filters:hover {
    scrollbar-color: var(--vp-c-text-2) transparent;
  }
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  background-color: var(--vp-local-search-bg);
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.2s,
    background-color 0.2s,
    border-color 0.2s;
}

.category-chip:hover {
  color: var(--vp-c-text-1);
  background-color: var(--vp-c-bg-soft);
}

.category-chip.active {
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-soft);
  border-color: color-mix(
    in srgb,
    var(--vp-c-brand-1) 35%,
    var(--vp-c-divider)
  );
}

.chip-count {
  font-size: 0.7rem;
  font-family: var(--vp-font-family-mono);
  opacity: 0.7;
}

.no-results-category {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toggle-layout-button {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  background-color: var(--vp-local-search-bg);
  transition:
    color 0.2s,
    background-color 0.2s,
    border-color 0.2s;
}

.toggle-layout-icon {
  display: block;
  font-size: 14px;
  flex-shrink: 0;
}

.toggle-layout-label {
  line-height: 1;
  white-space: nowrap;
}

.toggle-layout-button:hover {
  color: var(--vp-c-text-1);
  background-color: var(--vp-c-bg-soft);
}

.toggle-layout-button.detailed-list {
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-soft);
  border-color: color-mix(
    in srgb,
    var(--vp-c-brand-1) 35%,
    var(--vp-c-divider)
  );
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

.toggle-url-button.url-auto:not(.url-active) {
  color: var(--vp-c-brand-1);
  opacity: 0.6;
}

.toggle-semantic-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  transition: all 0.2s;
}

.toggle-semantic-button .semantic-icon {
  width: 18px;
  height: 18px;
}

.toggle-semantic-button:hover {
  background: var(--vp-c-bg-soft);
}

.toggle-semantic-button.semantic-active {
  background: var(--vp-c-bg-soft);
}

.search-actions .toggle-semantic-button.semantic-error {
  color: var(--vp-c-danger-1);
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
