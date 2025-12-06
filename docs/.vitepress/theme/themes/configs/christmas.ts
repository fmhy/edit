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

export const christmasTheme: Theme = {
  name: 'Christmas',
  displayName: 'Christmas',
  preview: 'https://raw.githubusercontent.com/SamidyFR/edit/refs/heads/main/docs/.vitepress/theme/themes/configs/christmas_tree.png',
  modes: {
    light: {
      brand: {
        1: '#BD2F2F',
        2: '#22ff00ff',
        3: '#155C2F',
        soft: '#a200ffff'
      },
      bg: '#ffffffff',
      bgAlt: '#f9fafb',
      bgElv: 'rgba(255, 255, 255, 0.7)',
      bgMark: 'rgb(232, 232, 232)',
      text: {
        1: '#DEDDD4',
        2: '#4b5563',
        3: '#353638ff'
      },
      button: {
        brand: {
          bg: '#155C2F',
          border: '#0E3B1F',
          text: 'rgba(255, 255, 255)',
          hoverBorder: '#072a15ff',
          hoverText: 'rgba(255, 255, 255)',
          hoverBg: '#072a15ff',
          activeBorder: '#072a15ff',
          activeText: 'rgba(255, 255, 255)',
          activeBg: '#072a15ff'
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
          bg: '#dbeafe',
          border: '#1e40af',
          text: '#1e40af',
          textDeep: '#1e3a8a'
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
        bg: '#bfdbfe'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground: '-webkit-linear-gradient(120deg, #BD2F2F 30%, #f9fafb)',
        heroImageBackground: 'linear-gradient(-45deg, #BD2F2F 50%, #f9fafb 50%)',
        heroImageFilter: 'blur(44px)'
      }
    },
    dark: {
      brand: {
        1: '#2CA03C',
        2: '#22ff00ff',
        3: '#5C151A',
        soft: '#a200ffff'
      },
      bg: 'rgb(26, 26, 26)',
      bgAlt: 'rgb(23, 23, 23)',
      bgElv: 'rgba(23, 23, 23, 0.8)',
      button: {
        brand: {
          bg: '#155C2F',
          border: '#0E3B1F',
          text: 'rgba(255, 255, 255)',
          hoverBorder: '#072a15ff',
          hoverText: 'rgba(255, 255, 255)',
          hoverBg: '#072a15ff',
          activeBorder: '#072a15ff',
          activeText: 'rgba(255, 255, 255)',
          activeBg: '#072a15ff'
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
          bg: '#0c4a6e',
          border: '#0284c7',
          text: '#bae6fd',
          textDeep: '#bae6fd'
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
        bg: '#1e3a8a'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground: '-webkit-linear-gradient(120deg, #f9fafb 30%, #BD2F2F)',
        heroImageBackground: 'linear-gradient(-45deg, #f9fafb 50%,#BD2F2F 50%)',
        heroImageFilter: 'blur(44px)'
      }
    }
  }
}
