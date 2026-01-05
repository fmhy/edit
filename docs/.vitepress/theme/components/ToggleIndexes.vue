<script setup lang="ts">
import Switch from './Switch.vue'

const toggleIndexes = () => {
  const root = document.documentElement
  const enabling = !root.classList.contains('indexes-only')
  root.classList.toggle('indexes-only')

  if (enabling && root.classList.contains('starred-only')) {
    root.classList.remove('starred-only')
  }
}
</script>

<template>
  <Switch @click="toggleIndexes()" />
</template>

<style>
.indexes-only li:not(.index) {
  display: none;
}
</style>
