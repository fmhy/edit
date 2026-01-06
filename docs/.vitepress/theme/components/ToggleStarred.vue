<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Switch from './Switch.vue'

const isDisabled = ref(false)
const isOn = ref(false)

const syncState = () => {
  const root = document.documentElement
  isDisabled.value = root.classList.contains('indexes-only')
  isOn.value = root.classList.contains('starred-only')
}

let observer: MutationObserver | undefined

onMounted(() =>
  (observer = new MutationObserver(syncState)).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
)

onMounted(syncState)

onBeforeUnmount(() => observer?.disconnect())

const toggleStarred = (value: boolean) => {
  if (isDisabled.value) {
    isOn.value = document.documentElement.classList.contains('starred-only')
    return
  }

  const root = document.documentElement
  root.classList.toggle('starred-only', value)
  root.dataset.starredWasOn = value ? 'true' : 'false'
  isOn.value = value
}
</script>

<template>
  <Switch
    v-model="isOn"
    :disabled="isDisabled"
    :class="{ disabled: isDisabled }"
    @update:modelValue="toggleStarred"
  />
</template>

<style>
.starred-only li:not(.starred) {
  display: none;
}
</style>
