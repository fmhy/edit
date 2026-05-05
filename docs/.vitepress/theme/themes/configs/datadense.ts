import type { Theme } from '../types'

export const datadenseTheme: Theme = {
  name: 'datadense',
  displayName: 'Data-Dense',
  preview: 'linear-gradient(135deg, #2563eb 0%, #475569 50%, #2563eb 100%)',
  fonts: {
    body: "'Inter', 'SF Pro Text', system-ui, -apple-system, sans-serif",
    heading: "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif"
  },
  borderRadius: '2px',
  spacing: {
    small: '2px',
    medium: '4px',
    large: '8px'
  },
  modes: {
    light: {
      brand: {
        1: '#2563eb',
        2: '#3b82f6',
        3: '#1d4ed8',
        soft: '#60a5fa'
      },
      bg: '#f8f9fa',
      bgAlt: '#e9ecef',
      bgElv: '#ffffff',
      bgMark: '#dee2e6',
      text: {
        1: '#0f172a',
        2: '#334155',
        3: '#64748b'
      },
      button: {
        brand: {
          bg: '#2563eb',
          border: '#2563eb',
          text: '#ffffff',
          hoverBorder: '#1d4ed8',
          hoverText: '#ffffff',
          hoverBg: '#1d4ed8',
          activeBorder: '#1e40af',
          activeText: '#ffffff',
          activeBg: '#1e40af'
        },
        alt: {
          bg: '#e2e8f0',
          text: '#0f172a',
          hoverBg: '#cbd5e1',
          hoverText: '#0f172a'
        }
      },
      customBlock: {
        info: {
          bg: '#dbeafe',
          border: '#3b82f6',
          text: '#1e40af',
          textDeep: '#1e3a8a'
        },
        tip: {
          bg: '#d1fae5',
          border: '#10b981',
          text: '#065f46',
          textDeep: '#064e3b'
        },
        warning: {
          bg: '#fef3c7',
          border: '#f59e0b',
          text: '#92400e',
          textDeep: '#78350f'
        },
        danger: {
          bg: '#ffe4e6',
          border: '#ef4444',
          text: '#9f1239',
          textDeep: '#881337'
        }
      },
      selection: {
        bg: '#bfdbfe'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground: '-webkit-linear-gradient(120deg, #2563eb 30%, #475569)',
        heroImageBackground: 'linear-gradient(-45deg, #2563eb 50%, #475569 50%)',
        heroImageFilter: 'blur(44px)'
      }
    },
    dark: {
      brand: {
        1: '#60a5fa',
        2: '#3b82f6',
        3: '#2563eb',
        soft: '#93c5fd'
      },
      bg: '#0d1117',
      bgAlt: '#161b22',
      bgElv: '#1c2128',
      bgMark: '#21262d',
      text: {
        1: '#f0f6fc',
        2: '#c9d1d9',
        3: '#8b949e'
      },
      button: {
        brand: {
          bg: '#2563eb',
          border: '#3b82f6',
          text: '#ffffff',
          hoverBorder: '#60a5fa',
          hoverText: '#ffffff',
          hoverBg: '#3b82f6',
          activeBorder: '#60a5fa',
          activeText: '#ffffff',
          activeBg: '#1d4ed8'
        },
        alt: {
          bg: '#21262d',
          text: '#f0f6fc',
          hoverBg: '#30363d',
          hoverText: '#f0f6fc'
        }
      },
      customBlock: {
        info: {
          bg: '#0c4a6e',
          border: '#3b82f6',
          text: '#bfdbfe',
          textDeep: '#93c5fd'
        },
        tip: {
          bg: '#064e3b',
          border: '#10b981',
          text: '#a7f3d0',
          textDeep: '#6ee7b7'
        },
        warning: {
          bg: '#78350f',
          border: '#f59e0b',
          text: '#fde68a',
          textDeep: '#fcd34d'
        },
        danger: {
          bg: '#881337',
          border: '#ef4444',
          text: '#fecdd3',
          textDeep: '#fca5a5'
        }
      },
      selection: {
        bg: '#1e40af'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground: '-webkit-linear-gradient(120deg, #60a5fa 30%, #8b949e)',
        heroImageBackground: 'linear-gradient(-45deg, #2563eb 50%, #475569 50%)',
        heroImageFilter: 'blur(44px)'
      }
    }
  },
  customProperties: {
    '--vp-datadense-radius': '2px',
    '--vp-datadense-content-max-width': '1100px'
  }
}
