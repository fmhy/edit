<script lang="ts" setup>
/**
 * VPLocalSearchBox - Enhanced Local Search Modal Component
 * 
 * Base: VitePress default local search component
 * 
 * Custom Features Added:
 * ----------------------
 * 1. Fuzzy Search Toggle
 *    - Toggle between exact and fuzzy matching modes
 *    - Fuzzy mode includes typo tolerance and multi-word queries
 *    - Searches both space-separated and dash-separated variants
 * 
 * 2. Smart Highlight Merging (Fuzzy Mode)
 *    - Automatically merges nearby highlights (< 20px apart) in fuzzy mode
 *    - Reduces navigation tedium when multiple words are highlighted
 *    - Preserves text between merged highlights
 * 
 * 3. Match Navigation System
 *    - Navigate through highlights with left/right arrow keys
 *    - Visual controls: prev/next buttons with match counter (e.g., "2/5")
 *    - Smooth scrolling to center the active match
 *    - Yellow highlight for currently focused match
 * 
 */
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
import MiniSearch, { type SearchResult } from 'minisearch'
import { dataSymbol, inBrowser, useRouter } from 'vitepress'
import {
  computed,
  createApp,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  triggerRef,
  watch,
  watchEffect,
  type Ref
} from 'vue'
import type { ModalTranslations } from 'vitepress/types/local-search'
import { pathToFile } from 'vitepress/dist/client/app/utils'
import { escapeRegExp } from 'vitepress/dist/client/shared'
import { useData } from 'vitepress/dist/client/theme-default/composables/data'
import { LRUCache } from 'vitepress/dist/client/theme-default/support/lru'
import { createSearchTranslate } from 'vitepress/dist/client/theme-default/support/translation'
import Tooltip from './Tooltip.vue'
import FloatingVue from 'floating-vue'
import { sidebar } from '../../shared'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const el = shallowRef<HTMLElement>()
const resultsEl = shallowRef<HTMLElement>()

/* Search */

const searchIndexData = shallowRef(localSearchIndex)

// Hot Module Replacement - updates search index without full page reload during development
if (import.meta.hot) {
  import.meta.hot.accept('/@localSearchIndex', (m) => {
    if (m) {
      searchIndexData.value = m.default
    }
  })
}

interface Result {
  title: string
  titles: string[]
  text?: string
}

