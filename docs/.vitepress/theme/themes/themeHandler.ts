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

import type { DisplayMode, ModeColors, Theme, ThemeState } from './types'
import { computed, onMounted, ref } from 'vue'
import { themeRegistry } from './configs'

const STORAGE_KEY_THEME = 'vitepress-theme-name'
const STORAGE_KEY_MODE = 'vitepress-display-mode'
const STORAGE_KEY_AMOLED = 'vitepress-amoled-enabled'
const STORAGE_KEY_VARS = 'vitepress-theme-vars'

function resolveThemeName(name?: string | null): string {
  if (name && themeRegistry[name]) return name
  if (name && themeRegistry[`color-${name}`]) return `color-${name}`
  return 'color-swarm'
}

export class ThemeHandler {
  private state = ref<ThemeState>({
    currentTheme: 'color-swarm',
    currentMode: 'light' as DisplayMode,
    theme: null
  })
  private amoledEnabled = ref(false)
  private prefersDarkMql: MediaQueryList | null = null
  private initialized = false
  // Arrow field gives a stable, bound reference we can later remove.
  private handleSystemThemeChange = (e: MediaQueryListEvent) => {
    if (!localStorage.getItem(STORAGE_KEY_MODE)) {
      this.state.value.currentMode = e.matches ? 'dark' : 'light'
      this.applyTheme()
    } else {
      this.applyTheme()
    }
  }

  public initializeTheme() {
    if (typeof window === 'undefined' || this.initialized) return
    this.initialized = true

    const savedTheme = resolveThemeName(localStorage.getItem(STORAGE_KEY_THEME))

    const savedMode = localStorage.getItem(
      STORAGE_KEY_MODE
    ) as DisplayMode | null
    const savedAmoled = localStorage.getItem(STORAGE_KEY_AMOLED) === 'true'

    this.state.value.currentTheme = savedTheme
    this.state.value.theme = themeRegistry[savedTheme]

    // Set amoled preference
    this.amoledEnabled.value = savedAmoled

    // Set mode
    if (savedMode) {
      this.state.value.currentMode = savedMode
    } else {
      // Detect system preference for initial mode
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
      this.state.value.currentMode = prefersDark ? 'dark' : 'light'
    }

    this.applyTheme()

    // Listen for system theme changes (only if user hasn't set a preference).
    // Remove any prior listener first so repeated init calls don't stack.
    this.prefersDarkMql?.removeEventListener(
      'change',
      this.handleSystemThemeChange
    )
    this.prefersDarkMql = window.matchMedia('(prefers-color-scheme: dark)')
    this.prefersDarkMql.addEventListener('change', this.handleSystemThemeChange)
  }

  public applyTheme() {
    if (typeof document === 'undefined') return

    const { currentMode, theme, currentTheme } = this.state.value
    const root = document.documentElement

    this.applyDOMClasses(currentMode)
    root.dataset.theme = currentTheme

    if (!theme) return

    const modeColors = theme.modes[currentMode]
    this.applyCSSVariables(modeColors, theme)
    this.persistInlineVars()
  }

