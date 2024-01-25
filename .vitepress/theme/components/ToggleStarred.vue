<script setup lang="ts">
import Switch from './Switch.vue'

const toggleStarred = () =>
  document.documentElement.classList.toggle('starred-only')
</script>

<template>
  <Switch @click="toggleStarred()" />
</template>

<style>
.starred-only li:not(.starred) {
  display: none;
}
</style>
