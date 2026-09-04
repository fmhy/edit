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

import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { loadProgress } from './composables/nprogress'
import {
  cancelPendingScroll,
  pendingScrollQuery,
  scheduleScrollToMatch
} from './composables/searchScroll'
import Layout from './Layout.vue'
import Post from './PostLayout.vue'
import { useThemeHandler } from './themes/themeHandler'

import './style.scss'
import 'virtual:uno.css'

import FloatingVue from 'floating-vue'
import Feedback from './components/Feedback.vue'

import 'floating-vue/dist/style.css'

import GradientCard from './components/GradientCard.vue'
import LinkCard from './components/LinkCard.vue'
import LinkInline from './components/LinkInline.vue'
import Tag from './components/Tag.vue'
import Tooltip from './components/Tooltip.vue'
import VideoFrame from './components/VideoFrame.vue'

const applySeasonalBranding = () => {
  const isJune = new Date().getMonth() === 5
  document.documentElement.classList.toggle('june', isJune)

  const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']")
  if (favicon) {
    favicon.href = isJune ? '/june_icon.webp' : '/fmhy.ico'
    favicon.type = isJune ? 'image/webp' : 'image/x-icon'
  }
}

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ router, app }) {
    app.use(FloatingVue)
    app.component('GradientCard', GradientCard)
    app.component('VideoFrame', VideoFrame)
    app.component('LinkCard', LinkCard)
    app.component('LinkInline', LinkInline)
    app.component('Tag', Tag)
    app.component('Post', Post)
    app.component('Feedback', Feedback)
    app.component('Tooltip', Tooltip)
    loadProgress(router)

    if (typeof window !== 'undefined') {
      applySeasonalBranding()

      const originalBefore = router.onBeforeRouteChange
      const originalAfter = router.onAfterRouteChanged

      router.onBeforeRouteChange = (to) => {
        cancelPendingScroll()

        // A search navigation is only the one whose destination matches the
        // pending query's recorded path. Any other navigation (e.g. a sidebar
        // link clicked while the search target is still loading) must clear the
        // stale query so it is never consumed on the wrong page.
        const normalizePath = (p: string) =>
          p
            .replace(/\.html$/, '')
            .replace(/\/index$/, '')
            .replace(/\/$/, '')
            .toLowerCase() || '/'

        let isSearchNav = false
        const pending = pendingScrollQuery.value
        if (pending) {
          try {
            isSearchNav =
              normalizePath(new URL(to, window.location.href).pathname) ===
              normalizePath(
                new URL(pending.path, window.location.href).pathname
              )
          } catch {
            // If URL parsing fails, assume this is the search nav rather than
            // dropping the query and silently breaking scroll-to-match.
            isSearchNav = true
          }
        }

        if (!isSearchNav) {
          pendingScrollQuery.value = null
        }

        originalBefore?.(to)
      }

      router.onAfterRouteChanged = (to) => {
        const hasPendingSearch = !!pendingScrollQuery.value

        originalAfter?.(to)

        // Scroll to the exact matching text after a search-result navigation
        if (hasPendingSearch) {
          const { query, matchContext } = pendingScrollQuery.value!
          pendingScrollQuery.value = null
          const hash = window.location.hash.slice(1)
          scheduleScrollToMatch(hash, query, 16, matchContext)
        }
      }
    }

    // Initialize theme handler
    useThemeHandler()
  }
} satisfies Theme
