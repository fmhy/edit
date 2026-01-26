<script setup lang="ts">
import { useData } from 'vitepress'
import { inBrowser } from 'vitepress'
import { computed, provide, watchEffect, ref, watch, onMounted } from 'vue'
import { useNav } from 'vitepress/dist/client/theme-default/composables/nav'
import VPNavBar from 'vitepress/dist/client/theme-default/components/VPNavBar.vue'
import VPNavScreen from 'vitepress/dist/client/theme-default/components/VPNavScreen.vue'
import { useWindowScroll, useWindowSize } from '@vueuse/core'

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

const updateMobileNavClass = (hidden: boolean) => {
    if (!inBrowser) return
    if (hidden) {
        document.documentElement.classList.remove('vp-nav-shown-mobile')
    } else {
        document.documentElement.classList.add('vp-nav-shown-mobile')
    }
}

watch(y, (newY, oldY) => {
  if (!inBrowser) return
  
  // If at top, show
  if (newY <= 0) {
    isHidden.value = false
    updateMobileNavClass(false)
    return
  }
  
  // Only apply on mobile (< 960px usually)
  if (width.value < 960) {
    if (newY > oldY) {
      // Scrolling down -> hide
      isHidden.value = true
      updateMobileNavClass(true)
    } else {
      // Scrolling up -> show
      isHidden.value = false
      updateMobileNavClass(false)
    }
  } else {
     isHidden.value = false
     updateMobileNavClass(false)
  }
})

onMounted(() => {
    updateMobileNavClass(isHidden.value)
})

// Watch width to reset if resizing to desktop
watch(width, (newWidth) => {
    if(newWidth >= 960) {
        isHidden.value = false
        updateMobileNavClass(false)
    }
})

</script>

<template>
  <!-- Spacer to prevent content jump when header is fixed on mobile -->
  <div v-if="hasNavbar" class="vp-nav-spacer"></div>

  <header v-if="hasNavbar" class="VPNav" :class="{ 'nav-hidden': isHidden }">
    <VPNavBar :is-screen-open="isScreenOpen" @toggle-screen="toggleScreen">
      <template #nav-bar-title-before><slot name="nav-bar-title-before" /></template>
      <template #nav-bar-title-after><slot name="nav-bar-title-after" /></template>
      <template #nav-bar-content-before><slot name="nav-bar-content-before" /></template>
      <template #nav-bar-content-after><slot name="nav-bar-content-after" /></template>
    </VPNavBar>
    <VPNavScreen :open="isScreenOpen">
      <template #nav-screen-content-before><slot name="nav-screen-content-before" /></template>
      <template #nav-screen-content-after><slot name="nav-screen-content-after" /></template>
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
  transition: background-color 0.5s, transform 0.25s ease-in-out;
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

/* Ensure Nav Screen is visible above everything else when open */
:deep(.VPNav.screen-open) {
    z-index: var(--vp-z-index-nav) !important;
}
/* When screen is open, disable the hide transform so it doesn't fly away if they scroll */
:global(.VPNav:has(.VPNavScreen[style*="display: block"])) { 
    transform: none !important;
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
