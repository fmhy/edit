<script setup lang="ts">
import { useData } from 'vitepress'

const { frontmatter } = useData()
</script>

<template>
  <a
    v-if="frontmatter.hero.prelink"
    :href="frontmatter.hero.prelink.link"
    class="inline-flex items-center rounded-lg bg-[var(--vp-c-default-soft)] px-4 py-1 text-sm font-semibold mb-3"
  >
    {{ frontmatter.hero.prelink.title }}
  </a>
</template>
