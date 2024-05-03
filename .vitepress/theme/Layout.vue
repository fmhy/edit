<script setup lang="ts">
// Import necessary components and functions from VitePress, Vue, and the local project.
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { nextTick, provide } from 'vue'
import Sidebar from './components/SidebarCard.vue'
import Announcement from './components/Announcement.vue'

// Get the isDark value from the VitePress data object.
const { isDark } = useData()

// Define a function to check if the browser supports transitions and reduced motion preferences.
const enableTransitions = () =>
  'startViewTransition' in document &&
  window.matchMedia('(prefers-reduced-motion: no-preference)').matches

// Provide a method for toggling the appearance (dark/light mode) with an optional MouseEvent parameter.
provide('toggle-appearance', async ({ clientX: x, clientY: y }: MouseEvent) => {
  if (!enableTransitions()) {
    // If transitions are not supported, simply toggle the isDark value.
    isDark.value = !isDark.value
    return
  }

  // Calculate the clip path for the transition animation.
  const clipPath = [
    `circle(0px at ${x}px ${y}px)`,
    `circle(${Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    )}px at ${x}px ${y}px)`
  ]

  // Use the startViewTransition function to create a smooth transition effect.
  // @ts-expect-error: TypeScript error due to the use of a non-standard function.
  await document.startViewTransition(async () => {
    isDark.value = !isDark.value
    await nextTick()
  }).ready

  // Apply an animation to the document element for the transition.
  document.documentElement.animate(
    { clipPath: isDark.value ? clipPath.reverse() : clipPath },
    {
      duration: 300,
      easing: 'ease-in',
      pseudoElement: `::view-transition-${isDark.value ? 'old' : 'new'}(root)`
    }
  )
})

// Destructure the Layout component from the DefaultTheme.
const { Layout } = DefaultTheme
</script>

<template>
  <!-- Use the Layout component as the base for the page. -->
  <Layout>
    <!-- Add the Sidebar component after the default sidebar navigation. -->
    <template #sidebar-nav-after>
      <Sidebar />
    </template>
    <!-- Add the Announcement component before the page content on the home page. -->
    <template #home-hero-prelink>
      <Announcement />
    </template>
    <!-- Display the page content. -->
    <Content />
  </Layout>
</template>

<style>
// Style the view-transition pseudo-elements for smooth transitions between dark and light modes.
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(root),
.dark::view-transition-new(root) {
  z-index: 1;
}

::view-transition-new(root),
.dark::view-transition-old(root) {
  z-index: 9999;
}

// Style the VPSwitchAppearance component.
.VPSwitchAppearance {
  width: 22px !important;
}

// Style the check icon within the VPSwitchAppearance component.
.VPSwitchAppearance .check {
  transform: none !important;
}
</style>