const vitePressData = useData()
const { activate } = useFocusTrap(el, {
  immediate: true,
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

const searchIndex = computedAsync(async () =>
  markRaw(
    MiniSearch.loadJSON<Result>(
      (await searchIndexData.value[localeIndex.value]?.())?.default,
      {
        fields: ['title', 'titles', 'text'],
        storeFields: ['title', 'titles'],
        tokenize: (text: string) =>
          text.replace(/[\u2060\u200B]/g, '').split(/[^a-zA-Z0-9\u00C0-\u00FF-]+/).filter((t) => t),
        searchOptions: {
          fuzzy: false,
          prefix: true,
          boost: { title: 4, text: 2, titles: 1 },
          ...(theme.value.search?.provider === 'local' &&
            theme.value.search.options?.miniSearch?.searchOptions)
        },
        ...(theme.value.search?.provider === 'local' &&
          theme.value.search.options?.miniSearch?.options)
      }
    )
  )
)

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

const results: Ref<(SearchResult & Result)[]> = shallowRef([])

const enableNoResults = ref(false)

watch(filterText, () => {
  enableNoResults.value = false
})

const mark = computedAsync(async () => {
  if (!resultsEl.value) return
  return markRaw(new Mark(resultsEl.value))
}, null)

// LRU cache for rendered excerpts (16 most recently viewed files)
const cache = new LRUCache<string, Map<string, string>>(16)

/**
 * Main search handler - debounced to avoid excessive re-renders while typing.
 * Watches: search index, filter text, detail view toggle, and fuzzy search mode.
 */
debouncedWatch(
  () => [searchIndex.value, filterText.value, showDetailedList.value, isFuzzySearch.value] as const,
  async ([index, filterTextValue, showDetailedListValue, fuzzySearchValue], old, onCleanup) => {
    if (old?.[0] !== index) {
      // Clear cache on index change (e.g., locale switch or HMR update)
      cache.clear()
    }

    let canceled = false
    onCleanup(() => {
      canceled = true
    })

    if (!index) return

    /**
     * Configure search options based on fuzzy mode.
     * Fuzzy search splits multi-word queries and searches for:
     * 1. All words present (AND) - matches "PC Optimization Hub"
     * 2. Dashed version - matches "PC-Optimization-Hub"
     * This allows flexible matching of space-separated or dash-separated content.
     */
    const searchOptions = {
      fuzzy: isFuzzySearch.value ? 0.2 : false
    }
    let query: any = filterTextValue

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
              fuzzy: 0.2
            },
            {
              queries: [dashed],
              combineWith: 'AND',
              fuzzy: 0.2
            }
          ]
        }
      }
    }

    /**
     * Suffix Search / Substring Matching:
     * If the user searches for a suffix (e.g. "abolic"), scan the index for terms
     * containing that substring (e.g. "parabolic") and add them to the query.
     * This mimics "contains" behavior which is missing in strict prefix search.
     */
    if (!isFuzzySearch.value && filterTextValue.length > 2) {
      const candidateTerms: string[] = []
      const miniSearch = index as any
      if (miniSearch._index) {
        const it = miniSearch._index.keys()
        const match = filterTextValue.toLowerCase()
        let result = it.next()
        while (!result.done) {
          const term = result.value
          if (term.includes(match) && term !== match) {
            candidateTerms.push(term)
          }
          result = it.next()
        }
      }

      if (candidateTerms.length > 0) {
        // In exact mode, use an explicit OR query.
        // This ensures that if the original search term ("arabolic") returns no results
        // due to prefix matching, the substring matches ("Parabolic") are still returned.
        // A string query might default to AND depending on global config, which would fail here.
        query = {
          combineWith: 'OR',
          queries: [
            filterTextValue,
            ...candidateTerms
          ]
        }
      }
    }

    function findPageTitle(items: any[], path: string): string | null {
      for (const item of items) {
        if (item.link === path) return item.text
        if (item.items) {
          const found = findPageTitle(item.items, path)
          if (found) return found
        }
      }
      return null
    }

    const rawResults = index
      .search(query, searchOptions)
      .slice(0, 16) as (SearchResult & Result)[]

    results.value = rawResults.map((r) => {
      const [id] = r.id.split('#')
      const cleanPath = '/' + id.replace(/\.html$/, '').replace(/^\//, '')
      const pageTitle = findPageTitle(Array.isArray(sidebar) ? sidebar : [], cleanPath)
      const titles = [...r.titles]
      
      if (pageTitle && !titles.includes(pageTitle) && r.title !== pageTitle) {
        titles.unshift(pageTitle)
      }

      return { ...r, titles }
    })

    enableNoResults.value = true

    // Fetch and process excerpts for detailed view highlighting
    const mods = showDetailedListValue
      ? await Promise.all(results.value.map((r) => fetchExcerpt(r.id)))
      : []
    if (canceled) return

    await processExcerpts(mods, vitePressData, () => canceled)
    if (canceled) return

    const terms = new Set<string>()

    results.value = results.value.map((r) => {
      const [id, anchor] = r.id.split('#')
      const map = cache.get(id)
      const text = map?.get(anchor) ?? ''
      
      if (isFuzzySearch.value) {
        for (const term in r.match) {
          terms.add(term)
        }
      }
      return { ...r, text }
    })

    if (!isFuzzySearch.value) {
      // Only highlight search term if results exist to avoid highlighting "No results" message
      if (results.value.length > 0) {
        terms.add(filterTextValue)
      }
      results.value = filterResults(results.value, filterTextValue)
    }

    await nextTick()
    if (canceled) return

    await new Promise((r) => {
      mark.value?.unmark({
        done: () => {
          mark.value?.markRegExp(formMarkRegex(terms), { done: r })
        }
      })
    })

    /**
     * Custom feature: Merge nearby highlights in fuzzy mode.
     * Combines individual word highlights that are close together (< 20px apart)
     * into single continuous highlights, reducing navigation tedium.
     */
    if (isFuzzySearch.value) {
      await mergeNearbyMarks()
    }

    const excerpts = Array.from(el.value?.querySelectorAll('.result .excerpt') ?? []) as HTMLElement[]
    for (const excerpt of excerpts) {
      const mark = excerpt.querySelector('mark[data-markjs="true"]') as HTMLElement | null
      if (mark) {
        const markTop = mark.offsetTop
        const markHeight = mark.offsetHeight
        const excerptHeight = excerpt.clientHeight
        
        excerpt.scrollTop = markTop - excerptHeight / 2 + markHeight / 2
      }
    }
    
    /**
     * Custom feature: Initialize match navigation state.
     * Collects all highlight marks in each result for prev/next navigation.
     * Each result tracks its own array of marks and current position.
     */
    const newResultMarks = new Map<number, HTMLElement[]>()
    const newCurrentMarkIndex = new Map<number, number>()
    
    results.value.forEach((_, index) => {
      const item = el.value?.querySelector(`#localsearch-item-${index}`)
      const marks = Array.from(item?.querySelectorAll('.excerpt mark[data-markjs="true"]') ?? []) as HTMLElement[]
      if (marks.length > 0) {
        newResultMarks.set(index, marks)
        newCurrentMarkIndex.set(index, 0)
      }
    })
    resultMarks.value = newResultMarks
    currentMarkIndex.value = newCurrentMarkIndex

    // Reset scroll position to top
    if (resultsEl.value) {
      resultsEl.value.scrollTop = 0
    }
  },
  { debounce: 200, immediate: true }
)

