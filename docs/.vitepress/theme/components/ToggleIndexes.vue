<script setup lang="ts">
import Switch from './Switch.vue'

const toggleIndexes = () =>
  document.documentElement.classList.toggle('indexes-only')
</script>

<template>
  <Switch @click="toggleIndexes()" />
</template>

<style>
.indexes-only li:not(.index) {
  display: none;
}
</style>
