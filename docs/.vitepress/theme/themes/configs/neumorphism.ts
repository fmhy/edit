import type { Theme } from '../types'

export const neumorphismTheme: Theme = {
  name: 'neumorphism',
  displayName: 'Neumorphism',
  preview: 'linear-gradient(135deg, #e4e9f0 0%, #c8d0d8 50%, #e4e9f0 100%)',
  fonts: {
    body: "'Inter', 'SF Pro Text', system-ui, -apple-system, sans-serif",
    heading: "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif"
  },
  borderRadius: '14px',
  spacing: {
    small: '8px',
    medium: '14px',
    large: '24px'
  },
  modes: {
    light: {
      brand: {
        1: '#6a8fa0',
        2: '#547a8a',
        3: '#406070',
        soft: '#8ab0c0'
      },
      bg: '#e4e9f0',
      bgAlt: '#dee3ea',
      bgElv: '#e4e9f0',
      bgMark: '#d0d5dc',
      text: {
        1: '#2d3748',
        2: '#4a5568',
        3: '#718096'
      },
      button: {
        brand: {
          bg: '#e4e9f0',
          border: '#d5dae1',
          text: '#2d3748',
          hoverBorder: '#c4cad4',
          hoverText: '#1a202c',
          hoverBg: '#dee3ea',
          activeBorder: '#c4cad4',
          activeText: '#1a202c',
          activeBg: '#d5dae1'
        },
        alt: {
          bg: '#d5dae1',
          text: '#2d3748',
          hoverBg: '#c4cad4',
          hoverText: '#1a202c'
        }
      },
      customBlock: {
        info: {
          bg: '#dce4ed',
          border: '#6a8fa0',
          text: '#406070',
          textDeep: '#2e4a58'
        },
        tip: {
          bg: '#dce8e0',
          border: '#6a9a80',
          text: '#3a6048',
          textDeep: '#2e5038'
        },
        warning: {
          bg: '#ede5d8',
          border: '#9a8a60',
          text: '#6a5a30',
          textDeep: '#5a4a28'
        },
        danger: {
          bg: '#eddce0',
          border: '#9a6070',
          text: '#6a3848',
          textDeep: '#5a2838'
        }
      },
      selection: {
        bg: '#b8c4d4'
      },
      home: {
        heroNameColor: '#2d3748',
        heroNameBackground: 'linear-gradient(135deg, #d5dae1 0%, #e4e9f0 100%)',
        heroImageBackground:
          'linear-gradient(-45deg, #c8d0d8 50%, #eef2f6 50%)',
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
      bg: '#282c35',
      bgAlt: '#242830',
      bgElv: '#282c35',
      bgMark: '#323640',
      text: {
        1: '#e4e9f0',
        2: '#a8b0bc',
        3: '#707888'
      },
      button: {
        brand: {
          bg: '#282c35',
          border: '#1e2228',
          text: '#e4e9f0',
          hoverBorder: '#323640',
          hoverText: '#f0f4f8',
          hoverBg: '#2e323c',
          activeBorder: '#323640',
          activeText: '#f0f4f8',
          activeBg: '#22262e'
        },
        alt: {
          bg: '#323640',
          text: '#e4e9f0',
          hoverBg: '#3a3e48',
          hoverText: '#f0f4f8'
        }
      },
      customBlock: {
        info: {
          bg: '#282e3e',
          border: '#5a8aaa',
          text: '#a8c0d0',
          textDeep: '#c8d8e4'
        },
        tip: {
          bg: '#263630',
          border: '#5a8a72',
          text: '#a0c8b0',
          textDeep: '#c0e0d0'
        },
        warning: {
          bg: '#363028',
          border: '#8a7a50',
          text: '#c8c0a0',
          textDeep: '#e0d8b8'
        },
        danger: {
          bg: '#36282e',
          border: '#8a5060',
          text: '#c8a8b8',
          textDeep: '#e0c0c8'
        }
      },
      selection: {
        bg: '#3a4250'
      },
      home: {
        heroNameColor: '#e4e9f0',
        heroNameBackground: 'linear-gradient(135deg, #323640 0%, #282c35 100%)',
        heroImageBackground:
          'linear-gradient(-45deg, #323640 50%, #1e2228 50%)',
        heroImageFilter: 'blur(44px)'
      }
    }
  },
  customProperties: {
    '--vp-neumo-radius': '14px',
    '--vp-neumo-blur': '16px',
    '--vp-neumo-distance': '8px',
    '--vp-neumo-blur-hover': '24px',
    '--vp-neumo-distance-hover': '12px',
    '--vp-neumo-blur-soft': '6px',
    '--vp-neumo-distance-soft': '4px',
    '--vp-neumo-blur-inset': '4px',
    '--vp-neumo-distance-inset': '2px'
  }
}
