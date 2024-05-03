// Import the necessary modules and components
import { type Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import Post from './PostLayout.vue'
import { loadProgress } from './composables/nprogress'
import './style.css'
import 'uno.css'

// Define the custom VitePress theme
export default {
  extends: DefaultTheme,
  Layout,
  Post,
  // Add a setup function to configure the theme
  setup() {
    // Call the enhanceApp function to add the custom post layout component and load the progress bar
    this.enhanceApp({
      router: this.router,
      app: this.app,
      // Define the mount function to be called after the VitePress app is mounted
      mount(app) {
        // Add the custom post layout component to the VitePress app
        app.component('Post', Post)
        // Call the loadProgress function with the router object as an argument
        loadProgress(this.router)
      }
    })
  }
} satisfies Theme
