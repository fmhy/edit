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
  
  private initTime = 0

  constructor() {
    if (typeof window !== 'undefined') {
      this.initTime = Date.now()
    }
    this.initializeTheme()
  }

  private initializeTheme() {
    if (typeof window === 'undefined') return

    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'color-swarm'
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as DisplayMode | null
    const savedAmoled = localStorage.getItem(STORAGE_KEY_AMOLED) === 'true'

    if (!localStorage.getItem(STORAGE_KEY_THEME)) {
      localStorage.setItem(STORAGE_KEY_THEME, 'color-swarm')
    }
    if (!localStorage.getItem('preferred-color')) {
      localStorage.setItem('preferred-color', 'swarm')
    }

    console.log('[ThemeHandler] Initializing. Raw Storage:', savedTheme)

    if (themeRegistry[savedTheme]) {
      console.log('[ThemeHandler] Found Custom Theme:', savedTheme)
      this.state.value.currentTheme = savedTheme
      this.state.value.theme = themeRegistry[savedTheme]
    } 
    else if (themeRegistry[savedTheme.replace('color-', '')]) {
      const cleanName = savedTheme.replace('color-', '')
      console.log('[ThemeHandler] Found Custom Theme (cleaned):', cleanName)
      this.state.value.currentTheme = cleanName
      this.state.value.theme = themeRegistry[cleanName]
    }
    else {
      const cleanName = savedTheme.replace('color-', '')
      console.log('[ThemeHandler] Using Preset Theme:', cleanName)
      this.state.value.currentTheme = cleanName
      this.state.value.theme = null
    }

    this.amoledEnabled.value = savedAmoled


    if (savedMode) {
      this.state.value.currentMode = savedMode
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      this.state.value.currentMode = prefersDark ? 'dark' : 'light'
    }

    this.applyTheme()

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY_MODE)) {
        this.state.value.currentMode = e.matches ? 'dark' : 'light'
        this.applyTheme()
      } else {
        this.applyTheme()
      }
    })
  }

  public applyTheme() {
    if (typeof document === 'undefined') return

    const { currentMode, theme } = this.state.value
    
    if (!theme || !theme.modes || !theme.modes[currentMode]) {
      this.applyDOMClasses(currentMode)
      this.clearCustomCSSVariables()
      return
    }
    
    const modeColors = theme.modes[currentMode]
    this.applyDOMClasses(currentMode)
    this.applyCSSVariables(modeColors, theme)
  }

  private applyDOMClasses(mode: DisplayMode) {
    const root = document.documentElement
    root.classList.remove('dark', 'light', 'amoled')
    root.classList.add(mode)
    if (mode === 'dark' && this.amoledEnabled.value) {
      root.classList.add('amoled')
    }
  }

  private clearCustomCSSVariables() {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const allStyleProps = Array.from(root.style)
    allStyleProps.forEach(prop => {
      if (prop.startsWith('--vp-')) {
        root.style.removeProperty(prop)
      }
    })
  }

  private applyCSSVariables(colors: ModeColors, theme: Theme) {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    this.clearCustomCSSVariables()

    let bgColor = colors.bg
    let bgAltColor = colors.bgAlt
    let bgElvColor = colors.bgElv
    
    if (this.state.value.currentMode === 'dark' && this.amoledEnabled.value) {
      bgColor = '#000000'
      bgAltColor = '#000000'
      bgElvColor = 'rgba(0, 0, 0, 0.9)'
    }

    if (colors.brand && (colors.brand[1] || colors.brand[2] || colors.brand[3] || colors.brand.soft)) {
      if (colors.brand[1]) root.style.setProperty('--vp-c-brand-1', colors.brand[1])
      if (colors.brand[2]) root.style.setProperty('--vp-c-brand-2', colors.brand[2])
      if (colors.brand[3]) root.style.setProperty('--vp-c-brand-3', colors.brand[3])
      if (colors.brand.soft) root.style.setProperty('--vp-c-brand-soft', colors.brand.soft)
    }

    root.style.setProperty('--vp-c-bg', bgColor)
    root.style.setProperty('--vp-c-bg-alt', bgAltColor)
    root.style.setProperty('--vp-c-bg-elv', bgElvColor)
    if (colors.bgMark) {
      root.style.setProperty('--vp-c-bg-mark', colors.bgMark)
    }

    if (colors.text) {
      if (colors.text[1]) root.style.setProperty('--vp-c-text-1', colors.text[1])
      if (colors.text[2]) root.style.setProperty('--vp-c-text-2', colors.text[2])
      if (colors.text[3]) root.style.setProperty('--vp-c-text-3', colors.text[3])
    }

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

    const blocks = ['info', 'tip', 'warning', 'danger'] as const
    blocks.forEach((block) => {
      const blockColors = colors.customBlock[block]
      root.style.setProperty(`--vp-custom-block-${block}-bg`, blockColors.bg)
      root.style.setProperty(`--vp-custom-block-${block}-border`, blockColors.border)
      root.style.setProperty(`--vp-custom-block-${block}-text`, blockColors.text)
      root.style.setProperty(`--vp-custom-block-${block}-text-deep`, blockColors.textDeep)
    })

    root.style.setProperty('--vp-c-selection-bg', colors.selection.bg)

    if (colors.home) {
      root.style.setProperty('--vp-home-hero-name-color', colors.home.heroNameColor)
      root.style.setProperty('--vp-home-hero-name-background', colors.home.heroNameBackground)
      root.style.setProperty('--vp-home-hero-image-background-image', colors.home.heroImageBackground)
      root.style.setProperty('--vp-home-hero-image-filter', colors.home.heroImageFilter)
    }

    if (theme.fonts?.body) root.style.setProperty('--vp-font-family-base', theme.fonts.body)
    if (theme.fonts?.heading) root.style.setProperty('--vp-font-family-heading', theme.fonts.heading)
    if (theme.borderRadius) root.style.setProperty('--vp-border-radius', theme.borderRadius)
    if (theme.spacing) {
      if (theme.spacing.small) root.style.setProperty('--vp-spacing-small', theme.spacing.small)
      if (theme.spacing.medium) root.style.setProperty('--vp-spacing-medium', theme.spacing.medium)
      if (theme.spacing.large) root.style.setProperty('--vp-spacing-large', theme.spacing.large)
    }
    if (theme.customProperties) {
      Object.entries(theme.customProperties).forEach(([key, value]) => root.style.setProperty(key, value))
    }
    if (theme.logo) root.style.setProperty('--vp-theme-logo', `url(${theme.logo})`)
  }

  public setTheme(themeName: string) {
    console.log('[ThemeHandler] setTheme called with:', themeName)


    const isStartup = typeof window !== 'undefined' && (Date.now() - this.initTime < 1000)
    const isDefaultReset = themeName === 'color-swarm' || themeName === 'swarm'
    const hasCustomThemeLoaded = !!this.state.value.theme

    if (isStartup && isDefaultReset && hasCustomThemeLoaded) {
      console.warn('[ThemeHandler] Blocked auto-reset to default theme during startup.')
      return
    }

    if (themeRegistry[themeName]) {
      this.state.value.currentTheme = themeName
      this.state.value.theme = themeRegistry[themeName]
      localStorage.setItem(STORAGE_KEY_THEME, themeName)
      this.applyTheme()
      this.ensureColorPickerColors()
      return
    }

    const cleanName = themeName.replace('color-', '')
    if (themeRegistry[cleanName]) {
      this.state.value.currentTheme = cleanName
      this.state.value.theme = themeRegistry[cleanName]
      localStorage.setItem(STORAGE_KEY_THEME, cleanName)
      this.applyTheme()
      this.ensureColorPickerColors()
      return
    }

    console.log('[ThemeHandler] Applying Preset:', cleanName)
    this.state.value.currentTheme = cleanName
    this.state.value.theme = null
    
    localStorage.setItem(STORAGE_KEY_THEME, `color-${cleanName}`)
    localStorage.setItem('preferred-color', cleanName)
    
    this.applyTheme()
  }

  public setMode(mode: DisplayMode) {
    this.state.value.currentMode = mode
    localStorage.setItem(STORAGE_KEY_MODE, mode)
    this.applyTheme()
  }

  public toggleMode() {
    const currentMode = this.state.value.currentMode
    const newMode: DisplayMode = currentMode === 'light' ? 'dark' : 'light'
    this.setMode(newMode)
  }

  public setAmoledEnabled(enabled: boolean) {
    this.amoledEnabled.value = enabled
    localStorage.setItem(STORAGE_KEY_AMOLED, enabled.toString())
    this.applyTheme()
  }

  public getAmoledEnabled() { return this.amoledEnabled.value }
  public toggleAmoled() { this.setAmoledEnabled(!this.amoledEnabled.value) }
  public getAmoledEnabledRef() { return this.amoledEnabled }

  private ensureColorPickerColors() {
    const currentMode = this.state.value.currentMode
    const theme = this.state.value.theme
    
    if (!theme || !theme.modes || !theme.modes[currentMode]) return
    const modeColors = theme.modes[currentMode]
    
    if (!modeColors.brand || !modeColors.brand[1]) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('theme-changed-apply-colors'))
      }
    }
  }

  public getState() { return this.state }
  public getMode() { return this.state.value.currentMode }
  public getTheme() { return this.state.value.currentTheme }
  public getCurrentTheme() { return this.state.value.theme || ({} as Theme) }
  public getAvailableThemes() {
    return Object.keys(themeRegistry).map(key => ({
      name: key,
      displayName: themeRegistry[key].displayName
    }))
  }
  public isDarkMode() { return this.state.value.currentMode === 'dark' }
  public isAmoledMode() { return this.state.value.currentMode === 'dark' && this.amoledEnabled.value }
}

let themeHandlerInstance: ThemeHandler | null = null

export function useThemeHandler() {
  if (!themeHandlerInstance) {
    themeHandlerInstance = new ThemeHandler()
  }
  return themeHandlerInstance
}

export function useTheme() {
  const handler = useThemeHandler()
  const state = handler.getState()

  onMounted(() => {
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
    state
  }
}