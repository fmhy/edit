import type { App, Component, Ref } from 'vue'
import type { SavedBookmark } from './linkBookmarks'
import { dataSymbol } from 'vitepress'
import { pathToFile } from 'vitepress/dist/client/app/utils'
import { useData } from 'vitepress/dist/client/theme-default/composables/data'
import {
  computed,
  createApp,
  h,
  nextTick,
  onMounted,
  ref,
  shallowRef,
  watch
} from 'vue'
import GradientCard from '../components/GradientCard.vue'
import LinkCard from '../components/LinkCard.vue'
import LinkInline from '../components/LinkInline.vue'
import Tag from '../components/Tag.vue'
import VideoFrame from '../components/VideoFrame.vue'
import { useLinkBookmarks } from './linkBookmarks'
import {
  buildPageRowMap,
  findRowInMap,
  normalizeBookmarkUrl,
  normalizePagePath
} from './savedRowUtils'

export { normalizePagePath }

export type DisplayRow = SavedBookmark & {
  html: string
  classes: string
  status: 'live' | 'missing'
}

export type RowData = { html: string; classes: string }

const pageRowCache = new Map<string, Map<string, RowData>>()

const ComponentStub = {
  render: () => null
}

const VDropdownStub = {
  name: 'VDropdown',
  render(this: { $slots: { default?: () => unknown } }) {
    return h('span', { class: 'v-popper' }, this.$slots.default?.())
  }
}

interface ComponentModule {
  default?: unknown
  __pageData?: {
    frontmatter?: Record<string, unknown>
    relativePath?: string
    title?: string
  }
  render?: unknown
  setup?: unknown
}

interface VitePressData {
  frontmatter: Ref<Record<string, unknown>>
  page: Ref<{ params?: unknown; relativePath?: string; title?: string }>
  site: Ref<{ base: string }>
}

export function rememberPageRow(
  page: string,
  base: string,
  url: string,
  row: RowData
) {
  const pagePath = normalizePagePath(page, base)
  const map = pageRowCache.get(pagePath) || new Map<string, RowData>()
  map.set(normalizeBookmarkUrl(url), row)
  pageRowCache.set(pagePath, map)
}

function createPageData(
  vitePressData: VitePressData,
  pageModule: ComponentModule['__pageData']
) {
  return {
    ...vitePressData,
    frontmatter: computed(() => ({
      ...vitePressData.frontmatter.value,
      ...(pageModule?.frontmatter || {})
    })),
    page: computed(() => ({
      ...vitePressData.page.value,
      relativePath: pageModule?.relativePath,
      title: pageModule?.title
    }))
  }
}

async function loadPageRowMap(
  page: string,
  vitePressData: VitePressData
): Promise<Map<string, RowData>> {
  const pagePath = normalizePagePath(page, vitePressData.site.value.base)
  const cached = pageRowCache.get(pagePath)
  if (cached?.size) return cached

  const file = pathToFile(pagePath)
  if (!file) return new Map()

  const map = await loadPageRowMapFromModule(file, vitePressData)
  if (map.size === 0) {
    const fetchedMap = await loadPageRowMapFromHtml(
      pagePath,
      vitePressData.site.value.base
    )
    if (fetchedMap.size > 0) {
      pageRowCache.set(pagePath, fetchedMap)
      return fetchedMap
    }
  }

  if (map.size > 0) pageRowCache.set(pagePath, map)
  return map
}

async function loadPageRowMapFromHtml(pagePath: string, base: string) {
  const url = `${base.replace(/\/$/, '')}${pagePath || '/'}`

  try {
    const response = await fetch(url)
    if (!response.ok) return new Map<string, RowData>()

    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const root = doc.querySelector('.VPDoc .content-container .vp-doc')

    return root ? buildPageRowMap(root) : new Map<string, RowData>()
  } catch {
    return new Map<string, RowData>()
  }
}

