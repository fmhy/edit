import type { Theme } from '../types'

export const monolithTheme: Theme = {
  name: 'monolith',
  displayName: 'Monolith',
  preview: '',
  fonts: {
    body: "'JetBrains Mono', monospace",
    heading: "'JetBrains Mono', monospace"
  },
  borderRadius: '0px',
  modes: {
    light: {
      brand: {
        1: '#D81B70',
        2: '#2D0B80',
        3: '#0047B8',
        soft: '#3AA8D8'
      },
      bg: '#F5FBFF',
      bgAlt: '#E8F4FD',
      bgElv: '#E8F4FD',
      bgMark: '#D0E8F5',
      text: {
        1: '#0A0E1A',
        2: '#3A4560',
        3: '#6B7B9A'
      },
      button: {
        brand: {
          bg: '#D81B70',
          border: '#D81B70',
          text: '#FFFFFF',
          hoverBorder: '#C2185B',
          hoverText: '#FFFFFF',
          hoverBg: '#C2185B',
          activeBorder: '#AD1457',
          activeText: '#FFFFFF',
          activeBg: '#AD1457'
        },
        alt: {
          bg: '#E0EAF5',
          text: '#1A2035',
          hoverBg: '#C8D6E8',
          hoverText: '#1A2035'
        }
      },
      customBlock: {
        info: {
          bg: '#DBEAFE',
          border: '#005EFF',
          text: '#1E40AF',
          textDeep: '#1E3A8A'
        },
        tip: {
          bg: '#D1FAE5',
          border: '#059669',
          text: '#065F46',
          textDeep: '#064E3B'
        },
        warning: {
          bg: '#FEF3C7',
          border: '#D97706',
          text: '#92400E',
          textDeep: '#78350F'
        },
        danger: {
          bg: '#FEE2E2',
          border: '#DC2626',
          text: '#991B1B',
          textDeep: '#7F1D1D'
        }
      },
      selection: {
        bg: '#46C7FF'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground:
          '-webkit-linear-gradient(120deg, #FFD700 20%, #4CAF50 50%, #2196F3 80%)',
        heroImageBackground:
          'linear-gradient(-45deg, #FFD700 20%, #4CAF50 50%, #2196F3 80%)',
        heroImageFilter: 'blur(44px)'
      }
    },
    dark: {
      brand: {
        1: '#F42A8B',
        2: '#3A0CA3',
        3: '#005EFF',
        soft: '#46C7FF'
      },
      bg: '#06070B',
      bgAlt: '#0A0B12',
      bgElv: 'rgba(6, 7, 11, 0.95)',
      bgMark: '#0D0F18',
      text: {
        1: '#D2F4FF',
        2: '#A8C5D6',
        3: '#467085'
      },
      button: {
        brand: {
          bg: '#F42A8B',
          border: '#F42A8B',
          text: '#FFFFFF',
          hoverBorder: '#D81B70',
          hoverText: '#FFFFFF',
          hoverBg: '#D81B70',
          activeBorder: '#C2185B',
          activeText: '#FFFFFF',
          activeBg: '#C2185B'
        },
        alt: {
          bg: '#1A1B25',
          text: '#D2F4FF',
          hoverBg: '#242533',
          hoverText: '#D2F4FF'
        }
      },
      customBlock: {
        info: {
          bg: '#0D1B2A',
          border: '#005EFF',
          text: '#46C7FF',
          textDeep: '#005EFF'
        },
        tip: {
          bg: '#0D2818',
          border: '#1B8A4E',
          text: '#4ADE80',
          textDeep: '#22C55E'
        },
        warning: {
          bg: '#2D1F06',
          border: '#D97706',
          text: '#FBBF24',
          textDeep: '#D97706'
        },
        danger: {
          bg: '#2D0A0A',
          border: '#DC2626',
          text: '#F87171',
          textDeep: '#DC2626'
        }
      },
      selection: {
        bg: '#005EFF'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground:
          '-webkit-linear-gradient(120deg, #FFD700 20%, #4CAF50 50%, #2196F3 80%)',
        heroImageBackground:
          'linear-gradient(-45deg, #FFD700 20%, #4CAF50 50%, #2196F3 80%)',
        heroImageFilter: 'blur(44px)'
      }
    }
  }
}
