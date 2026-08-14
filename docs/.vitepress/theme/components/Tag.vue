<script setup lang="ts">
import { useData } from 'vitepress'
import { computed } from 'vue'

const props = defineProps<{
  text: string
  href?: string
  target?: string
}>()

const { isDark } = useData()

function getHashColorFromString(name: string, opacity: number | string = 1) {
  name += 'salt'
  let hash = 0
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const h = hash % 360
  return getHsla(h, opacity)
}

function getHsla(hue: number, opacity: number | string = 1) {
  const saturation = isDark.value ? 50 : 65
  const lightness = isDark.value ? 60 : 40
  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`
}

const formattedText = computed(() => {
  const tag = props.text.replace(/-/g, ' ')
  return tag[0].toUpperCase() + tag.slice(1)
})

const colors = computed(() => {
  return [
    getHashColorFromString(props.text),
    getHashColorFromString(props.text, 0.7),
    getHashColorFromString(props.text, 0.5),
    getHashColorFromString(props.text, 0.2),
    getHashColorFromString(props.text, 0.1)
  ]
})
</script>

<template>
  <a
    v-if="props.href"
    class="feature-tag"
    :href="props.href"
    :target="props.target"
  >
    {{ formattedText }}
  </a>
  <span v-else class="feature-tag">
    {{ formattedText }}
  </span>
</template>

<style scoped>
.feature-tag {
  --uno: 'text-sm px-2 py-.5 rounded-md select-none !decoration-none border border-solid h-max';
  background-color: v-bind('colors[4]');
  color: v-bind('colors[0]') !important;
  border-color: v-bind('colors[3]');
}

.feature-tag:hover {
  background-color: v-bind('colors[3]');
}
</style>
