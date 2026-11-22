<script setup lang="ts">
import { useData } from 'vitepress'
import { computed } from 'vue'
import { nfoArt } from './nfoArt'

const { frontmatter, page } = useData()

const isHome = computed(
  () =>
    Boolean(frontmatter.value.isHome ?? frontmatter.value.layout === 'home') ||
    page.value.relativePath === 'index.md'
)
</script>

<template>
  <section
    v-if="isHome"
    class="nfo-banner is-home nfo-only"
    aria-label="FMHY NFO header"
  >
    <div class="nfo-canopy" aria-hidden="true" />
    <div class="nfo-art-wrap">
      <pre class="nfo-art" aria-hidden="true">{{ nfoArt }}</pre>
    </div>
    <div class="nfo-presents" aria-hidden="true">
      <span class="nfo-presents-dither" />
      <span class="nfo-presents-label">p r e s e n t s</span>
      <span class="nfo-presents-dither" />
    </div>
    <div class="nfo-wave-divider" aria-hidden="true" />
  </section>
</template>
