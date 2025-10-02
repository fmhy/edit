<script setup lang="ts">
import { colors } from '@fmhy/colors'
import { useStorage, useStyleTag } from '@vueuse/core'
import { watch } from 'vue'

// Add Halloween colors locally
const halloweenColors = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#FF6A00',
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
  950: '#431407'
}

// Extend colors with Halloween theme
const extendedColors = {
  ...colors,
  halloween: halloweenColors
}

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

type ColorNames = keyof typeof extendedColors
const selectedColor = useStorage<ColorNames>('preferred-color', 'swarm')

const colorOptions = Object.keys(extendedColors).filter(
  (key) => typeof extendedColors[key as keyof typeof extendedColors] === 'object'
) as Array<ColorNames>

const { css } = useStyleTag('', { id: 'brand-color' })

const updateThemeColor = (colorName: ColorNames) => {
  const colorSet = extendedColors[colorName]

  const cssVars = colorScales
    .map((scale) => `--vp-c-brand-${scale}: ${colorSet[scale]};`)
    .join('\n    ')

  css.value = `
    :root {
      ${cssVars}
      --vp-c-brand-1: ${colorSet[500]};
      --vp-c-brand-2: ${colorSet[600]};
      --vp-c-brand-3: ${colorSet[800]};
      --vp-c-brand-soft: ${colorSet[400]};
    }

    .dark {
      ${cssVars}
      --vp-c-brand-1: ${colorSet[400]};
      --vp-c-brand-2: ${colorSet[500]};
      --vp-c-brand-3: ${colorSet[700]};
      --vp-c-brand-soft: ${colorSet[300]};
    }
  `
}

// Initialize theme color
updateThemeColor(selectedColor.value)

watch(selectedColor, updateThemeColor)

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
            :style="{ backgroundColor: extendedColors[color][500] }"
          />
        </button>
      </div>
    </div>

    <div class="mt-2 text-sm text-$vp-c-text-2">
      Selected: {{ normalizeColorName(selectedColor) }}
    </div>
  </div>
</template>
