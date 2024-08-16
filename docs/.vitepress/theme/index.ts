import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import Post from './PostLayout.vue'
import { loadProgress } from './composables/nprogress'
import './style.css'
import 'uno.css'
import { createPlausible } from './composables/plausible'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ router, app }) {
    app.component('Post', Post)
    loadProgress(router)
    app.use(
      createPlausible({
        apiHost: `https://${process.env.ANALYTICS_URL}`,
        domain: 'https://web-24.fmhy.pages.dev'
      })
    )
  }
} satisfies Theme