/* Custom Feature: Match Navigation State */
const resultMarks = shallowRef<Map<number, HTMLElement[]>>(new Map())
const currentMarkIndex = shallowRef<Map<number, number>>(new Map())

/**
 * Merges adjacent highlight marks that are visually close together.
 * This reduces the number of navigation stops in fuzzy mode where
 * each individual word match would otherwise be a separate highlight.
 * 
 * Merging criteria:
 * - Marks must be on the same line (within 5px vertical distance)
 * - Marks must be close horizontally (< 20px apart)
 */
async function mergeNearbyMarks() {
  const excerpts = Array.from(el.value?.querySelectorAll('.result .excerpt') ?? [])
  
  for (const excerpt of excerpts) {
    const marks = Array.from(excerpt.querySelectorAll('mark[data-markjs="true"]')) as HTMLElement[]
    if (marks.length <= 1) continue
    
    // Process marks to merge those within 20 characters of each other
    let i = 0
    while (i < marks.length - 1) {
      const currentMark = marks[i]
      const nextMark = marks[i + 1]
      
      // Calculate distance between marks
      const currentEnd = currentMark.offsetLeft + currentMark.offsetWidth
      const nextStart = nextMark.offsetLeft
      const distance = nextStart - currentEnd
      
      // Also check if they're on the same line (similar offsetTop)
      const onSameLine = Math.abs(currentMark.offsetTop - nextMark.offsetTop) < 5
      
      // Merge if they're close (within 20px) and on the same line
      if (distance >= 0 && distance < 20 && onSameLine) {
        // Create a merged mark element
        const textBetween = getTextBetweenMarks(currentMark, nextMark)
        const mergedText = currentMark.textContent + textBetween + nextMark.textContent
        currentMark.textContent = mergedText
        
        // Remove the next mark
        nextMark.remove()
        marks.splice(i + 1, 1)
      } else {
        i++
      }
    }
  }
}

/**
 * Extracts the plain text content between two mark elements.
 * Used when merging adjacent highlights to preserve the spacing/text between them.
 */
