<script setup lang="ts">
import { colors } from '@fmhy/colors'
import { useStorage, useStyleTag } from '@vueuse/core'
import { watch, onMounted } from 'vue'
import Switch from './Switch.vue'

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
const isAmoledMode = useStorage('amoled-mode', false)

const colorOptions = Object.keys(colors).filter(
  (key) => typeof colors[key as keyof typeof colors] === 'object'
) as Array<ColorNames>

const { css } = useStyleTag('', { id: 'brand-color' })

const updateThemeColor = (colorName: ColorNames, amoledEnabled: boolean) => {
  const colorSet = colors[colorName]

  const cssVars = colorScales
    .map((scale) => `--vp-c-brand-${scale}: ${colorSet[scale]};`)
    .join('\n    ')

  const htmlElement = document.documentElement
  
  if (amoledEnabled) {
    htmlElement.classList.add('theme-amoled')
  } else {
    htmlElement.classList.remove('theme-amoled')
  }
  
  const darkBg = amoledEnabled ? '#000000' : 'rgb(26, 26, 26)'
  const darkBgAlt = amoledEnabled ? '#000000' : 'rgb(23, 23, 23)'
  const darkBgElv = amoledEnabled ? 'rgba(0, 0, 0, 0.9)' : 'rgba(23, 23, 23, 0.8)'
  const darkBgSoft = amoledEnabled ? '#000000' : 'rgb(23, 23, 23)'
  
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
      --vp-c-bg: ${darkBg} !important;
      --vp-c-bg-alt: ${darkBgAlt} !important;
      --vp-c-bg-elv: ${darkBgElv} !important;
      --vp-c-bg-soft: ${darkBgSoft} !important;
    }
    
    html, body {
      background-color: #ffffff !important;
    }
    
    .VPApp, .Layout, .VPContent, .VPHome, .VPHero, #app, .vp-doc {
      background-color: #ffffff !important;
    }
    
    .dark html, .dark body {
      background-color: ${darkBg} !important;
    }
    
    .dark .VPApp, .dark .Layout, .dark .VPContent, .dark .VPHome, .dark .VPHero, .dark #app, .dark .vp-doc {
      background-color: ${darkBg} !important;
    }
  `
}

onMounted(() => {
  if (isAmoledMode.value) {
    document.documentElement.classList.add('theme-amoled')
  }
  
  // Re-apply the theme to ensure everything is initialized
  updateThemeColor(selectedColor.value, isAmoledMode.value)
})

watch([selectedColor, isAmoledMode], ([color, amoled]) => {
  updateThemeColor(color, amoled)
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
          :class=" [
            'inline-block w-6 h-6 rounded-full transition-all duration-200'
          ]"
          @click="selectedColor = color"
          :title="normalizeColorName(color)"
        >
          <span
            class="inline-block w-6 h-6 rounded-full"
            :style="{ backgroundColor: colors[color][500] }"
          ></span>
        </button>
      </div>
    </div>

    <div class="mt-2 text-sm text-$vp-c-text-2">
      Selected: {{ normalizeColorName(selectedColor) }}
    </div>
    
    <!-- AMOLED toggle -->
    <div class="mt-4 flex items-center gap-2">
      <span class="text-sm text-$vp-c-text-2">AMOLED</span>
      <Switch v-model="isAmoledMode" @click="isAmoledMode = !isAmoledMode" />
    </div>
  </div>
</template>
