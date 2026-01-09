<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Switch from './Switch.vue'

const isDisabled = ref(false)
const isOn = ref(false)

const syncState = () => {
  const root = document.documentElement
  isDisabled.value = root.classList.contains('starred-only')
  isOn.value = root.classList.contains('indexes-only')
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

const toggleIndexes = (value: boolean) => {
  if (isDisabled.value) {
    isOn.value = document.documentElement.classList.contains('indexes-only')
    return
  }

  const root = document.documentElement
  const enabling = value
  const wasStarred = root.classList.contains('starred-only')

  root.classList.toggle('indexes-only', enabling)

  if (enabling) {
    root.dataset.starredWasOn = wasStarred ? 'true' : 'false'

    if (wasStarred) {
      root.classList.remove('starred-only')
    }
  } else {
    if (root.dataset.starredWasOn === 'true') {
      root.classList.add('starred-only')
    }

    delete root.dataset.starredWasOn
  }

  isOn.value = enabling
}
</script>

<template>
  <Switch v-model="isOn" 
    :disabled="isDisabled"
    :class="{ disabled: isDisabled }"@update:modelValue="toggleIndexes" />
</template>

<style>
.indexes-only .vp-doc li:not(.index) {
  display: none;
}
</style>
