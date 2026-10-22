<script setup lang="ts">
const { frontmatter } = useData()
</script>

<template>
  <a
    v-if="frontmatter.hero.announcement"
    :href="frontmatter.hero.announcement.link"
    class="mb-3 inline-flex items-center rounded-lg bg-[var(--vp-c-default-soft)] px-4 py-1 text-sm font-semibold"
  >
    {{ frontmatter.hero.announcement.title }}
  </a>
</template>