function getTextBetweenMarks(mark1: HTMLElement, mark2: HTMLElement): string {
  const parent = mark1.parentNode
  if (!parent) return ''
  
  let text = ''
  let node: Node | null = mark1.nextSibling
  
  while (node && node !== mark2) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || ''
    }
    node = node.nextSibling
  }
  
  return text
}

/**
 * Custom feature: Navigate to the next highlighted match in the current result.
 * Cycles back to the first match when reaching the end.
 * Smoothly scrolls the excerpt to center the highlighted match.
 */
function nextMatch(index: number) {
  const marks = resultMarks.value.get(index)
  let curr = currentMarkIndex.value.get(index) ?? 0
  if (!marks) return

  // Remove 'current' class from previous mark
  marks[curr].classList.remove('current')

  curr = (curr + 1) % marks.length
  currentMarkIndex.value.set(index, curr)
  triggerRef(currentMarkIndex)

  // Add 'current' class to new mark
  const newMark = marks[curr]
  newMark.classList.add('current')
  
  const excerpt = newMark.closest('.excerpt')
  if (excerpt) {
    const markTop = newMark.offsetTop
    const markHeight = newMark.offsetHeight
    const excerptHeight = excerpt.clientHeight
    
    excerpt.scrollTo({
      top: markTop - excerptHeight / 2 + markHeight / 2,
      behavior: 'smooth'
    })
  }
}

/**
 * Custom feature: Navigate to the previous highlighted match in the current result.
 * Cycles to the last match when going before the first.
 * Smoothly scrolls the excerpt to center the highlighted match.
 */
function prevMatch(index: number) {
  const marks = resultMarks.value.get(index)
  let curr = currentMarkIndex.value.get(index) ?? 0
  if (!marks) return

  // Remove 'current' class from previous mark
  marks[curr].classList.remove('current')

  curr = (curr - 1 + marks.length) % marks.length
  currentMarkIndex.value.set(index, curr)
  triggerRef(currentMarkIndex)

  // Add 'current' class to new mark
  const newMark = marks[curr]
  newMark.classList.add('current')
  
  const excerpt = newMark.closest('.excerpt')
  if (excerpt) {
    const markTop = newMark.offsetTop
    const markHeight = newMark.offsetHeight
    const excerptHeight = excerpt.clientHeight
    
    excerpt.scrollTo({
      top: markTop - excerptHeight / 2 + markHeight / 2,
      behavior: 'smooth'
    })
  }
}

async function fetchExcerpt(id: string) {
  const file = pathToFile(id.slice(0, id.indexOf('#')))
  try {
    if (!file) throw new Error(`Cannot find file for id: ${id}`)
    return { id, mod: await import(/*@vite-ignore*/ file) }
  } catch (e) {
    console.error(e)
    return { id, mod: {} }
  }
}

async function processExcerpts(
  mods: { id: string; mod: any }[],
  vitePressData: any,
  isCanceled: () => boolean
) {
  for (const { id, mod } of mods) {
    if (isCanceled()) return
    const mapId = id.slice(0, id.indexOf('#'))
    let map = cache.get(mapId)
    if (map) continue
    map = new Map()
    cache.set(mapId, map)
    const comp = mod.default ?? mod
    if (comp?.render || comp?.setup) {
      const app = createApp(comp)
      app.use(FloatingVue)
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
      const headings = div.querySelectorAll('h1, h2, h3, h4, h5, h6')
      headings.forEach((el) => {
        const href = el.querySelector('a')?.getAttribute('href')
        const anchor = href?.startsWith('#') && href.slice(1)
        if (!anchor) return
        let html = ''
        while ((el = el.nextElementSibling!) && !/^h[1-6]$/i.test(el.tagName))
          html += el.outerHTML
        map!.set(anchor, html)
      })
      app.unmount()
    }
  }
}

