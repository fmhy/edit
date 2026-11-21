import type MiniSearch from 'minisearch'
import type { CustomMetadata, Result, UrlRecord } from './engine'
import localSearchIndex from '@localSearchIndex'
import { markRaw } from 'vue'
import {
  buildGlobalLinksData,
  buildUrlIndex,
  createSearchIndex,
  getIndexTermKeys
} from './engine'

type IndexModules = typeof localSearchIndex
type IndexLoader = IndexModules[string]

export interface LoadedSearchIndex {
  index: MiniSearch<Result>
  customMetadata: CustomMetadata
  readonly termKeys: string[]
  readonly urlIndex: UrlRecord[]
  readonly globalLinksData: ReturnType<typeof buildGlobalLinksData>
}

// Keyed by the chunk loader so an HMR update (new loader functions) rebuilds,
// while reopening the modal reuses the parsed index for the page's lifetime.
const fetched = new WeakMap<IndexLoader, Promise<unknown>>()
const built = new WeakMap<IndexLoader, Promise<LoadedSearchIndex | null>>()

function fetchIndex(loader: IndexLoader) {
  let p = fetched.get(loader)
  if (!p) {
    p = loader().then((m) => m.default)
    p.catch(() => fetched.delete(loader))
    fetched.set(loader, p)
  }
  return p
}

/** Download the index chunk without parsing it (search-intent prefetch). */
export function prefetchSearchIndex(locale: string) {
  const loader = localSearchIndex[locale]
  if (loader) fetchIndex(loader).catch(() => {})
}

function lazy<T>(compute: () => T): () => T {
  let value: { v: T } | undefined
  return () => (value ??= { v: compute() }).v
}

export function loadSearchIndex(
  modules: IndexModules,
  locale: string,
  miniSearchConfig?: { options?: object; searchOptions?: object }
): Promise<LoadedSearchIndex | null> {
  const loader = modules[locale]
  if (!loader) return Promise.resolve(null)
  let p = built.get(loader)
  if (!p) {
    p = fetchIndex(loader).then((raw) => {
      if (!raw) return null
      let parsed: any
      try {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch {
        return null
      }
      const customMetadata: CustomMetadata = parsed?.customMetadata || {}
      const index = markRaw(createSearchIndex(parsed, miniSearchConfig))
      const termKeys = lazy(() => getIndexTermKeys(index))
      const urlIndex = lazy(() => buildUrlIndex(customMetadata))
      const globalLinksData = lazy(() => buildGlobalLinksData(customMetadata))
      return markRaw({
        index,
        customMetadata,
        get termKeys() {
          return termKeys()
        },
        get urlIndex() {
          return urlIndex()
        },
        get globalLinksData() {
          return globalLinksData()
        }
      })
    })
    p.catch(() => built.delete(loader))
    built.set(loader, p)
  }
  return p
}
