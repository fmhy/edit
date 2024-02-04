<script setup lang="ts">
import { useData } from 'vitepress'
import Authors from './components/Authors.vue'

const props = defineProps<{
  authors: string[]
}>()

const formatDate = (raw: string): string => {
  const date = new Date(raw)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

const { frontmatter } = useData()
</script>

<template>
  <h1>{{ frontmatter.title }}</h1>
  <div>{{ frontmatter.description }} • {{ formatDate(frontmatter.date) }}</div>
  <Authors :authors="props.authors" />
</template>
