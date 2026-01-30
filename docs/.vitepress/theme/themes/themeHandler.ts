/**
 *  Copyright (c) 2025 taskylizard. Apache License 2.0.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { ref, onMounted, computed } from 'vue'
import type { DisplayMode, ThemeState, Theme, ModeColors } from './types'
import { themeRegistry } from './configs'
import tinycolor from 'tinycolor2'

const STORAGE_KEY_THEME = 'vitepress-theme-name'
const STORAGE_KEY_MODE = 'vitepress-display-mode'
const STORAGE_KEY_AMOLED = 'vitepress-amoled-enabled'
const STORAGE_KEY_PREVIOUS_MODE = 'vitepress-previous-mode'

export class ThemeHandler {
  private state = ref<ThemeState>({
    currentTheme: 'swarm',
    currentMode: 'light' as DisplayMode,
    theme: null
  })
  private amoledEnabled = ref(false)
  private previousMode = ref<DisplayMode>('light')

  constructor() {
    this.initializeTheme()
  }

  private registerCustomThemeFromStorage() {
    if (typeof window === 'undefined') return
    
    // Load saved custom colors from localStorage
    const savedLinkColor = localStorage.getItem('custom-theme-link-color') || '#ffffff'
    const savedTextColor = localStorage.getItem('custom-theme-text-color') || '#cccccc'
    const savedBgColor = localStorage.getItem('custom-theme-bg-color') || '#000000'
    
    // Create lighter versions of background for cards
    // Increase lightening to make cards more distinct
    const lightenedBg = tinycolor(savedBgColor).lighten(10).toString()
    const lightenedBgAlt = tinycolor(savedBgColor).lighten(15).toString()
    
    // Create custom theme with saved colors
    const customTheme = {
      name: 'custom',
      displayName: 'Custom',
      preview: savedBgColor,
      modes: {
        light: {
          brand: {
            1: savedLinkColor,
            2: savedLinkColor,
            3: savedLinkColor,
            soft: savedLinkColor
          },
          bg: savedBgColor,
          bgAlt: lightenedBg,
          bgElv: lightenedBgAlt,
          text: {
            1: savedTextColor,
            2: savedTextColor,
            3: savedTextColor
          },
          button: {
            brand: {
              bg: savedLinkColor,
              border: savedLinkColor,
              text: savedBgColor,
              hoverBorder: savedLinkColor,
              hoverText: savedBgColor,
              hoverBg: savedLinkColor,
              activeBorder: savedLinkColor,
              activeText: savedBgColor,
              activeBg: savedLinkColor
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
              bg: savedBgColor,
              border: savedLinkColor,
              text: savedTextColor,
              textDeep: savedTextColor
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
            bg: savedLinkColor
          },
          home: {
            heroNameColor: savedLinkColor,
            heroNameBackground: savedBgColor,
            heroImageBackground: `linear-gradient(135deg, ${savedBgColor} 0%, ${savedLinkColor} 100%)`,
            heroImageFilter: 'blur(44px)'
          }
        },
        dark: {
          brand: {
            1: savedLinkColor,
            2: savedLinkColor,
            3: savedLinkColor,
            soft: savedLinkColor
          },
          bg: savedBgColor,
          bgAlt: lightenedBg,
          bgElv: lightenedBgAlt,
          text: {
            1: savedTextColor,
            2: savedTextColor,
            3: savedTextColor
          },
          button: {
            brand: {
              bg: savedLinkColor,
              border: savedLinkColor,
              text: savedBgColor,
              hoverBorder: savedLinkColor,
              hoverText: savedBgColor,
              hoverBg: savedLinkColor,
              activeBorder: savedLinkColor,
              activeText: savedBgColor,
              activeBg: savedLinkColor
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
              bg: savedBgColor,
              border: savedLinkColor,
              text: savedTextColor,
              textDeep: savedTextColor
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
            bg: savedLinkColor
          },
          home: {
            heroNameColor: savedLinkColor,
            heroNameBackground: savedBgColor,
            heroImageBackground: `linear-gradient(135deg, ${savedBgColor} 0%, ${savedLinkColor} 100%)`,
            heroImageFilter: 'blur(44px)'
          }
        }
      }
    }
    
    // Register custom theme
    themeRegistry['custom'] = customTheme
  }

  private initializeTheme() {
    if (typeof window === 'undefined') return

    // Load saved preferences
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'color-swarm'
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as DisplayMode | null
    const savedAmoled = localStorage.getItem(STORAGE_KEY_AMOLED) === 'true'

    // If custom theme was saved, register it early from localStorage
    if (savedTheme === 'custom') {
      this.registerCustomThemeFromStorage()
    }

    if (themeRegistry[savedTheme]) {
      this.state.value.currentTheme = savedTheme
      this.state.value.theme = themeRegistry[savedTheme]
    }

    // Set amoled preference
    this.amoledEnabled.value = savedAmoled

    // Set mode
    if (savedMode) {
      this.state.value.currentMode = savedMode
    } else {
      // Detect system preference for initial mode
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      this.state.value.currentMode = prefersDark ? 'dark' : 'light'
    }

    this.applyTheme()

    // Listen for system theme changes (only if user hasn't set a preference)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY_MODE)) {
        this.state.value.currentMode = e.matches ? 'dark' : 'light'
        this.applyTheme()
      }
      else {
        this.applyTheme()
      }
    })
  }

  public applyTheme() {
    if (typeof document === 'undefined') return

    const { currentMode, theme } = this.state.value

    // Is this the WORST fix of all time???
    const root = document.documentElement
    const bgColor = currentMode === 'dark' && this.amoledEnabled.value ? '#000000' : currentMode === 'dark' ? '#1A1A1A' : '#f8fafc'
    root.style.setProperty('--vp-c-bg', bgColor)
    const bgAltColor = currentMode === 'dark' && this.amoledEnabled.value ? '#000000' : currentMode === 'dark' ? '#171717' : '#eef2f5'
    root.style.setProperty('--vp-c-bg-alt', bgAltColor)
    const bgElvColor = currentMode === 'dark' && this.amoledEnabled.value ? 'rgba(0, 0, 0, 0.9)' : currentMode === 'dark' ? '#1a1a1acc' : 'rgba(255, 255, 255, 0.8)'
    root.style.setProperty('--vp-c-bg-elv', bgElvColor)

    this.applyDOMClasses(currentMode)

    if (!theme) return

    // Custom mode uses dark mode colors from the theme
    const effectiveMode = currentMode === 'custom' ? 'dark' : currentMode
    const modeColors = theme.modes[effectiveMode]

    this.applyDOMClasses(currentMode)
    this.applyCSSVariables(modeColors, theme)

    if (theme.name === 'monochrome') {
      root.classList.add('monochrome')
    } else {
      root.classList.remove('monochrome')
    }
  }

  private applyDOMClasses(mode: DisplayMode) {
    const root = document.documentElement

    // Remove all mode classes
    root.classList.remove('dark', 'light', 'amoled', 'custom')

    // Add current mode class
    root.classList.add(mode)

    // Add amoled class if enabled in dark mode
    if (mode === 'dark' && this.amoledEnabled.value) {
      root.classList.add('amoled')
    }
  }

  private applyCSSVariables(colors: ModeColors, theme: Theme) {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    // Clear ALL inline styles related to theming to ensure clean slate
    const allStyleProps = Array.from(root.style)
    allStyleProps.forEach(prop => {
      if (prop.startsWith('--vp-')) {
        root.style.removeProperty(prop)
      }
    })
    let bgColor = colors.bg
    let bgAltColor = colors.bgAlt
    let bgElvColor = colors.bgElv

    if (this.state.value.currentMode === 'dark' && this.amoledEnabled.value) {
      bgColor = '#000000'
      bgAltColor = '#000000'
      bgElvColor = 'rgba(0, 0, 0, 0.9)'
    }

    // Apply brand colors only if theme specifies them
    // Otherwise, remove inline styles to let ColorPicker CSS take effect
    if (colors.brand && (colors.brand[1] || colors.brand[2] || colors.brand[3] || colors.brand.soft)) {
      if (colors.brand[1]) root.style.setProperty('--vp-c-brand-1', colors.brand[1])
      if (colors.brand[2]) root.style.setProperty('--vp-c-brand-2', colors.brand[2])
      if (colors.brand[3]) root.style.setProperty('--vp-c-brand-3', colors.brand[3])
      if (colors.brand.soft) root.style.setProperty('--vp-c-brand-soft', colors.brand.soft)
    } else {
      // Remove inline brand color styles so ColorPicker CSS can apply
      root.style.removeProperty('--vp-c-brand-1')
      root.style.removeProperty('--vp-c-brand-2')
      root.style.removeProperty('--vp-c-brand-3')
      root.style.removeProperty('--vp-c-brand-soft')
    }

    // Apply background colors
    root.style.setProperty('--vp-c-bg', bgColor)
    root.style.setProperty('--vp-c-bg-alt', bgAltColor)
    root.style.setProperty('--vp-c-bg-elv', bgElvColor)
    
    // Apply additional background variables for cards and other elements
    root.style.setProperty('--vp-c-bg-soft', bgAltColor)
    root.style.setProperty('--vp-c-default-soft', bgElvColor)
    root.style.setProperty('--vp-c-default-1', bgAltColor)
    root.style.setProperty('--vp-c-default-2', bgElvColor)
    root.style.setProperty('--vp-c-default-3', bgColor)
    
    if (colors.bgMark) {
      root.style.setProperty('--vp-c-bg-mark', colors.bgMark)
    }

    // Apply text colors - always set them to ensure proper theme switching
    if (colors.text) {
      if (colors.text[1]) root.style.setProperty('--vp-c-text-1', colors.text[1])
      if (colors.text[2]) root.style.setProperty('--vp-c-text-2', colors.text[2])
      if (colors.text[3]) root.style.setProperty('--vp-c-text-3', colors.text[3])
    } else {
      // Remove inline styles if theme doesn't specify text colors
      // This allows CSS variables from style.scss to take effect
      root.style.removeProperty('--vp-c-text-1')
      root.style.removeProperty('--vp-c-text-2')
      root.style.removeProperty('--vp-c-text-3')
    }

    // Apply button colors
    root.style.setProperty('--vp-button-brand-bg', colors.button.brand.bg)
    root.style.setProperty('--vp-button-brand-border', colors.button.brand.border)
    root.style.setProperty('--vp-button-brand-text', colors.button.brand.text)
    root.style.setProperty('--vp-button-brand-hover-border', colors.button.brand.hoverBorder)
    root.style.setProperty('--vp-button-brand-hover-text', colors.button.brand.hoverText)
    root.style.setProperty('--vp-button-brand-hover-bg', colors.button.brand.hoverBg)
    root.style.setProperty('--vp-button-brand-active-border', colors.button.brand.activeBorder)
    root.style.setProperty('--vp-button-brand-active-text', colors.button.brand.activeText)
    root.style.setProperty('--vp-button-brand-active-bg', colors.button.brand.activeBg)
    root.style.setProperty('--vp-button-alt-bg', colors.button.alt.bg)
    root.style.setProperty('--vp-button-alt-text', colors.button.alt.text)
    root.style.setProperty('--vp-button-alt-hover-bg', colors.button.alt.hoverBg)
    root.style.setProperty('--vp-button-alt-hover-text', colors.button.alt.hoverText)

    // Apply custom block colors
    const blocks = ['info', 'tip', 'warning', 'danger'] as const
    blocks.forEach((block) => {
      const blockColors = colors.customBlock[block]
      root.style.setProperty(`--vp-custom-block-${block}-bg`, blockColors.bg)
      root.style.setProperty(`--vp-custom-block-${block}-border`, blockColors.border)
      root.style.setProperty(`--vp-custom-block-${block}-text`, blockColors.text)
      root.style.setProperty(`--vp-custom-block-${block}-text-deep`, blockColors.textDeep)
    })

    // Apply selection color
    root.style.setProperty('--vp-c-selection-bg', colors.selection.bg)

    // Apply home hero colors (if defined)
    if (colors.home) {
      root.style.setProperty('--vp-home-hero-name-color', colors.home.heroNameColor)
      root.style.setProperty('--vp-home-hero-name-background', colors.home.heroNameBackground)
      root.style.setProperty('--vp-home-hero-image-background-image', colors.home.heroImageBackground)
      root.style.setProperty('--vp-home-hero-image-filter', colors.home.heroImageFilter)
    } else {
      // Remove home hero color styles if theme doesn't specify them
      root.style.removeProperty('--vp-home-hero-name-color')
      root.style.removeProperty('--vp-home-hero-name-background')
      root.style.removeProperty('--vp-home-hero-image-background-image')
      root.style.removeProperty('--vp-home-hero-image-filter')
    }

    // Apply fonts (if defined)
    if (theme.fonts?.body) {
      root.style.setProperty('--vp-font-family-base', theme.fonts.body)
    } else {
      root.style.removeProperty('--vp-font-family-base')
    }
    if (theme.fonts?.heading) {
      root.style.setProperty('--vp-font-family-heading', theme.fonts.heading)
    } else {
      root.style.removeProperty('--vp-font-family-heading')
    }

    // Apply border radius (if defined)
    if (theme.borderRadius) {
      root.style.setProperty('--vp-border-radius', theme.borderRadius)
    } else {
      root.style.removeProperty('--vp-border-radius')
    }

    // Apply spacing (if defined)
    if (theme.spacing) {
      if (theme.spacing.small) root.style.setProperty('--vp-spacing-small', theme.spacing.small)
      else root.style.removeProperty('--vp-spacing-small')
      if (theme.spacing.medium) root.style.setProperty('--vp-spacing-medium', theme.spacing.medium)
      else root.style.removeProperty('--vp-spacing-medium')
      if (theme.spacing.large) root.style.setProperty('--vp-spacing-large', theme.spacing.large)
      else root.style.removeProperty('--vp-spacing-large')
    } else {
      root.style.removeProperty('--vp-spacing-small')
      root.style.removeProperty('--vp-spacing-medium')
      root.style.removeProperty('--vp-spacing-large')
    }

    // Apply custom properties (if defined)
    if (theme.customProperties) {
      Object.entries(theme.customProperties).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })
    }

    // Apply custom logo (if defined)
    if (theme.logo) {
      root.style.setProperty('--vp-theme-logo', `url(${theme.logo})`)
    } else {
      root.style.removeProperty('--vp-theme-logo')
    }
  }

  public setTheme(themeName: string) {
    if (!themeRegistry[themeName]) {
      console.warn(`Theme "${themeName}" not found. Using christmas theme.`)
      themeName = 'christmas'
    }

    this.state.value.currentTheme = themeName
    this.state.value.theme = themeRegistry[themeName]
    localStorage.setItem(STORAGE_KEY_THEME, themeName)
    this.applyTheme()

    // Force re-apply ColorPicker colors if theme doesn't specify brand colors
    this.ensureColorPickerColors()
  }

  public setMode(mode: DisplayMode) {
    // Save current mode as previous mode before switching to custom
    if (mode === 'custom' && this.state.value.currentMode !== 'custom') {
      this.previousMode.value = this.state.value.currentMode
      localStorage.setItem(STORAGE_KEY_PREVIOUS_MODE, this.previousMode.value)
    }
    
    this.state.value.currentMode = mode
    localStorage.setItem(STORAGE_KEY_MODE, mode)
    this.applyTheme()
  }

  public toggleMode() {
    const currentMode = this.state.value.currentMode

    // Toggle between light and dark
    const newMode: DisplayMode = currentMode === 'light' ? 'dark' : 'light'

    this.setMode(newMode)
  }

  public setAmoledEnabled(enabled: boolean) {
    this.amoledEnabled.value = enabled
    localStorage.setItem(STORAGE_KEY_AMOLED, enabled.toString())
    this.applyTheme()
  }

  public getAmoledEnabled() {
    return this.amoledEnabled.value
  }

  public toggleAmoled() {
    this.setAmoledEnabled(!this.amoledEnabled.value)
  }

  public getAmoledEnabledRef() {
    return this.amoledEnabled
  }

  private ensureColorPickerColors() {
    const theme = this.state.value.theme
    if (!theme) return
    // If theme doesn't specify brand colors, force ColorPicker to reapply its selection
    const currentMode = this.state.value.currentMode
    // Custom mode uses dark mode colors
    const effectiveMode = currentMode === 'custom' ? 'dark' : currentMode
    const modeColors = theme.modes[effectiveMode]

    if (!modeColors.brand || !modeColors.brand[1]) {
      // Trigger a custom event that ColorPicker can listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('theme-changed-apply-colors'))
      }
    }
  }

  public getState() {
    return this.state
  }

  public getMode() {
    return this.state.value.currentMode
  }

  public getTheme() {
    return this.state.value.currentTheme
  }

  public getCurrentTheme() {
    return this.state.value.theme
  }

  public getAvailableThemes() {
    return Object.keys(themeRegistry).map(key => ({
      name: key,
      displayName: themeRegistry[key].displayName
    }))
  }

  public isDarkMode() {
    const mode = this.state.value.currentMode
    return mode === 'dark'
  }

  public isAmoledMode() {
    return this.state.value.currentMode === 'dark' && this.amoledEnabled.value
  }

  public restorePreviousMode() {
    // Only restore if currently in custom mode
    if (this.state.value.currentMode === 'custom') {
      const savedPreviousMode = localStorage.getItem(STORAGE_KEY_PREVIOUS_MODE) as DisplayMode | null
      const modeToRestore = savedPreviousMode || this.previousMode.value
      this.setMode(modeToRestore)
    }
  }
}

// Global theme handler instance
let themeHandlerInstance: ThemeHandler | null = null

export function useThemeHandler() {
  if (!themeHandlerInstance) {
    themeHandlerInstance = new ThemeHandler()
  }
  return themeHandlerInstance
}

// Composable for use in Vue components
export function useTheme() {
  const handler = useThemeHandler()
  const state = handler.getState()

  onMounted(() => {
    // Ensure theme is applied on mount
    handler.applyTheme()
  })

  return {
    mode: computed(() => state.value.currentMode),
    themeName: computed(() => state.value.currentTheme),
    theme: computed(() => state.value.theme),
    setMode: (mode: DisplayMode) => handler.setMode(mode),
    setTheme: (themeName: string) => handler.setTheme(themeName),
    toggleMode: () => handler.toggleMode(),
    getAvailableThemes: () => handler.getAvailableThemes(),
    isDarkMode: () => handler.isDarkMode(),
    isAmoledMode: () => handler.isAmoledMode(),
    amoledEnabled: handler.getAmoledEnabledRef(),
    setAmoledEnabled: (enabled: boolean) => handler.setAmoledEnabled(enabled),
    toggleAmoled: () => handler.toggleAmoled(),
    restorePreviousMode: () => handler.restorePreviousMode(),
    state
  }
}