<script setup lang="ts">
import { computed } from 'vue'
import { themeRegistry } from '../themes/configs'
import { useTheme } from '../themes/themeHandler'

const { themeName } = useTheme()

const normalizeThemeName = (name: string) =>
  name.replaceAll(/-/g, ' ').charAt(0).toUpperCase() +
  name.slice(1).replaceAll(/-/g, ' ')

const currentDisplayName = computed(() => {
  const t = themeName.value || ''
  if (!t) return 'Default'
  const cfg = themeRegistry[t]
  if (cfg && cfg.displayName) return cfg.displayName
  return normalizeThemeName(t)
})
</script>

<template>
  <div>
    <div class="text-sm text-$vp-c-text-2">
      <span class="font-medium">Theme:</span>
      <span class="ml-1">{{ currentDisplayName }}</span>
    </div>
  </div>
</template>
