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

import type { Theme } from '../types'

export const catppuccinTheme: Theme = {
  name: 'catppuccin',
  displayName: 'Catppuccin',
  preview: 'https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/logos/exports/1544x1544_circle.png',
  modes: {
    light: {
      brand: {
        1: '#9345ed',
        2: '#7c3aed',
        3: '#ad82dfff',
        soft: '#a78bfa'
      },
      bg: '#f8fafc',
      bgAlt: '#eef2f5',
      bgElv: '#eef2f5',
      bgMark: '#1F1E2E',
      text: {
        1: '#353638ff',
        2: '#334155',
        3: '#6b7280'
      },
      button: {
        brand: {
          bg: '#C5A5F6',
          border: '#a78bfa',
          text: 'rgba(42, 40, 47)',
          hoverBorder: '#a78bfa',
          hoverText: 'rgba(42, 40, 47)',
          hoverBg: '#a78bfa',
          activeBorder: '#a78bfa',
          activeText: 'rgba(42, 40, 47)',
          activeBg: '#8b5cf6'
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
          bg: '#ede9fe',
          border: '#5b21b6',
          text: '#5b21b6',
          textDeep: '#4c1d95'
        },
        tip: {
          bg: '#d1fae5',
          border: '#065f46',
          text: '#065f46',
          textDeep: '#064e3b'
        },
        warning: {
          bg: '#fef3c7',
          border: '#92400e',
          text: '#92400e',
          textDeep: '#78350f'
        },
        danger: {
          bg: '#ffe4e6',
          border: '#9f1239',
          text: '#9f1239',
          textDeep: '#881337'
        }
      },
      selection: {
        bg: '#5586a6'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground: '#C5A5F6',
        heroImageBackground: 'linear-gradient(-45deg, #c4b5fd 50%, #47caff 50%)',
        heroImageFilter: 'blur(44px)'
      }
    },
    dark: {
      brand: {
        1: '#CBA6F6',
        2: '#7c3aed',
        3: '#ad82dfff',
        soft: '#a78bfa'
      },
      bg: '#1F1E2E',
      bgAlt: '#1E1E29',
      bgElv: '#1E1E29',
      bgMark: '#1F1E2E',
      button: {
        brand: {
          bg: '#C5A5F6',
          border: '#c4b5fd',
          text: 'rgba(42, 40, 47)',
          hoverBorder: '#c4b5fd',
          hoverText: 'rgba(42, 40, 47)',
          hoverBg: '#c4b5fd',
          activeBorder: '#c4b5fd',
          activeText: 'rgba(42, 40, 47)',
          activeBg: '#a78bfa'
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
          bg: '#2e1065',
          border: '#5b21b6',
          text: '#ddd6fe',
          textDeep: '#ddd6fe'
        },
        tip: {
          bg: '#022c22',
          border: '#065f46',
          text: '#a7f3d0',
          textDeep: '#a7f3d0'
        },
        warning: {
          bg: '#451a03',
          border: '#92400e',
          text: '#fef08a',
          textDeep: '#fef08a'
        },
        danger: {
          bg: '#4c0519',
          border: '#9f1239',
          text: '#fecdd3',
          textDeep: '#fecdd3'
        }
      },
      selection: {
        bg: '#0f2c47'
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
