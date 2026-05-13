import type { Theme } from '../types'

export const saasTheme: Theme = {
  name: 'saas',
  displayName: 'SaaS',
  preview: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
  modes: {
    light: {
      brand: {
        1: '#6366f1',
        2: '#4f46e5',
        3: '#818cf8ff',
        soft: '#a5b4fc'
      },
      bg: '#ffffff',
      bgAlt: '#f8fafc',
      bgElv: '#ffffff',
      bgMark: '#eef2f6',
      text: {
        1: '#0f172a',
        2: '#334155',
        3: '#64748b'
      },
      button: {
        brand: {
          bg: '#6366f1',
          border: '#4f46e5',
          text: '#ffffff',
          hoverBorder: '#4338ca',
          hoverText: '#ffffff',
          hoverBg: '#4f46e5',
          activeBorder: '#3730a3',
          activeText: '#ffffff',
          activeBg: '#4338ca'
        },
        alt: {
          bg: '#f1f5f9',
          text: '#334155',
          hoverBg: '#e2e8f0',
          hoverText: '#1e293b'
        }
      },
      customBlock: {
        info: {
          bg: '#eef2ff',
          border: '#6366f1',
          text: '#4338ca',
          textDeep: '#3730a3'
        },
        tip: {
          bg: '#f0fdf4',
          border: '#22c55e',
          text: '#15803d',
          textDeep: '#166534'
        },
        warning: {
          bg: '#fefce8',
          border: '#eab308',
          text: '#a16207',
          textDeep: '#854d0e'
        },
        danger: {
          bg: '#fef2f2',
          border: '#ef4444',
          text: '#b91c1c',
          textDeep: '#991b1b'
        }
      },
      selection: {
        bg: '#c7d2fe'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground:
          '-webkit-linear-gradient(120deg, #6366f1 30%, #38bdf8)',
        heroImageBackground:
          'linear-gradient(-45deg, #6366f1 50%, #38bdf8 50%)',
        heroImageFilter: 'blur(44px)'
      }
    },
    dark: {
      brand: {
        1: '#818cf8',
        2: '#6366f1',
        3: '#a5b4fcff',
        soft: '#6366f1'
      },
      bg: '#0b0f19',
      bgAlt: '#0f172a',
      bgElv: '#111827',
      bgMark: '#1e293b',
      text: {
        1: '#f1f5f9',
        2: '#cbd5e1',
        3: '#64748b'
      },
      button: {
        brand: {
          bg: '#6366f1',
          border: '#4f46e5',
          text: '#ffffff',
          hoverBorder: '#4338ca',
          hoverText: '#ffffff',
          hoverBg: '#4f46e5',
          activeBorder: '#3730a3',
          activeText: '#ffffff',
          activeBg: '#4338ca'
        },
        alt: {
          bg: '#1e293b',
          text: '#cbd5e1',
          hoverBg: '#334155',
          hoverText: '#f1f5f9'
        }
      },
      customBlock: {
        info: {
          bg: '#1e1b4b',
          border: '#6366f1',
          text: '#c7d2fe',
          textDeep: '#a5b4fc'
        },
        tip: {
          bg: '#052e16',
          border: '#22c55e',
          text: '#bbf7d0',
          textDeep: '#86efac'
        },
        warning: {
          bg: '#422006',
          border: '#eab308',
          text: '#fef08a',
          textDeep: '#fde047'
        },
        danger: {
          bg: '#450a0a',
          border: '#ef4444',
          text: '#fecaca',
          textDeep: '#fca5a5'
        }
      },
      selection: {
        bg: '#312e81'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground:
          '-webkit-linear-gradient(120deg, #818cf8 30%, #38bdf8)',
        heroImageBackground:
          'linear-gradient(-45deg, #818cf8 50%, #38bdf8 50%)',
        heroImageFilter: 'blur(44px)'
      }
    }
  },
  fonts: {
    body: "'Inter', 'Geist', 'SF Pro Text', system-ui, -apple-system, sans-serif",
    heading:
      "'Inter', 'Geist', 'SF Pro Display', system-ui, -apple-system, sans-serif"
  },
  borderRadius: '12px',
  spacing: {
    small: '6px',
    medium: '12px',
    large: '20px'
  },
  customProperties: {
    '--vp-saas-card-shadow':
      '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
    '--vp-saas-card-hover-shadow':
      '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
    '--vp-saas-card-radius': '12px',
    '--vp-saas-card-border': '1px solid rgba(0, 0, 0, 0.06)',
    '--vp-saas-card-padding': '20px'
  }
}
