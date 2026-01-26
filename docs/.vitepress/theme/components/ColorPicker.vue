<script setup lang="ts">
import { colors } from '@fmhy/colors'
import { useStorage } from '@vueuse/core'
import { watch, onMounted, nextTick, ref, computed } from 'vue'
import { useData } from 'vitepress'
import { useTheme } from '../themes/themeHandler'
import { themeRegistry } from '../themes/configs'
import type { Theme } from '../themes/types'
import CustomColorSelector from './CustomColorSelector.vue'
import tinycolor from 'tinycolor2'

type ColorNames = keyof typeof colors
const selectedColor = useStorage<ColorNames>('preferred-color', 'swarm')

const { frontmatter, page } = useData()

const showPalette = computed(() => {
  // console.log('Current layout:', frontmatter.value.layout)
  // console.log('Page relative path:', page.value.relativePath)
  return frontmatter.value.layout !== 'home' && page.value.relativePath !== 'index.md'
})

// Use the theme system
const { amoledEnabled, setAmoledEnabled, setTheme, setMode, mode, themeName, restorePreviousMode } = useTheme()

// Custom color selector state
const showCustomColorSelector = ref(false)

const colorOptions = Object.keys(colors).filter(
  (key) => typeof colors[key as keyof typeof colors] === 'object'
) as Array<ColorNames>

// Preset themes (exclude dynamically generated color- themes)
const presetThemeNames = Object.keys(themeRegistry).filter((k) => !k.startsWith('color-'))

const getThemePreviewStyle = (name: string) => {
  const theme = themeRegistry[name]
  if (!theme) return {}
  const modeKey = (mode && (mode as any).value) ? (mode as any).value as keyof typeof theme.modes : 'light'
  const modeColors = theme.modes[modeKey]

  if (theme.preview) {
    // If preview is a URL or gradient, use it directly
    if (theme.preview.startsWith('http') || theme.preview.startsWith('data:')) {
      return { backgroundImage: `url(${theme.preview})`, backgroundSize: 'cover' }
    }
    return { background: theme.preview }
  }

  if (modeColors?.brand && modeColors.brand[1] && modeColors.brand[2]) {
    return {
      background: `linear-gradient(135deg, ${modeColors.brand[1]} 0%, ${modeColors.brand[2]} 100%)`
    }
  }

  // Fallback to CSS var brand if present
  return { background: 'var(--vp-c-brand-1)' }
}

const generateThemeFromColor = (colorName: ColorNames): Theme => {
  const colorSet = colors[colorName]
  
  return {
    name: `color-${colorName}`,
    displayName: normalizeColorName(colorName),
    modes: {
      light: {
        brand: {
          1: colorSet[500],
          2: colorSet[600],
          3: colorSet[800],
          soft: colorSet[400]
        },
        bg: '#f8fafc',
        bgAlt: '#eef2f5',
        bgElv: 'rgba(255, 255, 255, 0.8)',
        bgMark: 'rgb(226, 232, 240)',
        text: {
          1: '#0f172a',
          2: '#334155',
          3: '#64748b'
        },
        button: {
          brand: {
            bg: colorSet[500],
            border: colorSet[400],
            text: 'rgba(255, 255, 255)',
            hoverBorder: colorSet[400],
            hoverText: 'rgba(255, 255, 255)',
            hoverBg: colorSet[400],
            activeBorder: colorSet[400],
            activeText: 'rgba(255, 255, 255)',
            activeBg: colorSet[500]
          },
          alt: {
            bg: '#484848',
            text: '#f0eeee',
            hoverBg: '#484848',
            hoverText: '#f0eeee'
          }
        },
        customBlock: {
          info: {
            bg: `${colorSet[100]}`,
            border: `${colorSet[800]}`,
            text: `${colorSet[800]}`,
            textDeep: `${colorSet[900]}`
          },
          tip: {
            bg: '#D8F8E4',
            border: '#447A61',
            text: '#2D6A58',
            textDeep: '#166534'
          },
          warning: {
            bg: '#FCEFC3',
            border: '#9A8034',
            text: '#9C701B',
            textDeep: '#92400e'
          },
          danger: {
            bg: '#FBE1E2',
            border: '#B3565E',
            text: '#912239',
            textDeep: '#991b1b'
          }
        },
        selection: {
          bg: colorSet[200]
        },
        home: {
          heroNameColor: 'transparent',
          heroNameBackground: '-webkit-linear-gradient(120deg, #c4b5fd 30%, #7bc5e4)',
          heroImageBackground: 'linear-gradient(-45deg, #c4b5fd 50%, #47caff 50%)',
          heroImageFilter: 'blur(44px)'
        }
      },
      dark: {
        brand: {
          1: colorSet[400],
          2: colorSet[500],
          3: colorSet[600],
          soft: colorSet[300]
        },
        bg: '#1A1A1A',
        bgAlt: '#171717',
        bgElv: '#1a1a1acc',
        button: {
          brand: {
            bg: colorSet[400],
            border: colorSet[300],
            text: 'rgba(15, 23, 42)',
            hoverBorder: colorSet[300],
            hoverText: 'rgba(15, 23, 42)',
            hoverBg: colorSet[300],
            activeBorder: colorSet[300],
            activeText: 'rgba(15, 23, 42)',
            activeBg: colorSet[400]
          },
          alt: {
            bg: '#484848',
            text: '#f0eeee',
            hoverBg: '#484848',
            hoverText: '#f0eeee'
          }
        },
        customBlock: {
          info: {
            bg: `${colorSet[950]}`,
            border: `${colorSet[700]}`,
            text: `${colorSet[200]}`,
            textDeep: `${colorSet[200]}`
          },
          tip: {
            bg: '#0C2A20',
            border: '#184633',
            text: '#B0EBC9',
            textDeep: '#166534'
          },
          warning: {
            bg: '#403207',
            border: '#7E6211',
            text: '#F9DE88',
            textDeep: '#92400e'
          },
          danger: {
            bg: '#3F060A',
            border: '#7C0F18',
            text: '#F7C1BC',
            textDeep: '#991b1b'
          }
        },
        selection: {
          bg: colorSet[800]
        },
        home: {
          heroNameColor: 'transparent',
          heroNameBackground: '-webkit-linear-gradient(120deg, #c4b5fd 30%, #7bc5e4)',
          heroImageBackground: 'linear-gradient(-45deg, #c4b5fd 50%, #47caff 50%)',
          heroImageFilter: 'blur(44px)'
        }
      }
    }
  }
}

