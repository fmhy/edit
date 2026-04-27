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

const STORAGE_KEY_THEME = 'vitepress-theme-name'
const STORAGE_KEY_MODE = 'vitepress-display-mode'
const STORAGE_KEY_AMOLED = 'vitepress-amoled-enabled'

export class ThemeHandler {
  private state = ref<ThemeState>({
    currentTheme: 'swarm',
    currentMode: 'light' as DisplayMode,
    theme: null
  })
  private amoledEnabled = ref(false)

  constructor() {
    this.initializeTheme()
  }

  private initializeTheme() {
    if (typeof window === 'undefined') return

    // Load saved preferences
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'color-swarm'
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as DisplayMode | null
    const savedAmoled = localStorage.getItem(STORAGE_KEY_AMOLED) === 'true'

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

    const modeColors = theme.modes[currentMode]

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

    const isDark = mode === 'dark'
    const isAmoled = isDark && this.amoledEnabled.value

    if (isDark) {
      if (!root.classList.contains('dark')) root.classList.add('dark')
      if (root.classList.contains('light')) root.classList.remove('light')
    } else {
      if (!root.classList.contains('light')) root.classList.add('light')
      if (root.classList.contains('dark')) root.classList.remove('dark')
    }

    if (isAmoled) {
      if (!root.classList.contains('amoled')) root.classList.add('amoled')
    } else {
      if (root.classList.contains('amoled')) root.classList.remove('amoled')
    }
  }

  private applyCSSVariables(colors: ModeColors, theme: Theme) {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    // Clear ALL inline styles related to theming to ensure clean slate
    // const allStyleProps = Array.from(root.style)
    // allStyleProps.forEach(prop => {
    //   if (prop.startsWith('--vp-')) {
    //     root.style.removeProperty(prop)
    //   }
    // })
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

  public setAppearance(mode: DisplayMode, amoled: boolean) {
    this.state.value.currentMode = mode
    this.amoledEnabled.value = amoled
    localStorage.setItem(STORAGE_KEY_MODE, mode)
    localStorage.setItem(STORAGE_KEY_AMOLED, amoled.toString())
    this.applyTheme()
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
    const modeColors = theme.modes[currentMode]

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
    setAppearance: (mode: DisplayMode, amoled: boolean) => handler.setAppearance(mode, amoled),
    state
  }
}