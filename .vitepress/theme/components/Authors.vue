[
  {
    "name": "nbats",
    "github": "https://github.com/nbats"
  },
  {
    "name": "Kai",
    "github": "https://github.com/Kai-FMHY"
  },
  {
    "name": "taskylizard",
    "github": "https://github.com/taskylizard"
  },
  {
    "name": "zinklog",
    "github": "https://github.com/zinklog2"
  },
  {
    "name": "Q",
    "github": "https://github.com/qiracy"
  }
]


<script setup lang="ts">
import { computed, withDefaults } from 'vue'
import authorsData from './authors.json'

interface Author {
  name: string
  github: `https://github.com/${string}`
}

const props = withDefaults(defineProps<{
  authors?: string[]
}>(), {
  authors: () => []
})

const authors = computed(() =>
  authorsData.filter((author: Author) => props.authors.includes(author.name))
)
</script>

<template>
  <div class="flex flex-wrap gap-4 pt-2">
    <div v-for="(c, index) of authors" :key="c.github" class="flex gap-2 items-center">
      <img :src="`${c.github}.png`" class="w-8 h-8 rounded-full" />
      <a :href="c.github">{{ c.name }}</a>
      <span v-if="index < authors.length - 1">•</span>
    </div>
  </div>
</template>

<style scoped>
.flex {
  display: flex;
}

.flex-wrap {
  flex-wrap: wrap;
}

.gap-4 {
  gap: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}

.items-center {
  align-items: center;
}

.w-8 {
  width: 2rem;
}

.h-8 {
  height: 2rem;
}

.rounded-full {
  border-radius: 50%;
}
</style>
