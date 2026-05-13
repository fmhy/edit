import type { Theme } from '../types'

export const infiniteCanvasTheme: Theme = {
  name: 'infinite-canvas',
  displayName: 'Infinite Canvas',
  preview: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)',
  modes: {
    light: {
      brand: {
        1: '#4F46E5',
        2: '#6366F1',
        3: '#818CF8',
        soft: '#A5B4FC'
      },
      bg: '#FAFAFA',
      bgAlt: '#F0F0F0',
      bgElv: '#FFFFFF',
      bgMark: '#E5E5E5',
      text: {
        1: '#18181B',
        2: '#3F3F46',
        3: '#71717A'
      },
      button: {
        brand: {
          bg: '#4F46E5',
          border: '#4F46E5',
          text: '#FFFFFF',
          hoverBorder: '#6366F1',
          hoverText: '#FFFFFF',
          hoverBg: '#6366F1',
          activeBorder: '#4338CA',
          activeText: '#FFFFFF',
          activeBg: '#4338CA'
        },
        alt: {
          bg: '#E4E4E7',
          text: '#18181B',
          hoverBg: '#D4D4D8',
          hoverText: '#18181B'
        }
      },
      customBlock: {
        info: {
          bg: '#EEF2FF',
          border: '#4F46E5',
          text: '#4338CA',
          textDeep: '#3730A3'
        },
        tip: {
          bg: '#F0FDF4',
          border: '#16A34A',
          text: '#15803D',
          textDeep: '#166534'
        },
        warning: {
          bg: '#FFFBEB',
          border: '#D97706',
          text: '#B45309',
          textDeep: '#92400E'
        },
        danger: {
          bg: '#FEF2F2',
          border: '#DC2626',
          text: '#B91C1C',
          textDeep: '#991B1B'
        }
      },
      selection: {
        bg: '#A5B4FC'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground: 'linear-gradient(135deg, #4F46E5, #EC4899)',
        heroImageBackground:
          'linear-gradient(135deg, #EEF2FF 0%, #FAFAFA 100%)',
        heroImageFilter: 'blur(44px)'
      }
    },
    dark: {
      brand: {
        1: '#818CF8',
        2: '#6366F1',
        3: '#4F46E5',
        soft: '#3730A3'
      },
      bg: '#18181B',
      bgAlt: '#1F1F23',
      bgElv: '#27272A',
      bgMark: '#3F3F46',
      text: {
        1: '#FAFAFA',
        2: '#D4D4D8',
        3: '#A1A1AA'
      },
      button: {
        brand: {
          bg: '#818CF8',
          border: '#818CF8',
          text: '#18181B',
          hoverBorder: '#A5B4FC',
          hoverText: '#18181B',
          hoverBg: '#A5B4FC',
          activeBorder: '#6366F1',
          activeText: '#FFFFFF',
          activeBg: '#6366F1'
        },
        alt: {
          bg: '#3F3F46',
          text: '#FAFAFA',
          hoverBg: '#52525B',
          hoverText: '#FAFAFA'
        }
      },
      customBlock: {
        info: {
          bg: '#1E1B4B',
          border: '#4F46E5',
          text: '#A5B4FC',
          textDeep: '#C7D2FE'
        },
        tip: {
          bg: '#052E16',
          border: '#16A34A',
          text: '#86EFAC',
          textDeep: '#BBF7D0'
        },
        warning: {
          bg: '#451A03',
          border: '#D97706',
          text: '#FDE68A',
          textDeep: '#FEF3C7'
        },
        danger: {
          bg: '#450A0A',
          border: '#DC2626',
          text: '#FECACA',
          textDeep: '#FEE2E2'
        }
      },
      selection: {
        bg: '#312E81'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground: 'linear-gradient(135deg, #818CF8, #F472B6)',
        heroImageBackground:
          'linear-gradient(135deg, #18181B 0%, #27272A 100%)',
        heroImageFilter: 'blur(44px)'
      }
    }
  },
  fonts: {
    body: "'Inter', 'SF Pro Text', system-ui, -apple-system, sans-serif",
    heading: "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif"
  },
  borderRadius: '12px',
  spacing: {
    small: '8px',
    medium: '16px',
    large: '32px'
  },
  customProperties: {
    '--vp-infinite-dot-color': 'rgba(0, 0, 0, 0.06)',
    '--vp-infinite-dot-color-dark': 'rgba(255, 255, 255, 0.06)',
    '--vp-infinite-dot-size': '20px',
    '--vp-infinite-card-shadow':
      '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
    '--vp-infinite-card-hover-shadow':
      '0 4px 12px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
    '--vp-infinite-card-radius': '12px',
    '--vp-infinite-card-border': '1px solid rgba(0,0,0,0.04)',
    '--vp-infinite-card-padding': '24px',
    '--vp-infinite-glass-bg': 'rgba(255,255,255,0.6)',
    '--vp-infinite-glass-bg-dark': 'rgba(24,24,27,0.6)'
  }
}
