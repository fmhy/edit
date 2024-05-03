<script setup lang="ts">
// Import the 'useData' function from 'vitepress'
import { useData } from 'vitepress'

// Use destructuring to extract 'frontmatter' from the data returned by 'useData'
const { frontmatter } = useData()
</script>

<template>
  <!-- Check if 'frontmatter.hero.prelink' exists -->
  <a
    v-if="frontmatter.hero.prelink"
    <!-- Assign the value of 'frontmatter.hero.prelink.link' to the 'href' attribute -->
    :href="frontmatter.hero.prelink.link"
    <!-- Apply the 'inline-flex' and 'items-center' classes to the element -->
    class="inline-flex items-center rounded-lg bg-[var(--vp-c-default-soft)] px-4 py-1 text-sm font-semibold mb-3"
  >
    <!-- Display the value of 'frontmatter.hero.prelink.title' -->
    {{ frontmatter.hero.prelink.title }}
  </a>
</template>

