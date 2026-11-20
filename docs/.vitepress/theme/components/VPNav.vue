<script setup lang="ts">
import { inBrowser, useData } from 'vitepress'
import VPNavBar from 'vitepress/dist/client/theme-default/components/VPNavBar.vue'
import VPNavScreen from 'vitepress/dist/client/theme-default/components/VPNavScreen.vue'
import { useNav } from 'vitepress/dist/client/theme-default/composables/nav'
import { computed, onMounted, provide, watchEffect } from 'vue'

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

// The navbar stays pinned on mobile so the search button is always reachable;
// this flag keeps the local nav offset in sync with it.
onMounted(() => {
  if (inBrowser) {
    document.documentElement.classList.add('vp-nav-shown-mobile')
  }
})
</script>

<template>
  <!-- Spacer to prevent content jump when header is fixed on mobile -->
  <div v-if="hasNavbar" class="vp-nav-spacer"></div>

  <header v-if="hasNavbar" class="VPNav">
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
  transition: background-color 0.5s;
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
