import nprogress, { type NProgress } from 'nprogress' // Import NProgress library and its type definition
import type { EnhanceAppContext } from 'vitepress' // Import EnhanceAppContext type definition from VitePress

export function loadProgress(router: EnhanceAppContext['router']): NProgress { // Export a function called loadProgress that takes in a router object as an argument
  if (typeof window === 'undefined') return // Return early if the window object is not defined

  // Initialize NProgress with some custom configurations
  setTimeout(() => {
    nprogress.configure({ showSpinner: false })

    // Set up event listeners for the router's onBeforeRouteChange and onAfterRouteChanged events
    const cacheBeforeRouteChange = router.onBeforeRouteChange
    const cacheAfterRouteChange = router.onAfterRouteChanged
    router.onBeforeRouteChange = (to) => {
      nprogress.start() // Start the NProgress bar when the user navigates to a new page
      cacheBeforeRouteChange?.(to) // Call the original onBeforeRouteChange event handler
    }
    router.onAfterRouteChanged = (to) => {
      nprogress.done() // Stop the NProgress bar after the route has changed
      cacheAfterRouteChange?.(to) // Call the original onAfterRouteChanged event handler
    }
  })

  return nprogress // Return the NProgress object
}