const normalizeColorName = (colorName: string) =>
  colorName.replaceAll(/-/g, ' ').charAt(0).toUpperCase() +
  colorName.slice(1).replaceAll(/-/g, ' ')

onMounted(async () => {
  // Check if custom theme was last selected
  const savedTheme = localStorage.getItem('vitepress-theme-name')
  
  if (savedTheme === 'custom') {
    // Load saved custom colors
    const savedLinkColor = localStorage.getItem('custom-theme-link-color') || '#ffffff'
    const savedTextColor = localStorage.getItem('custom-theme-text-color') || '#cccccc'
    const savedBgColor = localStorage.getItem('custom-theme-bg-color') || '#000000'
    
    // Apply the custom theme
    applyCustomColors({ link: savedLinkColor, text: savedTextColor, background: savedBgColor })
  } else if (selectedColor.value) {
    // apply saved color theme on load
    const theme = generateThemeFromColor(selectedColor.value)
    themeRegistry[`color-${selectedColor.value}`] = theme
    await nextTick()
    setTheme(`color-${selectedColor.value}`)
  }
  
  // Wait for next tick to ensure theme handler is fully initialized
  await nextTick()
})

watch(selectedColor, async (color) => {
  if (!color) return;
  // Restore previous mode when switching away from custom
  restorePreviousMode()
  const theme = generateThemeFromColor(color)
  themeRegistry[`color-${color}`] = theme
  await nextTick()
  setTheme(`color-${color}`)
})



const openCustomColorSelector = () => {
  showCustomColorSelector.value = true
}

