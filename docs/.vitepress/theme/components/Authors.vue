<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  authors: string[]
}>()

interface Author {
  name: string
  github: string
}

const data = [
  {
    name: 'nbats',
    github: 'https://github.com/nbats'
  },
  {
    name: 'Kai',
    github: 'https://github.com/Kai-FMHY'
  },
  {
    name: 'taskylizard',
    github: 'https://github.com/taskylizard'
  },
  {
    name: 'zinklog',
    github: 'https://github.com/zinklog2'
  },
  {
    name: 'Q',
    github: 'https://github.com/qiracy'
  }
] satisfies Author[]

const authors = computed(() =>
  data.filter((author) => props.authors.includes(author.name))
)
</script>

<template>
  <div class="flex flex-wrap gap-4 pt-2">
    <div v-for="(c, index) of authors" class="flex items-center gap-2">
      <img :src="`${c.github}.png`" class="h-8 w-8 rounded-full" />
      <a :href="c.github">{{ c.name }}</a>
      <span v-if="index < authors.length - 1">•</span>
    </div>
  </div>
</template>
