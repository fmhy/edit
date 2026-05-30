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
      const originalBefore = router.onBeforeRouteChange
      const originalAfter = router.onAfterRouteChanged

      // Track the original scroll-behavior so we restore it correctly
      // instead of unconditionally forcing 'smooth'.
      // null = no pending restoration (same-page nav or already restored).
      let savedScrollBehavior: string | null = null

      router.onBeforeRouteChange = (to) => {
        // Cancel any in-progress scroll-to-match from a previous navigation
        cancelPendingScroll()
        // Clear stale search query — prevents it from being consumed on the
        // wrong page if the user navigates away before the target page loads.
        // navigateToResult re-sets this AFTER router.go() returns.
        pendingScrollQuery.value = null

        try {
          // Force scroll-behavior: auto (instant) when changing pages (path),
          // preventing the "scroll to top" animation.
          // Smooth scrolling is preserved for same-page hash/anchor changes.
          const targetUrl = new URL(to, window.location.href)
          if (targetUrl.pathname !== window.location.pathname) {
            savedScrollBehavior = document.documentElement.style.scrollBehavior
            document.documentElement.style.scrollBehavior = 'auto'
          }
        } catch {
          // Fallback if URL parsing fails
        }
        originalBefore?.(to)
      }

      router.onAfterRouteChanged = (to) => {
        originalAfter?.(to)

        const hasPendingSearch = !!pendingScrollQuery.value

        // Restore scroll-behavior to its original value after navigation.
        // Only runs when onBeforeRouteChange actually saved a value
        // (cross-page navigations). Same-page hash changes are skipped.
        if (savedScrollBehavior !== null) {
          const valueToRestore = savedScrollBehavior
          savedScrollBehavior = null

          if (hasPendingSearch) {
            // When a search scroll is pending, keep scroll-behavior as
            // 'auto' (instant) until the scroll-to-match operation
            // completes. scheduleScrollToMatch's onComplete callback
            // fires when the match is found or all attempts are exhausted,
            // so we never restore too early or rely on a fragile timeout.
            const { query, matchContext } = pendingScrollQuery.value!
            pendingScrollQuery.value = null
            const hash = window.location.hash.slice(1)
            scheduleScrollToMatch(hash, query, 150, matchContext, () => {
              document.documentElement.style.scrollBehavior = valueToRestore
            })
            return
          }

          requestAnimationFrame(() => {
            document.documentElement.style.scrollBehavior = valueToRestore
          })
        }

        // Scroll to the exact matching text after a search-result navigation
        // (same-page case — no scroll-behavior override was saved)
        if (hasPendingSearch) {
          const { query, matchContext } = pendingScrollQuery.value!
          pendingScrollQuery.value = null
          const hash = window.location.hash.slice(1)
          scheduleScrollToMatch(hash, query, 150, matchContext)
        }
      }
    }

    // Initialize theme handler
    useThemeHandler()
  }
} satisfies Theme