function filterResults(results: (SearchResult & Result)[], filterTextValue: string) {
  return results.filter((r) => {
    const phrase = filterTextValue.toLowerCase()
    const inText = r.text?.toLowerCase().includes(phrase)
    const inTitle = r.title.toLowerCase().includes(phrase)
    const inTitles = r.titles.some((t) => t.toLowerCase().includes(phrase))
    return inText || inTitle || inTitles
  })
}

/* Search input focus */

const searchInput = ref<HTMLInputElement>()
const disableReset = computed(() => {
  return filterText.value?.length <= 0
})
function focusSearchInput(select = true) {
  searchInput.value?.focus()
  select && searchInput.value?.select()
}

onMounted(() => {
  focusSearchInput()
})

function onSearchBarClick(event: PointerEvent) {
  if (event.pointerType === 'mouse') {
    focusSearchInput(false)
  }
}

/* Search keyboard selection */

const selectedIndex = ref(-1)
const disableMouseOver = ref(true)

watch(results, (r) => {
  selectedIndex.value = r.length ? 0 : -1
  scrollToSelectedResult()
})

function scrollToSelectedResult() {
  nextTick(() => {
    const selectedEl = document.querySelector('.result.selected')
    selectedEl?.scrollIntoView({ block: 'nearest' })
  })
}

onKeyStroke('ArrowUp', (event) => {
  event.preventDefault()
  selectedIndex.value--
  if (selectedIndex.value < 0) {
    selectedIndex.value = results.value.length - 1
  }
  disableMouseOver.value = true
  scrollToSelectedResult()
})

onKeyStroke('ArrowDown', (event) => {
  event.preventDefault()
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

  const selectedPackage = results.value[selectedIndex.value]
  if (e.target instanceof HTMLInputElement && !selectedPackage) {
    e.preventDefault()
    return
  }

  if (selectedPackage) {
    router.go(selectedPackage.id)
    emit('close')
  }
})

onKeyStroke('Escape', () => {
  emit('close')
})

/**
 * Custom feature: Keyboard navigation for cycling through highlights.
 * Left/Right arrow keys navigate prev/next match within the selected result.
 * Only active when detailed view is enabled and matches exist.
 */
onKeyStroke('ArrowLeft', (event) => {
  // Navigate to previous match - only when viewing detailed excerpts with highlights
  if (showDetailedList.value && selectedIndex.value >= 0 && (resultMarks.value.get(selectedIndex.value)?.length ?? 0) > 0) {
    if (event.target === searchInput.value) {
      if (event.shiftKey) return
      const { selectionStart, selectionEnd } = searchInput.value!
      // Only hijack if cursor is collapsed at the start
      if (selectionStart !== 0 || selectionEnd !== 0) return
    }
    event.preventDefault()
    prevMatch(selectedIndex.value)
  }
})

