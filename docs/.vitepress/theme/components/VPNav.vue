<script setup lang="ts">
import { useWindowScroll, useWindowSize } from '@vueuse/core'
import { inBrowser, useData } from 'vitepress'
import VPNavBar from 'vitepress/dist/client/theme-default/components/VPNavBar.vue'
import VPNavScreen from 'vitepress/dist/client/theme-default/components/VPNavScreen.vue'
import { useNav } from 'vitepress/dist/client/theme-default/composables/nav'
import { computed, onMounted, provide, ref, watch, watchEffect } from 'vue'

const { isScreenOpen, closeScreen, toggleScreen } = useNav()
const { frontmatter } = useData()

const hasNavbar = computed(() => {
  return frontmatter.value.navbar !== false
})

provide('close-screen', closeScreen)

watchEffect(() => {
  if (inBrowser) {
    document.documentElement.classList.toggle('hide-nav', !hasNavbar.value)
  }
})

// Scroll logic for mobile sticky header
const { y } = useWindowScroll()
const { width } = useWindowSize()
const isHidden = ref(false)

const setMobileNavHidden = (hidden: boolean) => {
  if (!inBrowser) return
  isHidden.value = hidden
  document.documentElement.classList.toggle('vp-nav-shown-mobile', !hidden)
}

const SCROLL_THRESHOLD = 12
let lastNavScrollY = 0

watch(y, (newY) => {
  if (!inBrowser) return

  if (document.documentElement.classList.contains('vp-resizing')) {
    lastNavScrollY = newY
    return
  }

  // If a search scroll-to-match operation is active, lock the navbar state
  if (document.documentElement.classList.contains('vp-search-scrolling')) {
    lastNavScrollY = newY
    return
  }

  if (isScreenOpen.value) {
    setMobileNavHidden(false)
    lastNavScrollY = newY
    return
  }

  // If mobile Table of Contents dropdown is open, do not hide the nav bar.
  // NOTE: This selector depends on VitePress internal DOM structure; update if VitePress changes class names.
  if (document.querySelector('.VPLocalNavOutlineDropdown .items')) {
    lastNavScrollY = newY
    return
  }

  // If at top, show
  if (newY <= 0) {
    setMobileNavHidden(false)
    lastNavScrollY = 0
    return
  }

  // Only apply on mobile (< 960px usually)
  if (width.value < 960) {
    const diff = newY - lastNavScrollY
    if (Math.abs(diff) > SCROLL_THRESHOLD) {
      setMobileNavHidden(diff > 0)
      lastNavScrollY = newY
    }
  } else {
    setMobileNavHidden(false)
  }
})

onMounted(() => {
  setMobileNavHidden(isHidden.value)
  lastNavScrollY = y.value
})

// Watch width to reset if resizing to desktop
watch(width, (newWidth) => {
  if (newWidth >= 960) {
    setMobileNavHidden(false)
    lastNavScrollY = y.value
  }
})
</script>

<template>
  <!-- Spacer to prevent content jump when header is fixed on mobile -->
  <div v-if="hasNavbar" class="vp-nav-spacer"></div>

  <header v-if="hasNavbar" class="VPNav" :class="{ 'nav-hidden': isHidden }">
    <VPNavBar :is-screen-open="isScreenOpen" @toggle-screen="toggleScreen">
      <template #nav-bar-title-before>
        <slot name="nav-bar-title-before" />
      </template>
      <template #nav-bar-title-after>
        <slot name="nav-bar-title-after" />
      </template>
      <template #nav-bar-content-before>
        <slot name="nav-bar-content-before" />
      </template>
      <template #nav-bar-content-after>
        <slot name="nav-bar-content-after" />
      </template>
    </VPNavBar>
    <VPNavScreen :open="isScreenOpen">
      <template #nav-screen-content-before>
        <slot name="nav-screen-content-before" />
      </template>
      <template #nav-screen-content-after>
        <slot name="nav-screen-content-after" />
      </template>
    </VPNavScreen>
  </header>
</template>

<style scoped>
.VPNav {
  position: relative;
  top: var(--vp-layout-top-height, 0px);
  left: 0;
  z-index: var(--vp-z-index-nav);
  width: 100%;
  pointer-events: none;
  transition:
    background-color 0.5s,
    transform 0.25s ease-in-out;
}

@media (min-width: 960px) {
  .VPNav {
    position: fixed;
  }
}

/* Mobile adjustments */
@media (max-width: 959px) {
  .VPNav {
    position: fixed; /* Fix header on mobile */
  }

  .VPNav.nav-hidden {
    transform: translateY(-100%); /* Hide on scroll down */
  }

  .vp-nav-spacer {
    display: block;
    height: var(--vp-nav-height);
  }
}

@media (min-width: 960px) {
  .vp-nav-spacer {
    display: none;
  }
}
</style>

<style>
/* Global override for VPLocalNav on mobile to respect nav visibility */
@media (max-width: 959px) {
  :root.vp-nav-shown-mobile .VPLocalNav {
    top: var(--vp-nav-height) !important;
  }
  .VPLocalNav {
    transition: top 0.25s ease-in-out !important;
  }
}
</style>