const applyCustomColors = (colors: { link: string; text: string; background: string }) => {
  // Store custom colors  
  const customLinkColor = useStorage('custom-theme-link-color', colors.link)
  const customTextColor = useStorage('custom-theme-text-color', colors.text)
  const customBgColor = useStorage('custom-theme-bg-color', colors.background)
  
  customLinkColor.value = colors.link
  customTextColor.value = colors.text
  customBgColor.value = colors.background
  
  // Create lighter versions of background for cards
  // Increase lightening to make cards more distinct
  const lightenedBg = tinycolor(colors.background).lighten(10).toString()
  const lightenedBgAlt = tinycolor(colors.background).lighten(15).toString()
  
  // Generate a custom theme - link color for links, text color for body text
  const customTheme: Theme = {
    name: 'custom',
    displayName: 'Custom',
    preview: colors.background,
    modes: {
      light: {
        brand: {
          1: colors.link,  // Links will use this color
          2: colors.link,
          3: colors.link,
          soft: colors.link
        },
        bg: colors.background,
        bgAlt: lightenedBg,
        bgElv: lightenedBgAlt,
        text: {
          1: colors.text,  // Body text uses this color
          2: colors.text,
          3: colors.text
        },
        button: {
          brand: {
            bg: colors.link,
            border: colors.link,
            text: colors.background,
            hoverBorder: colors.link,
            hoverText: colors.background,
            hoverBg: colors.link,
            activeBorder: colors.link,
            activeText: colors.background,
            activeBg: colors.link
          },
          alt: {
            bg: '#484848',
            text: '#f0eeee',
            hoverBg: '#484848',
            hoverText: '#f0eeee'
          }
        },
        customBlock: {
          info: {
            bg: colors.background,
            border: colors.link,
            text: colors.text,
            textDeep: colors.text
          },
          tip: {
            bg: '#D8F8E4',
            border: '#447A61',
            text: '#2D6A58',
            textDeep: '#166534'
          },
          warning: {
            bg: '#FCEFC3',
            border: '#9A8034',
            text: '#9C701B',
            textDeep: '#92400e'
          },
          danger: {
            bg: '#FBE1E2',
            border: '#B3565E',
            text: '#912239',
            textDeep: '#991b1b'
          }
        },
        selection: {
          bg: colors.link
        },
        home: {
          heroNameColor: colors.link,
          heroNameBackground: colors.background,
          heroImageBackground: `linear-gradient(135deg, ${colors.background} 0%, ${colors.link} 100%)`,
          heroImageFilter: 'blur(44px)'
        }
      },
      dark: {
        brand: {
          1: colors.link,  // Links will use this color
          2: colors.link,
          3: colors.link,
          soft: colors.link
        },
        bg: colors.background,
        bgAlt: lightenedBg,
        bgElv: lightenedBgAlt,
        text: {
          1: colors.text,  // Body text uses this color
          2: colors.text,
          3: colors.text
        },
        button: {
          brand: {
            bg: colors.link,
            border: colors.link,
            text: colors.background,
            hoverBorder: colors.link,
            hoverText: colors.background,
            hoverBg: colors.link,
            activeBorder: colors.link,
            activeText: colors.background,
            activeBg: colors.link
          },
          alt: {
            bg: '#484848',
            text: '#f0eeee',
            hoverBg: '#484848',
            hoverText: '#f0eeee'
          }
        },
        customBlock: {
          info: {
            bg: colors.background,
            border: colors.link,
            text: colors.text,
            textDeep: colors.text
          },
          tip: {
            bg: '#0C2A20',
            border: '#184633',
            text: '#B0EBC9',
            textDeep: '#166534'
          },
          warning: {
            bg: '#403207',
            border: '#7E6211',
            text: '#F9DE88',
            textDeep: '#92400e'
          },
          danger: {
            bg: '#3F060A',
            border: '#7C0F18',
            text: '#F7C1BC',
            textDeep: '#991b1b'
          }
        },
        selection: {
          bg: colors.link
        },
        home: {
          heroNameColor: colors.link,
          heroNameBackground: colors.background,
          heroImageBackground: `linear-gradient(135deg, ${colors.background} 0%, ${colors.link} 100%)`,
          heroImageFilter: 'blur(44px)'
        }
      }
    }
  }
  
  // Register and apply the custom theme
  themeRegistry['custom'] = customTheme
  selectedColor.value = '' as ColorNames
  setTheme('custom')
  // Auto-set custom mode
  setMode('custom')
}

</script>

<template>
  <div>
    <div class="flex flex-wrap gap-2">
      <!-- Color picker generated themes (render first) -->
      <div v-for="color in colorOptions" :key="color">
        <button
          :class="[
            'inline-block w-6 h-6 rounded-full transition-all duration-200 border-2',
            (themeName === `color-${color}`)
              ? 'border-slate-200 dark:border-slate-400 shadow-lg'
              : 'border-transparent'
          ]"
          @click="selectedColor = color"
          :title="normalizeColorName(color)"
        >
          <span
            class="inline-block w-full h-full rounded-full"
            :style="{ backgroundColor: colors[color][500], backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }"
          ></span>
        </button>
      </div>

      <!-- Preset themes (render at the end) -->
      <div v-for="t in presetThemeNames" :key="t">
        <button
          :class="[
            'inline-block w-6 h-6 rounded-full transition-all duration-200 border-2',
            (themeName === t)
              ? 'border-slate-200 dark:border-slate-400 shadow-lg'
              : 'border-transparent'
          ]"
          @click="selectedColor = '' as ColorNames; restorePreviousMode(); setTheme(t)"
          :title="themeRegistry[t].displayName"
        >
          <span
            class="inline-block w-full h-full rounded-full"
            :style="Object.assign({ backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }, getThemePreviewStyle(t))"
          ></span>
        </button>
      </div>

      <!-- Custom theme button (after preset themes) -->
      <div v-if="showPalette">
        <button
          :class="[
            'inline-block w-6 h-6 rounded-full transition-all duration-200 border-2 relative overflow-hidden',
            (themeName === 'custom')
              ? 'border-slate-200 dark:border-slate-400 shadow-lg'
              : 'border-transparent'
          ]"
          @click="openCustomColorSelector"
          title="Custom Theme"
        >
          <span
            class="inline-block w-full h-full rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center"
          >
            <div class="i-lucide-palette text-white text-xs" />
          </span>
        </button>
      </div>
    </div>

    <!-- Custom Color Selector Modal -->
    <CustomColorSelector
      v-model="showCustomColorSelector"
      @apply="applyCustomColors"
    />
  </div>
</template>
