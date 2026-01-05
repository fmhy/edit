<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Switch from './Switch.vue'

const isDisabled = ref(false)
const switchKey = ref(0)

const syncDisabled = () => {
  const root = document.documentElement
  const disabled = root.classList.contains('indexes-only')
  isDisabled.value = disabled

  if (disabled && root.classList.contains('starred-only')) {
    root.classList.remove('starred-only')
    switchKey.value += 1
  }
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
  <Switch
    :key="switchKey"
    :class="{ disabled: isDisabled }"
    @click="toggleStarred()"
  />
</template>

<style>
.starred-only li:not(.starred) {
  display: none;
}
</style>
