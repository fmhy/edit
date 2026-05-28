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

      router.onBeforeRouteChange = (to) => {
        try {
          // Force scroll-behavior: auto (instant) when changing pages (path),
          // preventing the "scroll to top" animation.
          // Smooth scrolling is preserved for same-page hash/anchor changes.
          const targetUrl = new URL(to, window.location.href)
          if (targetUrl.pathname !== window.location.pathname) {
            document.documentElement.style.scrollBehavior = 'auto'
          }
        } catch (e) {
          // Fallback if URL parsing fails
        }
        originalBefore?.(to)
      }

      router.onAfterRouteChanged = (to) => {
        originalAfter?.(to)
        // Re-enable smooth scrolling shortly after navigation completes
        setTimeout(() => {
          document.documentElement.style.scrollBehavior = 'smooth'
        }, 1)

        // Scroll to the exact matching text after a search-result navigation
        if (pendingScrollQuery.value) {
          const query = pendingScrollQuery.value
          pendingScrollQuery.value = null
          const hash = window.location.hash.slice(1)
          scheduleScrollToMatch(hash, query)
        }
      }
    }

    // Initialize theme handler
    useThemeHandler()
  }
} satisfies Theme
