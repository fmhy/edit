import { useData } from 'vitepress'
import { onMounted, onUnmounted } from 'vue'

const SEARCH_TRIGGER = '.DocSearch-Button, #local-search'
const POINTER_EVENTS = ['pointerover', 'pointerdown', 'focusin'] as const

/**
 * Start downloading the search modal and its index as soon as the user shows
 * intent (hover, touch, focus, or the open shortcut) so they arrive in
 * parallel instead of serially after the modal mounts.
 */
export function useSearchPrefetch() {
  const { localeIndex } = useData()
  let started = false

  function prefetch() {
    if (started) return
    started = true
    detach()
    void import('../components/VPLocalSearchBox.vue')
    void import('../search/indexLoader').then((m) =>
      m.prefetchSearchIndex(localeIndex.value)
    )
  }

  function onPointer(event: Event) {
    const target = event.target as Element | null
    if (target?.closest?.(SEARCH_TRIGGER)) prefetch()
  }

  function onKeydown(event: KeyboardEvent) {
    const key = event.key?.toLowerCase()
    if (key === '/' || (key === 'k' && (event.metaKey || event.ctrlKey)))
      prefetch()
  }

  function detach() {
    for (const type of POINTER_EVENTS)
      document.removeEventListener(type, onPointer, true)
    window.removeEventListener('keydown', onKeydown, true)
  }

  onMounted(() => {
    for (const type of POINTER_EVENTS)
      document.addEventListener(type, onPointer, {
        capture: true,
        passive: true
      })
    window.addEventListener('keydown', onKeydown, true)
  })
  onUnmounted(detach)
}
