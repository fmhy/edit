import type { Theme } from '../types'

export const halloweenTheme: Theme = {
  displayName: 'Halloween',
  preview: 'linear-gradient(135deg, #EA580C 0%, #7C3AED 100%)',
  modes: {
    light: {
      brand: {
        1: '#C2410C',
        2: '#9A3412',
        3: '#7C2D12',
        soft: '#FB923C'
      },
      bg: '#faf7f4',
      bgAlt: '#f2ece6',
      bgElv: 'rgba(255, 255, 255, 0.8)',
      text: {
        1: '#1c1917',
        2: '#44403c',
        3: '#78716c'
      },
      button: {
        brand: {
          bg: '#EA580C',
          border: '#C2410C',
          text: '#fff7ed',
          hoverBorder: '#9A3412',
          hoverText: '#fff7ed',
          hoverBg: '#C2410C',
          activeBorder: '#7C2D12',
          activeText: '#fff7ed',
          activeBg: '#9A3412'
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
          bg: '#ffedd5',
          border: '#c2410c',
          text: '#9a3412',
          textDeep: '#7c2d12'
        },
        tip: {
          bg: '#dcfce7',
          border: '#4d7c0f',
          text: '#3f6212',
          textDeep: '#365314'
        },
        warning: {
          bg: '#fef3c7',
          border: '#b45309',
          text: '#92400e',
          textDeep: '#78350f'
        },
        danger: {
          bg: '#fee2e2',
          border: '#b91c1c',
          text: '#991b1b',
          textDeep: '#7f1d1d'
        }
      },
      selection: {
        bg: '#fed7aa'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground:
          '-webkit-linear-gradient(120deg, #EA580C 30%, #7C3AED)',
        heroImageBackground:
          'linear-gradient(-45deg, #EA580C 50%, #7C3AED 50%)',
        heroImageFilter: 'blur(44px)'
      }
    },
    dark: {
      brand: {
        1: '#FB923C',
        2: '#FDBA74',
        3: '#F97316',
        soft: '#A78BFA'
      },
      bg: '#17141a',
      bgAlt: '#110f14',
      bgElv: 'rgba(17, 15, 20, 0.8)',
      text: {
        1: '#f8f7ff',
        2: '#d6d3d1',
        3: '#a8a29e'
      },
      button: {
        brand: {
          bg: '#EA580C',
          border: '#F97316',
          text: '#1a0f05',
          hoverBorder: '#FB923C',
          hoverText: '#1a0f05',
          hoverBg: '#F97316',
          activeBorder: '#FDBA74',
          activeText: '#1a0f05',
          activeBg: '#EA580C'
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
          bg: '#431407',
          border: '#c2410c',
          text: '#fdba74',
          textDeep: '#fdba74'
        },
        tip: {
          bg: '#052e16',
          border: '#4d7c0f',
          text: '#bbf7d0',
          textDeep: '#bbf7d0'
        },
        warning: {
          bg: '#451a03',
          border: '#b45309',
          text: '#fcd34d',
          textDeep: '#fcd34d'
        },
        danger: {
          bg: '#450a0a',
          border: '#b91c1c',
          text: '#fecaca',
          textDeep: '#fecaca'
        }
      },
      selection: {
        bg: '#7c2d12'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground:
          '-webkit-linear-gradient(120deg, #FDBA74 30%, #A78BFA)',
        heroImageBackground:
          'linear-gradient(-45deg, #F97316 50%, #7C3AED 50%)',
        heroImageFilter: 'blur(44px)'
      }
    }
  }
}
