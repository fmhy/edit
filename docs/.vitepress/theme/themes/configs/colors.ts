import type { Theme } from '../types'
import { colors } from '../../utils/colors'

export type ColorNames = keyof typeof colors

export const normalizeColorName = (colorName: string): string =>
  colorName.replaceAll(/-/g, ' ').charAt(0).toUpperCase() +
  colorName.slice(1).replaceAll(/-/g, ' ')

export const generateThemeFromColor = (colorName: ColorNames): Theme => {
  const colorSet = colors[colorName]

  return {
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
          heroNameBackground:
            '-webkit-linear-gradient(120deg, #c4b5fd 30%, #7bc5e4)',
          heroImageBackground:
            'linear-gradient(-45deg, #c4b5fd 50%, #47caff 50%)',
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
          heroNameBackground:
            '-webkit-linear-gradient(120deg, #c4b5fd 30%, #7bc5e4)',
          heroImageBackground:
            'linear-gradient(-45deg, #c4b5fd 50%, #47caff 50%)',
          heroImageFilter: 'blur(44px)'
        }
      }
    }
  }
}

export const colorThemes: Record<string, Theme> = {}

for (const key of Object.keys(colors) as ColorNames[]) {
  colorThemes[`color-${key}`] = generateThemeFromColor(key)
}
