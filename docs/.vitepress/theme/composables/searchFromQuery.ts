import { onMounted } from 'vue'

/**
 * If the current URL contains a `?q=<query>` parameter, open the site's
 * existing local search modal prefilled with that query.
 *
 * The modal is gated by an internal `showSearch` ref inside VitePress' default
 * VPNavBarSearch component, which has no public API. We open it by dispatching
 * a synthetic Ctrl/Cmd+K keydown — the exact mechanism VitePress itself uses to
 * programmatically open its Algolia search (see VPNavBarSearch.vue's `poll()`).
 *
 * The query is handed to the search box through the sessionStorage key that
 * VPLocalSearchBox's `filterText` already reads on mount, so no DOM selectors
 * are involved. Note: if `disableQueryPersistence` is ever enabled for local
 * search, `filterText` stops reading this key and the prefill must be reworked.
 */
const SEARCH_FILTER_STORAGE_KEY = 'vitepress:local-search-filter'

export function useSearchFromQuery() {
  onMounted(() => {
    if (typeof window === 'undefined') return

    const query = new URLSearchParams(window.location.search).get('q')
    if (!query?.trim()) return

    try {
      sessionStorage.setItem(SEARCH_FILTER_STORAGE_KEY, query.trim())
    } catch {
      // Storage unavailable (private mode, quota, ...) — still open search.
    }

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
    )
  })
}