onKeyStroke('ArrowRight', (event) => {
  // Navigate to next match - only when viewing detailed excerpts with highlights
  if (showDetailedList.value && selectedIndex.value >= 0 && (resultMarks.value.get(selectedIndex.value)?.length ?? 0) > 0) {
    if (event.target === searchInput.value) {
      if (event.shiftKey) return
      const { selectionStart, selectionEnd, value } = searchInput.value!
      // Only hijack if cursor is collapsed at the end
      if (selectionStart !== value.length || selectionEnd !== value.length) return
    }
    event.preventDefault()
    nextMatch(selectedIndex.value)
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

// Back

onMounted(() => {
  // Prevents going to previous site
  window.history.pushState(null, '', null)
})

useEventListener('popstate', (event) => {
  event.preventDefault()
  emit('close')
})

/** Lock body */
const isLocked = useScrollLock(inBrowser ? document.body : null)

onMounted(() => {
  nextTick(() => {
    isLocked.value = true
    nextTick().then(() => activate())
  })
})

onBeforeUnmount(() => {
  isLocked.value = false
})

function resetSearch() {
  filterText.value = ''
  nextTick().then(() => focusSearchInput(false))
}

function handleInput(e: Event) {
  filterText.value = (e.target as HTMLInputElement).value
}

function toggleFuzzySearch() {
  isFuzzySearch.value = !isFuzzySearch.value
}

function formMarkRegex(terms: Set<string>) {
  return new RegExp(
    [...terms]
      .sort((a, b) => b.length - a.length)
      .map((term) => `(${escapeRegExp(term)})`)
      .join('|'),
    'gi'
  )
}

function onMouseMove(e: MouseEvent) {
  if (!disableMouseOver.value) return
  const el = (e.target as HTMLElement)?.closest<HTMLElement>('.result-item')
  const index = el?.dataset?.index ? Number.parseInt(el.dataset.index) : -1
  if (index >= 0 && index !== selectedIndex.value) {
    selectedIndex.value = index
  }
  disableMouseOver.value = false
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="el"
      role="button"
      :aria-owns="results?.length ? 'localsearch-list' : undefined"
      aria-expanded="true"
      aria-haspopup="listbox"
      aria-labelledby="localsearch-label"
      class="VPLocalSearchBox"
    >
      <div class="backdrop" @click="$emit('close')" />

      <div class="shell">
        <form
          class="search-bar"
          @pointerup="onSearchBarClick($event)"
          @submit.prevent=""
        >
          <label
            :title="buttonText"
            id="localsearch-label"
            for="localsearch-input"
          >
            <span aria-hidden="true" class="vpi-search search-icon local-search-icon" />
          </label>
          <div class="search-actions before">
            <button
              class="back-button"
              :title="translate('modal.backButtonTitle')"
              @click="$emit('close')"
            >
              <span class="vpi-arrow-left local-search-icon" />
            </button>
          </div>
          <input
            ref="searchInput"
            :value="filterText"
            @input="handleInput"
            :aria-activedescendant="selectedIndex > -1 ? ('localsearch-item-' + selectedIndex) : undefined"
            aria-autocomplete="both"
            :aria-controls="results?.length ? 'localsearch-list' : undefined"
            aria-labelledby="localsearch-label"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            class="search-input"
            id="localsearch-input"
            enterkeyhint="go"
            maxlength="64"
            :placeholder="buttonText"
            spellcheck="false"
            type="search"
          />
          <div class="search-actions">
            <button
              v-if="!disableDetailedView"
              class="toggle-layout-button"
              type="button"
              :class="{ 'detailed-list': showDetailedList }"
              :title="translate('modal.displayDetails')"
              @click="
                selectedIndex > -1 && (showDetailedList = !showDetailedList)
              "
            >
              <span class="vpi-layout-list local-search-icon" />
            </button>

            <button
              class="toggle-fuzzy-button"
              type="button"
              :class="{ 'fuzzy-active': isFuzzySearch }"
              :title="isFuzzySearch ? 'Switch to Exact Search' : 'Switch to Fuzzy Search'"
              @click="toggleFuzzySearch"
            >
              <span v-if="isFuzzySearch" class="fuzzy-icon">~</span>
              <span v-else class="exact-icon">=</span>
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
          ref="resultsEl"
          :id="results?.length ? 'localsearch-list' : undefined"
          :role="results?.length ? 'listbox' : undefined"
          :aria-labelledby="results?.length ? 'localsearch-label' : undefined"
          class="results"
          @mousemove="onMouseMove"
        >
          <li
            v-for="(p, index) in results"
            :key="p.id"
            :id="'localsearch-item-' + index"
            :aria-selected="selectedIndex === index ? 'true' : 'false'"
            role="option"
            class="result-item"
            :data-index="index"
          >
            <a
              :href="p.id"
              class="result"
              :class="{
                selected: selectedIndex === index
              }"
              :aria-label="[...p.titles, p.title].join(' > ')"
              @mouseenter="!disableMouseOver && (selectedIndex = index)"
              @focusin="selectedIndex = index"
              @click="$emit('close')"
              :data-index="index"
            >
              <div>
                <div class="titles">
                  <span class="title-icon">#</span>
                  <span
                    v-for="(t, index) in p.titles"
                    :key="index"
                    class="title"
                  >
                    <span class="text" v-html="t" />
                    <span class="vpi-chevron-right local-search-icon" />
                  </span>
                  <span class="title main">
                    <span class="text" v-html="p.title" />
                  </span>
                </div>

                <div v-if="showDetailedList" class="excerpt-wrapper">
                  <div v-if="p.text" class="excerpt" inert>
                    <div class="vp-doc" v-html="p.text" />
                  </div>

                  <div class="excerpt-gradient-bottom" />
                  <div class="excerpt-gradient-top" />
                </div>
              </div>
            </a>
            <div
              v-if="showDetailedList && (resultMarks.get(index)?.length ?? 0) > 1"
              class="excerpt-actions"
            >
              <button type="button" class="match-nav-button" @click="prevMatch(index)" title="Previous match">
                <span class="vpi-chevron-left navigate-icon" />
              </button>
              <span class="match-count">{{ (currentMarkIndex.get(index) ?? 0) + 1 }}/{{ resultMarks.get(index)?.length }}</span>
              <button type="button" class="match-nav-button" @click="nextMatch(index)" title="Next match">
                <span class="vpi-chevron-right navigate-icon" />
              </button>
            </div>
          </li>
          <li
            v-if="filterText && !results.length && enableNoResults"
            class="no-results"
          >
            {{ translate('modal.noResultsText') }} "{{ filterText }}"
          </li>
        </ul>

        <div class="search-keyboard-shortcuts">
          <span>
            <kbd :aria-label="translate('modal.footer.navigateUpKeyAriaLabel')">
              <span class="vpi-arrow-up navigate-icon" />
            </kbd>
            <kbd :aria-label="translate('modal.footer.navigateDownKeyAriaLabel')">
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
            to cycle matches
          </span>
          <span>
            <kbd :aria-label="translate('modal.footer.closeKeyAriaLabel')">esc</kbd>
            {{ translate('modal.footer.closeText') }}
          </span>
        </div>
      </div>
    </div>
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
  transition: opacity 0.5s;
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
}

@media (max-width: 767px) {
  .shell {
    margin: 0;
    width: 100vw;
    height: 100vh;
    max-height: none;
    border-radius: 0;
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

/* Custom Feature: Match navigation controls overlay */
.result-item {
  position: relative;
}

.excerpt-actions {
  position: absolute;
  /* (12px margin + 2px border + 5px spacing) */
  bottom: 19px;
  right: 19px;
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
}

@media (max-width: 767px) {
  .excerpt-actions {
    /* (8px margin + 2px border + 5px spacing) */
    bottom: 15px;
    right: 15px;
  }
}

.match-nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 2px;
  color: var(--vp-c-text-2);
  transition: color 0.2s, background-color 0.2s;
  cursor: pointer;
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
.toggle-layout-button.detailed-list {
  color: var(--vp-c-brand-1);
}

.search-actions button.clear-button:disabled {
  opacity: 0.37;
}

/* Custom Feature: Fuzzy search toggle button */
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
  gap: 6px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.result {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 4px;
  transition: none;
  line-height: 1rem;
  border: solid 2px var(--vp-local-search-result-border);
  outline: none;
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
  opacity: 50%;
  pointer-events: none;
  max-height: 140px;
  overflow: hidden;
  position: relative;
  margin-top: 4px;
}

.result.selected .excerpt {
  opacity: 1;
}

.excerpt :deep(*) {
  font-size: 0.8rem !important;
  line-height: 130% !important;
}

/* Ensure excerpt content is visible and correctly styled */
.excerpt :deep(*) {
  font-size: 0.8rem !important;
  line-height: 130% !important;
}

.excerpt :deep(li) {
  display: list-item !important;
}

/* Highlight styles - default state */
.titles :deep(mark),
.excerpt :deep(mark) {
  background-color: var(--vp-local-search-highlight-bg);
  color: var(--vp-local-search-highlight-text);
  border-radius: 2px;
  padding: 0 1px;
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
</style>
