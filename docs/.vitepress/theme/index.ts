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

      const scrollHijacker = {
        originalScrollTo: null as typeof window.scrollTo | null,
        originalScrollIntoView: null as
          | typeof Element.prototype.scrollIntoView
          | null,

        hijack() {
          if (!this.originalScrollTo) {
            this.originalScrollTo = window.scrollTo
            window.scrollTo = () => {}
          }
          if (!this.originalScrollIntoView) {
            this.originalScrollIntoView = Element.prototype.scrollIntoView
            Element.prototype.scrollIntoView = function () {}
          }
        },

        restore() {
          if (this.originalScrollTo) {
            window.scrollTo = this.originalScrollTo
            this.originalScrollTo = null
          }
          if (this.originalScrollIntoView) {
            Element.prototype.scrollIntoView = this.originalScrollIntoView
            this.originalScrollIntoView = null
          }
        }
      }

      router.onBeforeRouteChange = (to) => {
        // Cancel any in-progress scroll-to-match from a previous navigation
        cancelPendingScroll()

        // Restore scroll functions if they were left hijacked from a failed/cancelled previous navigation
        scrollHijacker.restore()

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

        // Hijack scroll functions early if this is the search navigation to
        // block VitePress's default route-change scroll to heading or top.
        if (isSearchNav) {
          scrollHijacker.hijack()
        } else {
          // Clear any stale query left over from a superseded navigation.
          pendingScrollQuery.value = null
        }

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
        const hasPendingSearch = !!pendingScrollQuery.value

        try {
          originalAfter?.(to)
        } finally {
          // Restore scroll functions after originalAfter has finished running,
          // but ONLY if this is not a search navigation. If it IS a search navigation,
          // we defer restoration until our custom search scroll runs or completes.
          if (!hasPendingSearch) {
            scrollHijacker.restore()
          }
        }

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
            scheduleScrollToMatch(
              hash,
              query,
              16,
              matchContext,
              () => {
                document.documentElement.style.scrollBehavior = valueToRestore
              },
              () => scrollHijacker.restore()
            )
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
          scheduleScrollToMatch(hash, query, 16, matchContext, undefined, () =>
            scrollHijacker.restore()
          )
        }
      }
    }

    // Initialize theme handler
    useThemeHandler()
  }
} satisfies Theme
