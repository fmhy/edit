<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Switch from './Switch.vue'

const isOn = ref(false)

const syncState = () => {
  isOn.value = document.documentElement.classList.contains('indexes-only')
}

let observer: MutationObserver | undefined

onMounted(() =>
  (observer = new MutationObserver(syncState)).observe(
    document.documentElement,
    {
      attributes: true,
      attributeFilter: ['class']
    }
  )
)

onMounted(syncState)

onBeforeUnmount(() => observer?.disconnect())

const toggleIndexes = (value: boolean) => {
  const root = document.documentElement
  root.classList.toggle('indexes-only', value)
  isOn.value = value
}
</script>

<template>
  <Switch v-model="isOn" @update:model-value="toggleIndexes" />
</template>

<style>
.indexes-only:not(.starred-only) .vp-doc li:not(.index) {
  display: none;
}

.starred-only.indexes-only .vp-doc li:not(.starred):not(.index) {
  display: none;
}
</style>
