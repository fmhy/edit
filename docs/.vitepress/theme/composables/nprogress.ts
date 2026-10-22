import type { NProgress } from 'nprogress'
import type { EnhanceAppContext } from 'vitepress'
import nprogress from 'nprogress'

/**
 *  Copyright (c) 2025 taskylizard. Apache License 2.0.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

export function loadProgress(
  router: EnhanceAppContext['router']
): NProgress | undefined {
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
