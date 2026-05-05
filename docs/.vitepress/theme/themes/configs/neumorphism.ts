import type { Theme } from '../types'

export const neumorphismTheme: Theme = {
  name: 'neumorphism',
  displayName: 'Neumorphism',
  preview: 'linear-gradient(135deg, #e8ecf1 0%, #c8d0d8 50%, #e8ecf1 100%)',
  borderRadius: '12px',
  spacing: {
    small: '8px',
    medium: '16px',
    large: '28px'
  },
  modes: {
    light: {
      brand: {
        1: '#5d8b9e',
        2: '#4a7285',
        3: '#3a5a6b',
        soft: '#7aacbf'
      },
      bg: '#e8ecf1',
      bgAlt: '#dfe3e8',
      bgElv: '#e8ecf1',
      bgMark: '#d0d5dc',
      text: {
        1: '#2e3440',
        2: '#5a6270',
        3: '#8b92a0'
      },
      button: {
        brand: {
          bg: '#e8ecf1',
          border: '#d5dae0',
          text: '#2e3440',
          hoverBorder: '#c4cbd6',
          hoverText: '#2e3440',
          hoverBg: '#e0e4e9',
          activeBorder: '#c4cbd6',
          activeText: '#2e3440',
          activeBg: '#dce0e5'
        },
        alt: {
          bg: '#d5dae0',
          text: '#2e3440',
          hoverBg: '#c4cbd6',
          hoverText: '#2e3440'
        }
      },
      customBlock: {
        info: {
          bg: '#dce4ed',
          border: '#5d8b9e',
          text: '#3a5a6b',
          textDeep: '#2e4860'
        },
        tip: {
          bg: '#dce8e0',
          border: '#5a8b72',
          text: '#3a6b50',
          textDeep: '#2e5a42'
        },
        warning: {
          bg: '#ede5d8',
          border: '#9a8b5a',
          text: '#7a6b3a',
          textDeep: '#6b5c2e'
        },
        danger: {
          bg: '#eddce0',
          border: '#9a5a6b',
          text: '#7a3a50',
          textDeep: '#6b2e42'
        }
      },
      selection: {
        bg: '#b8c4d0'
      },
      home: {
        heroNameColor: '#2e3440',
        heroNameBackground: 'linear-gradient(135deg, #d5dae0 0%, #e8ecf1 100%)',
        heroImageBackground: 'linear-gradient(-45deg, #c8d0d8 50%, #e8ecf1 50%)',
        heroImageFilter: 'blur(44px)'
      }
    },
    dark: {
      brand: {
        1: '#7ab8c8',
        2: '#5a9aad',
        3: '#4a7a8a',
        soft: '#9ad0e0'
      },
      bg: '#2a2e35',
      bgAlt: '#252930',
      bgElv: '#2a2e35',
      bgMark: '#353a42',
      text: {
        1: '#e8ecf1',
        2: '#b0b6c0',
        3: '#787f8a'
      },
      button: {
        brand: {
          bg: '#2a2e35',
          border: '#20242a',
          text: '#e8ecf1',
          hoverBorder: '#353a42',
          hoverText: '#e8ecf1',
          hoverBg: '#30353c',
          activeBorder: '#353a42',
          activeText: '#e8ecf1',
          activeBg: '#252930'
        },
        alt: {
          bg: '#353a42',
          text: '#e8ecf1',
          hoverBg: '#40454e',
          hoverText: '#e8ecf1'
        }
      },
      customBlock: {
        info: {
          bg: '#2a3240',
          border: '#5a8aaa',
          text: '#b0c8d8',
          textDeep: '#d0e0e8'
        },
        tip: {
          bg: '#283530',
          border: '#5a8a72',
          text: '#a8d0b8',
          textDeep: '#c8e0d0'
        },
        warning: {
          bg: '#353028',
          border: '#8a7a4a',
          text: '#d0c8a0',
          textDeep: '#e0d8b8'
        },
        danger: {
          bg: '#352830',
          border: '#8a4a5a',
          text: '#d0a8b8',
          textDeep: '#e0c0c8'
        }
      },
      selection: {
        bg: '#404852'
      },
      home: {
        heroNameColor: '#e8ecf1',
        heroNameBackground: 'linear-gradient(135deg, #353a42 0%, #2a2e35 100%)',
        heroImageBackground: 'linear-gradient(-45deg, #353a42 50%, #20242a 50%)',
        heroImageFilter: 'blur(44px)'
      }
    }
  },
  customProperties: {
    '--vp-neumo-shadow-light': 'rgba(255, 255, 255, 0.7)',
    '--vp-neumo-shadow-dark': 'rgba(163, 177, 198, 0.5)',
    '--vp-neumo-shadow-light-dark': 'rgba(70, 75, 85, 0.3)',
    '--vp-neumo-shadow-dark-dark': 'rgba(0, 0, 0, 0.5)',
    '--vp-neumo-radius': '12px'
  }
}
