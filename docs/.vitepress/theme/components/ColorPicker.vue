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
    // Remove Halloween theme and apply other theme with pure black backgrounds (but exclude buttons)
    htmlElement.classList.remove('theme-halloween')
    
    css.value = `
      :root {
        ${cssVars}
        --vp-c-brand-1: ${colorSet[500]};
        --vp-c-brand-2: ${colorSet[600]};
        --vp-c-brand-3: ${colorSet[800]};
        --vp-c-brand-soft: ${colorSet[400]};
        --vp-c-bg: #000000 !important;
        --vp-c-bg-alt: #000000 !important;
        --vp-c-bg-elv: #000000 !important;
        --vp-c-bg-soft: #000000 !important;
      }

      .dark {
        ${cssVars}
        --vp-c-brand-1: ${colorSet[400]};
        --vp-c-brand-2: ${colorSet[500]};
        --vp-c-brand-3: ${colorSet[700]};
        --vp-c-brand-soft: ${colorSet[300]};
        --vp-c-bg: #000000 !important;
        --vp-c-bg-alt: #000000 !important;
        --vp-c-bg-elv: #000000 !important;
        --vp-c-bg-soft: #000000 !important;
      }
      
      /* Main page backgrounds - pure black */
      html, body {
        background-color: #000000 !important;
      }
      
      /* VitePress layout containers - pure black */
      .VPApp, .Layout, .VPContent, .VPHome, .VPHero, #app {
        background-color: #000000 !important;
      }
      
      /* Content areas - pure black */
      .vp-doc, .VPDoc, .content {
        background-color: #000000 !important;
      }
      
      /* Navigation and sidebar backgrounds - pure black */
      .VPNav, .VPSidebar, .VPLocalNav {
        background-color: #000000 !important;
      }
      
      /* Footer - pure black */
      .VPFooter {
        background-color: #000000 !important;
      }
      
      /* EXCLUDE buttons and interactive elements from black background */
      button, 
      .VPButton, 
      .vp-button,
      input[type="button"],
      input[type="submit"],
      .copy-button,
      .nav-link,
      .sidebar-link,
      .pager-link,
      .edit-link,
      .outline-link,
      .search-button,
      [role="button"] {
        background-color: initial !important;
      }
      
      /* Dark mode - same rules */
      .dark html, .dark body {
        background-color: #000000 !important;
      }
      
      .dark .VPApp, .dark .Layout, .dark .VPContent, .dark .VPHome, .dark .VPHero, .dark #app {
        background-color: #000000 !important;
      }
      
      .dark .vp-doc, .dark .VPDoc, .dark .content {
        background-color: #000000 !important;
      }
      
      .dark .VPNav, .dark .VPSidebar, .dark .VPLocalNav {
        background-color: #000000 !important;
      }
      
      .dark .VPFooter {
        background-color: #000000 !important;
      }
      
      /* EXCLUDE buttons in dark mode too */
      .dark button, 
      .dark .VPButton, 
      .dark .vp-button,
      .dark input[type="button"],
      .dark input[type="submit"],
      .dark .copy-button,
      .dark .nav-link,
      .dark .sidebar-link,
      .dark .pager-link,
      .dark .edit-link,
      .dark .outline-link,
      .dark .search-button,
      .dark [role="button"] {
        background-color: initial !important;
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
</template>    </div>
  </div>
</template>