  // Snapshot the inline --vp-* CSS variables so the head bootstrap script
  // can replay them on the next page load before hydration, avoiding the
  // flash of the default theme.
  private persistInlineVars() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const root = document.documentElement
    const vars: Record<string, string> = {}
    for (let i = 0; i < root.style.length; i++) {
      const prop = root.style[i]
      if (prop.startsWith('--vp-')) {
        vars[prop] = root.style.getPropertyValue(prop)
      }
    }
    try {
      localStorage.setItem(STORAGE_KEY_VARS, JSON.stringify(vars))
    } catch {
      // localStorage may be unavailable (quota, privacy mode); ignore.
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

    let bgColor = colors.bg
    let bgAltColor = colors.bgAlt
    let bgElvColor = colors.bgElv

    if (this.state.value.currentMode === 'dark' && this.amoledEnabled.value) {
      bgColor = '#000000'
      bgAltColor = '#000000'
      bgElvColor = 'rgba(0, 0, 0, 0.9)'
    }

    // Apply brand colors
    root.style.setProperty('--vp-c-brand-1', colors.brand[1])
    root.style.setProperty('--vp-c-brand-2', colors.brand[2])
    root.style.setProperty('--vp-c-brand-3', colors.brand[3])
    root.style.setProperty('--vp-c-brand-soft', colors.brand.soft)

    // Apply background colors
    root.style.setProperty('--vp-c-bg', bgColor)
    root.style.setProperty('--vp-c-bg-alt', bgAltColor)
    root.style.setProperty('--vp-c-bg-elv', bgElvColor)

    // Apply text colors - always set them to ensure proper theme switching
    if (colors.text) {
      if (colors.text[1])
        root.style.setProperty('--vp-c-text-1', colors.text[1])
      if (colors.text[2])
        root.style.setProperty('--vp-c-text-2', colors.text[2])
      if (colors.text[3])
        root.style.setProperty('--vp-c-text-3', colors.text[3])
    } else {
      // Remove inline styles if theme doesn't specify text colors
      // This allows CSS variables from style.scss to take effect
      root.style.removeProperty('--vp-c-text-1')
      root.style.removeProperty('--vp-c-text-2')
      root.style.removeProperty('--vp-c-text-3')
    }

    // Apply button colors
    root.style.setProperty('--vp-button-brand-bg', colors.button.brand.bg)
    root.style.setProperty(
      '--vp-button-brand-border',
      colors.button.brand.border
    )
    root.style.setProperty('--vp-button-brand-text', colors.button.brand.text)
    root.style.setProperty(
      '--vp-button-brand-hover-border',
      colors.button.brand.hoverBorder
    )
    root.style.setProperty(
      '--vp-button-brand-hover-text',
      colors.button.brand.hoverText
    )
    root.style.setProperty(
      '--vp-button-brand-hover-bg',
      colors.button.brand.hoverBg
    )
    root.style.setProperty(
      '--vp-button-brand-active-border',
      colors.button.brand.activeBorder
    )
    root.style.setProperty(
      '--vp-button-brand-active-text',
      colors.button.brand.activeText
    )
    root.style.setProperty(
      '--vp-button-brand-active-bg',
      colors.button.brand.activeBg
    )
    root.style.setProperty('--vp-button-alt-bg', colors.button.alt.bg)
    root.style.setProperty('--vp-button-alt-text', colors.button.alt.text)
    root.style.setProperty(
      '--vp-button-alt-hover-bg',
      colors.button.alt.hoverBg
    )
    root.style.setProperty(
      '--vp-button-alt-hover-text',
      colors.button.alt.hoverText
    )

    // Apply custom block colors
    const blocks = ['info', 'tip', 'warning', 'danger'] as const
    blocks.forEach((block) => {
      const blockColors = colors.customBlock[block]
      root.style.setProperty(`--vp-custom-block-${block}-bg`, blockColors.bg)
      root.style.setProperty(
        `--vp-custom-block-${block}-border`,
        blockColors.border
      )
      root.style.setProperty(
        `--vp-custom-block-${block}-text`,
        blockColors.text
      )
      root.style.setProperty(
        `--vp-custom-block-${block}-text-deep`,
        blockColors.textDeep
      )
    })

    // Apply selection color
    root.style.setProperty('--vp-c-selection-bg', colors.selection.bg)

    // Apply home hero colors (if defined)
    if (colors.home) {
      root.style.setProperty(
        '--vp-home-hero-name-color',
        colors.home.heroNameColor
      )
      root.style.setProperty(
        '--vp-home-hero-name-background',
        colors.home.heroNameBackground
      )
      root.style.setProperty(
        '--vp-home-hero-image-background-image',
        colors.home.heroImageBackground
      )
      root.style.setProperty(
        '--vp-home-hero-image-filter',
        colors.home.heroImageFilter
      )
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
  }

  public setTheme(name: string) {
    const themeName = resolveThemeName(name)

    this.state.value.currentTheme = themeName
    this.state.value.theme = themeRegistry[themeName]
    localStorage.setItem(STORAGE_KEY_THEME, themeName)
    this.applyTheme()
  }

  public setAppearance(mode: DisplayMode, amoled: boolean) {
    this.state.value.currentMode = mode
    this.amoledEnabled.value = amoled
    localStorage.setItem(STORAGE_KEY_MODE, mode)
    localStorage.setItem(STORAGE_KEY_AMOLED, amoled.toString())
    this.applyTheme()
  }

  public getAmoledEnabledRef() {
    return this.amoledEnabled
  }

  public getState() {
    return this.state
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
    handler.initializeTheme()
  })

  return {
    mode: computed(() => state.value.currentMode),
    themeName: computed(() => state.value.currentTheme),
    amoledEnabled: handler.getAmoledEnabledRef(),
    setTheme: (themeName: string) => handler.setTheme(themeName),
    setAppearance: (mode: DisplayMode, amoled: boolean) =>
      handler.setAppearance(mode, amoled)
  }
}
