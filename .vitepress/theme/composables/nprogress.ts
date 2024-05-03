import { NProgress, type Configuration as NProgressConfiguration } from 'nprogress'
import type { EnhanceAppContext } from 'vitepress'

let nProgressInstance: NProgress | null = null

export function loadProgress(router: EnhanceAppContext['router']): NProgress {
  if (typeof window === 'undefined') {
    return {
      start: () => {},
      done: () => {},
      configure: () => {},
    } as NProgress
  }

  if (!nProgressInstance) {
    nProgressInstance = new NProgress((config: NProgressConfiguration) => {
      config.showSpinner = false
    })
  }

  router.onBeforeRouteUpdate(() => {
    nProgressInstance.start()
  })

  router.onAfterRouteUpdated(() => {
    nProgressInstance.done()
  })

  return nProgressInstance
}
