<script setup lang="ts">
import { colors } from '@fmhy/colors'
import { useStorage, useColorMode } from '@vueuse/core'
import { watch, onMounted } from 'vue'

const colorScales = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950'
] as const

type ColorNames = keyof typeof colors
const selectedColor = useStorage<ColorNames>('preferred-color', 'swarm')

const colorOptions = Object.keys(colors).filter(
  (key) => typeof colors[key as keyof typeof colors] === 'object'
) as Array<ColorNames>

// Get the dark mode reactive variable
const { store: darkMode } = useColorMode()

const updateThemeAttribute = (colorName: ColorNames) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', colorName)
  }
}

// Initialize theme attribute and watch for changes
onMounted(() => {
  updateThemeAttribute(selectedColor.value)
})

watch(selectedColor, (newColor) => {
  updateThemeAttribute(newColor)
})

// Watch for dark mode changes to re-apply data-theme if needed,
// though UnoCSS preflights should handle this.
// This is more of a safeguard or if specific overrides might be needed later.
watch(darkMode, () => {
  updateThemeAttribute(selectedColor.value)
})

const normalizeColorName = (colorName: string) =>
  colorName.replaceAll(/-/g, ' ').charAt(0).toUpperCase() +
  colorName.slice(1).replaceAll(/-/g, ' ')
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-2">
      <div v-for="color in colorOptions" :key="color">
        <button
          :class="[
            'inline-block w-6 h-6 rounded-full transition-all duration-200'
          ]"
          @click="selectedColor = color"
          :title="normalizeColorName(color)"
        >
          <span
            class="inline-block w-6 h-6 rounded-full"
            :style="{ backgroundColor: colors[color][500] }"
          />
        </button>
      </div>
    </div>

    <div class="mt-2 text-sm text-$vp-c-text-2">
      Selected: {{ normalizeColorName(selectedColor) }}
    </div>
  </div>
</template>
