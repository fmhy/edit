<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Switch from './Switch.vue'

const isDisabled = ref(false)

const syncDisabled = () => {
  isDisabled.value = document.documentElement.classList.contains('indexes-only')
}

let observer: MutationObserver | undefined

onMounted(() =>
  (observer = new MutationObserver(syncDisabled)).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
)

onMounted(syncDisabled)

onBeforeUnmount(() => observer?.disconnect())

const toggleStarred = () => {
  if (isDisabled.value) return
  document.documentElement.classList.toggle('starred-only')
}
</script>

<template>
  <Switch :class="{ disabled: isDisabled }" @click="toggleStarred()" />
</template>

<style>
.starred-only li:not(.starred) {
  display: none;
}
</style>