async function loadPageRowMapFromModule(
  file: string,
  vitePressData: VitePressData
): Promise<Map<string, RowData>> {
  let host: HTMLDivElement | null = null
  let app: App | null = null

  try {
    const mod = (await import(/* @vite-ignore */ file)) as ComponentModule
    const comp = (mod.default ?? mod) as Component
    if (
      !comp ||
      typeof comp !== 'object' ||
      (!('render' in comp) && !('setup' in comp))
    ) {
      return new Map()
    }

    const pageData = createPageData(vitePressData, mod.__pageData)
    app = createApp(comp)
    app.component('Feedback', ComponentStub)
    app.component('VDropdown', VDropdownStub)
    app.component('Tooltip', ComponentStub)
    app.component('GradientCard', GradientCard)
    app.component('VideoFrame', VideoFrame)
    app.component('LinkCard', LinkCard)
    app.component('LinkInline', LinkInline)
    app.component('Tag', Tag)
    app.config.warnHandler = () => {}
    app.provide(dataSymbol, pageData)
    Object.defineProperties(app.config.globalProperties, {
      $frontmatter: {
        get() {
          return pageData.frontmatter.value
        }
      },
      $params: {
        get() {
          return pageData.page.value.params
        }
      }
    })

    host = document.createElement('div')
    host.className = 'vp-doc fmhy-row-resolve-host'
    host.style.cssText =
      'position:fixed;left:-10000px;top:0;width:900px;visibility:hidden;pointer-events:none'
    document.body.appendChild(host)
    app.mount(host)

    await nextTick()
    await nextTick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    return buildPageRowMap(host)
  } catch {
    return new Map()
  } finally {
    app?.unmount()
    host?.remove()
  }
}

function resolveDisplayRow(
  bookmark: SavedBookmark,
  pageMaps: Map<string, Map<string, RowData>>,
  pagePath: string
): DisplayRow {
  const map = pageMaps.get(pagePath) || new Map()
  const live = findRowInMap(map, bookmark.url)
  const pageLoaded = map.size > 0

  if (live) {
    return {
      ...bookmark,
      html: live.html,
      classes: live.classes,
      status: 'live'
    }
  }

  if (bookmark.html) {
    return {
      ...bookmark,
      html: bookmark.html,
      classes: bookmark.classes || '',
      status: pageLoaded ? 'missing' : 'live'
    }
  }

  return {
    ...bookmark,
    html: `<a href="${bookmark.url}">${bookmark.url}</a>`,
    classes: '',
    status: pageLoaded ? 'missing' : 'live'
  }
}

export function useSavedRowResolver() {
  const { normalized, bookmarks } = useLinkBookmarks()
  const vitePressData = useData() as VitePressData
  const loading = ref(true)
  const ready = ref(false)
  const displayRows = shallowRef<DisplayRow[]>([])

  let resolveVersion = 0

  async function resolveRows() {
    const version = ++resolveVersion
    loading.value = true

    const saved = normalized()
    if (saved.length === 0) {
      displayRows.value = []
      loading.value = false
      ready.value = true
      return
    }

    const base = vitePressData.site.value.base
    const pages = [
      ...new Set(saved.map((entry) => normalizePagePath(entry.page, base)))
    ]
    const pageMaps = new Map<string, Map<string, RowData>>()

    await Promise.all(
      pages.map(async (pagePath) => {
        const map = await loadPageRowMap(pagePath, vitePressData)
        if (version !== resolveVersion) return
        pageMaps.set(pagePath, map)
      })
    )

    if (version !== resolveVersion) return

    displayRows.value = saved
      .map((bookmark) =>
        resolveDisplayRow(
          bookmark,
          pageMaps,
          normalizePagePath(bookmark.page, base)
        )
      )
      .sort((a, b) => b.savedAt - a.savedAt)

    loading.value = false
    ready.value = true
  }

  onMounted(() => resolveRows())

  watch(bookmarks, () => resolveRows(), { deep: true })

  return { displayRows, loading, ready, refresh: resolveRows }
}
