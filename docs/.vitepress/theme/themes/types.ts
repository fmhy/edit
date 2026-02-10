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

export type DisplayMode = 'light' | 'dark'

export interface ModeColors {
  // Brand colors (optional - if not specified, ColorPicker values are used)
  brand?: {
    1?: string
    2?: string
    3?: string
    soft?: string
  }

  // Background colors
  bg: string
  bgAlt: string
  bgElv: string
  bgMark?: string

  // Text colors (optional - if not specified, VitePress defaults are used)
  text?: {
    1?: string
    2?: string
    3?: string
  }

  // Button colors
  button: {
    brand: {
      bg: string
      border: string
      text: string
      hoverBorder: string
      hoverText: string
      hoverBg: string
      activeBorder: string
      activeText: string
      activeBg: string
    }
    alt: {
      bg: string
      text: string
      hoverBg: string
      hoverText: string
    }
  }

  // Custom blocks
  customBlock: {
    info: {
      bg: string
      border: string
      text: string
      textDeep: string
    }
    tip: {
      bg: string
      border: string
      text: string
      textDeep: string
    }
    warning: {
      bg: string
      border: string
      text: string
      textDeep: string
    }
    danger: {
      bg: string
      border: string
      text: string
      textDeep: string
    }
  }

  // Selection color
  selection: {
    bg: string
  }

  // Home hero
  home?: {
    heroNameColor: string
    heroNameBackground: string
    heroImageBackground: string
    heroImageFilter: string
  }
}

export interface Theme {
  name: string
  displayName: string
  preview?: string // URL or path to theme preview image
  logo?: string // URL or path to custom logo
  modes: {
    light: ModeColors
    dark: ModeColors
  }
  fonts?: {
    body?: string
    heading?: string
  }
  borderRadius?: string
  spacing?: {
    small?: string
    medium?: string
    large?: string
  }
  customProperties?: Record<string, string>
}

export interface ThemeRegistry {
  [themeName: string]: Theme
}

export interface ThemeState {
  currentTheme: string
  currentMode: DisplayMode
  theme: Theme | null
}
