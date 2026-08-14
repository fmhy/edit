<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Switch from './Switch.vue'

const isOn = ref(false)

const syncState = () => {
  isOn.value = document.documentElement.classList.contains('starred-only')
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

const toggleStarred = (value: boolean) => {
  const root = document.documentElement
  root.classList.toggle('starred-only', value)
  isOn.value = value
}
</script>

<template>
  <Switch v-model="isOn" @update:model-value="toggleStarred" />
</template>

<style>
.starred-only:not(.indexes-only) .vp-doc li:not(.starred) {
  display: none;
}
</style>
