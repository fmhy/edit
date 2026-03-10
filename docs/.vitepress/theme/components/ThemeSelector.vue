<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../themes/themeHandler'
import { themeRegistry } from '../themes/configs'

const { themeName, setTheme, getAvailableThemes, state, mode } = useTheme()

const availableThemes = computed(() => getAvailableThemes())

const getThemePreview = (name: string) => {
  const theme = themeRegistry[name]
  if (theme?.preview) {
    return theme.preview
  }
  // Fallback: create gradient from theme's brand colors if they exist
  const modeKey = (mode && (mode as any).value) ? (mode as any).value : 'light'
  const colors = modeKey === 'dark' ? theme?.modes.dark : theme?.modes.light
  
  if (colors?.brand && colors.brand[1] && colors.brand[2] && colors.brand[3]) {
    return `linear-gradient(135deg, ${colors.brand[1]} 0%, ${colors.brand[2]} 50%, ${colors.brand[3]} 100%)`
  }
  
  return 'linear-gradient(135deg, var(--vp-c-brand-1) 0%, var(--vp-c-brand-2) 100%)'
}

const normalizeThemeName = (name: string) =>
  name.replaceAll(/-/g, ' ').charAt(0).toUpperCase() +
  name.slice(1).replaceAll(/-/g, ' ')

const currentDisplayName = computed(() => {
  const t = themeName && (themeName as any).value ? (themeName as any).value : ''
  if (!t) return 'Default'
  const cfg = themeRegistry[t]
  if (cfg && cfg.displayName) return cfg.displayName
  // fallback: humanize the key
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
