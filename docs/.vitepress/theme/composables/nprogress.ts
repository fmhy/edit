import nprogress, { type NProgress } from 'nprogress'
import type { EnhanceAppContext } from 'vitepress'

export function loadProgress(router: EnhanceAppContext['router']): NProgress {
  if (typeof window === 'undefined') return

  setTimeout(() => {
    nprogress.configure({ showSpinner: false })

    const cacheBeforeRouteChange = router.onBeforeRouteChange
    const cacheAfterRouteChange = router.onAfterRouteChanged
    router.onBeforeRouteChange = (to) => {
      nprogress.start()
      cacheBeforeRouteChange?.(to)
    }
    router.onAfterRouteChanged = (to) => {
      nprogress.done()
      cacheAfterRouteChange?.(to)
    }
  })

  return nprogress
}
