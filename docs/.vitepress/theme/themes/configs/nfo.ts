import type { Theme } from '../types'

const nfoFont = "'PxPlus IBM VGA8', 'Lucida Console', 'Courier New', monospace"

// 1-bit pixel art 3.5" Floppy Disk with NFO label
const nfoPreviewIcon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32' shape-rendering='crispEdges'%3E%3Crect width='32' height='32' fill='%23000000'/%3E%3Crect x='5' y='4' width='19' height='1' fill='%23ffffff'/%3E%3Crect x='24' y='5' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='25' y='6' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='26' y='7' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='27' y='7' width='1' height='21' fill='%23ffffff'/%3E%3Crect x='4' y='4' width='1' height='25' fill='%23ffffff'/%3E%3Crect x='5' y='28' width='23' height='1' fill='%23ffffff'/%3E%3Crect x='5' y='5' width='22' height='23' fill='%230d0d0d'/%3E%3Crect x='9' y='5' width='13' height='7' fill='%238c8c8c'/%3E%3Crect x='12' y='6' width='3' height='5' fill='%23000000'/%3E%3Crect x='7' y='14' width='18' height='11' fill='%231a1a1a'/%3E%3Crect x='7' y='14' width='18' height='1' fill='%23444444'/%3E%3Cg fill='%23ffffff'%3E%3Crect x='9' y='17' width='1' height='5'/%3E%3Crect x='10' y='18' width='1' height='1'/%3E%3Crect x='11' y='19' width='1' height='1'/%3E%3Crect x='12' y='17' width='1' height='5'/%3E%3Crect x='14' y='17' width='1' height='5'/%3E%3Crect x='15' y='17' width='3' height='1'/%3E%3Crect x='15' y='19' width='2' height='1'/%3E%3Crect x='19' y='17' width='1' height='5'/%3E%3Crect x='22' y='17' width='1' height='5'/%3E%3Crect x='20' y='17' width='2' height='1'/%3E%3Crect x='20' y='21' width='2' height='1'/%3E%3C/g%3E%3Crect x='23' y='24' width='2' height='2' fill='%23000000'/%3E%3C/svg%3E"

export const nfoTheme: Theme = {
  displayName: 'NFO',
  preview: `url("${nfoPreviewIcon}") center/contain no-repeat #000000`,
  fonts: {
    body: nfoFont
  },
  modes: {
    light: {
      brand: {
        1: '#000000',
        2: '#222222',
        3: '#666666',
        soft: '#e8e8e8'
      },
      bg: '#ffffff',
      bgAlt: '#f4f4f4',
      bgElv: '#ffffff',
      text: {
        1: '#141414',
        2: '#555555',
        3: '#777777'
      },
      button: {
        brand: {
          bg: '#000000',
          border: '#000000',
          text: '#ffffff',
          hoverBorder: '#000000',
          hoverText: '#000000',
          hoverBg: '#ffffff',
          activeBorder: '#000000',
          activeText: '#ffffff',
          activeBg: '#222222'
        },
        alt: {
          bg: '#f4f4f4',
          text: '#000000',
          hoverBg: '#000000',
          hoverText: '#ffffff'
        }
      },
      customBlock: {
        info: {
          bg: '#f4f4f4',
          border: '#555555',
          text: '#141414',
          textDeep: '#000000'
        },
        tip: {
          bg: '#f4f4f4',
          border: '#555555',
          text: '#141414',
          textDeep: '#000000'
        },
        warning: {
          bg: '#f4f4f4',
          border: '#222222',
          text: '#141414',
          textDeep: '#000000'
        },
        danger: {
          bg: '#f4f4f4',
          border: '#000000',
          text: '#000000',
          textDeep: '#000000'
        }
      },
      selection: {
        bg: '#000000'
      },
      home: {
        heroNameColor: '#000000',
        heroNameBackground: 'none',
        heroImageBackground: 'none',
        heroImageFilter: 'none'
      }
    },
    dark: {
      brand: {
        1: '#ffffff',
        2: '#c2c2c2',
        3: '#767676',
        soft: '#2a2a2a'
      },
      bg: '#000000',
      bgAlt: '#080808',
      bgElv: '#080808',
      text: {
        1: '#c2c2c2',
        2: '#767676',
        3: '#525252'
      },
      button: {
        brand: {
          bg: '#ffffff',
          border: '#ffffff',
          text: '#000000',
          hoverBorder: '#ffffff',
          hoverText: '#ffffff',
          hoverBg: '#000000',
          activeBorder: '#ffffff',
          activeText: '#000000',
          activeBg: '#c2c2c2'
        },
        alt: {
          bg: '#080808',
          text: '#c2c2c2',
          hoverBg: '#ffffff',
          hoverText: '#000000'
        }
      },
      customBlock: {
        info: {
          bg: '#080808',
          border: '#525252',
          text: '#c2c2c2',
          textDeep: '#ffffff'
        },
        tip: {
          bg: '#080808',
          border: '#767676',
          text: '#c2c2c2',
          textDeep: '#ffffff'
        },
        warning: {
          bg: '#080808',
          border: '#c2c2c2',
          text: '#c2c2c2',
          textDeep: '#ffffff'
        },
        danger: {
          bg: '#080808',
          border: '#ffffff',
          text: '#ffffff',
          textDeep: '#ffffff'
        }
      },
      selection: {
        bg: '#ffffff'
      },
      home: {
        heroNameColor: '#ffffff',
        heroNameBackground: 'none',
        heroImageBackground: 'none',
        heroImageFilter: 'none'
      }
    }
  }
}
