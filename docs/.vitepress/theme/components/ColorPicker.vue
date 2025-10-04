<script setup lang="ts">
import { colors } from '@fmhy/colors'
import { useStorage, useStyleTag } from '@vueuse/core'
import { watch, onMounted } from 'vue'

// Add Halloween colors
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

// hall extend or something
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
const selectedColor = useStorage<ColorNames>('preferred-color', 'halloween')

const colorOptions = Object.keys(extendedColors).filter(
  (key) => typeof extendedColors[key as keyof typeof extendedColors] === 'object'
) as Array<ColorNames>

const { css } = useStyleTag('', { id: 'brand-color' })

const updateThemeColor = (colorName: ColorNames) => {
  const colorSet = extendedColors[colorName]

  const cssVars = colorScales
    .map((scale) => `--vp-c-brand-${scale}: ${colorSet[scale]};`)
    .join('\n    ')

  const htmlElement = document.documentElement
  
  if (colorName === 'halloween') {
    // Apply Halloween theme
    htmlElement.classList.add('theme-halloween')
    
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
  } else {
    // Remove Halloween theme and apply other theme with normal backgrounds
    htmlElement.classList.remove('theme-halloween')
    
    css.value = `
      :root {
        ${cssVars}
        --vp-c-brand-1: ${colorSet[500]};
        --vp-c-brand-2: ${colorSet[600]};
        --vp-c-brand-3: ${colorSet[800]};
        --vp-c-brand-soft: ${colorSet[400]};
        --vp-c-bg: #ffffff !important;
        --vp-c-bg-alt: #f9f9f9 !important;
        --vp-c-bg-elv: rgba(255, 255, 255, 0.7) !important;
        --vp-c-bg-soft: #f9f9f9 !important;
      }

      .dark {
        ${cssVars}
        --vp-c-brand-1: ${colorSet[400]};
        --vp-c-brand-2: ${colorSet[500]};
        --vp-c-brand-3: ${colorSet[700]};
        --vp-c-brand-soft: ${colorSet[300]};
        --vp-c-bg: rgb(26, 26, 26) !important;
        --vp-c-bg-alt: rgb(23, 23, 23) !important;
        --vp-c-bg-elv: rgba(23, 23, 23, 0.8) !important;
        --vp-c-bg-soft: rgb(23, 23, 23) !important;
      }
      
      body {
        background-color: #ffffff !important;
      }
      
      .VPApp, .Layout, .VPContent, .VPHome, .VPHero, #app {
        background-color: #ffffff !important;
      }
      
      .dark body {
        background-color: rgb(26, 26, 26) !important;
      }
      
      .dark .VPApp, .dark .Layout, .dark .VPContent, .dark .VPHome, .dark .VPHero, .dark #app {
        background-color: rgb(26, 26, 26) !important;
      }
    `
  }
}

// Set Halloween theme ASAP if its the pref
const storedTheme = localStorage.getItem('preferred-color')
if (!storedTheme || storedTheme === '"halloween"') {
  document.documentElement.classList.add('theme-halloween')
}

// Initialize theme color
updateThemeColor(selectedColor.value)

// halloween stuff
onMounted(() => {
  if (selectedColor.value === 'halloween') {
    document.documentElement.classList.add('theme-halloween')
  }
  // Re-apply the theme to ensure everything is initialized
  updateThemeColor(selectedColor.value)
})

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
            v-if="color === 'halloween'"
            class="inline-block w-6 h-6 flex items-center justify-center text-xl"
          >
            🎃
          </span>
          <span
            v-else
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
