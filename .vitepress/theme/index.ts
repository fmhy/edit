import { type Theme } from 'vitepress' // Import the Theme type from VitePress
import DefaultTheme from 'vitepress/theme' // Import the default VitePress theme
import Layout from './Layout.vue' // Import the custom layout component
import Post from './PostLayout.vue' // Import the custom post layout component
import { loadProgress } from './composables/nprogress' // Import the loadProgress function
import './style.css' // Import the custom global CSS styles
import 'uno.css' // Import the uno.css library

// The custom VitePress theme
export default {
  // Extend the default VitePress theme
  extends: DefaultTheme,
  // Use the custom layout component
  Layout,
  // Use the custom post layout component
  Post,
  // The enhanceApp function is called after the VitePress app is mounted
  enhanceApp({ router, app }) {
    // Add the custom post layout component to the VitePress app
    app.component('Post', Post)
    // Call the loadProgress function with the router object as an argument
    loadProgress(router)
  }
} satisfies Theme
