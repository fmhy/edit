import type { Theme } from '../types'

export const draculaTheme: Theme = {
  displayName: 'Dracula',
  preview: 'https://avatars.githubusercontent.com/u/6770408?s=200&v=4',
  modes: {
    light: {
      brand: {
        1: '#644AC9',
        2: '#A3144D',
        3: '#7862D0',
        soft: 'rgba(100, 74, 201, 0.12)'
      },
      bg: '#FFFBEB',
      bgAlt: '#ECE9DF',
      bgElv: '#EFEDDC',
      text: {
        1: '#1F1F1F',
        2: '#4E4839',
        3: '#6C664B'
      },
      button: {
        brand: {
          bg: '#644AC9',
          border: '#644AC9',
          text: '#FFFBEB',
          hoverBorder: '#A3144D',
          hoverText: '#FFFBEB',
          hoverBg: '#A3144D',
          activeBorder: '#7862D0',
          activeText: '#FFFBEB',
          activeBg: '#7862D0'
        },
        alt: {
          bg: '#DEDCCF',
          text: '#1F1F1F',
          hoverBg: '#CECCC0',
          hoverText: '#1F1F1F'
        }
      },
      customBlock: {
        info: {
          bg: '#E1F1F8',
          border: '#036A96',
          text: '#036A96',
          textDeep: '#024E6E'
        },
        tip: {
          bg: '#E3F5E1',
          border: '#14710A',
          text: '#14710A',
          textDeep: '#0E5007'
        },
        warning: {
          bg: '#FCEEE6',
          border: '#A34D14',
          text: '#A34D14',
          textDeep: '#7D380B'
        },
        danger: {
          bg: '#FDE8E5',
          border: '#CB3A2A',
          text: '#CB3A2A',
          textDeep: '#9B271A'
        }
      },
      selection: {
        bg: '#CFCFDE'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground:
          '-webkit-linear-gradient(120deg, #644AC9 30%, #A3144D)',
        heroImageBackground:
          'linear-gradient(-45deg, #644AC9 50%, #A3144D 50%)',
        heroImageFilter: 'blur(44px)'
      }
    },
    dark: {
      brand: {
        1: '#BD93F9',
        2: '#FF79C6',
        3: '#D6ACFF',
        soft: 'rgba(189, 147, 249, 0.16)'
      },
      bg: '#282A36',
      bgAlt: '#21222C',
      bgElv: '#343746',
      text: {
        1: '#F8F8F2',
        2: '#C3C7D5',
        3: '#6272A4'
      },
      button: {
        brand: {
          bg: '#BD93F9',
          border: '#BD93F9',
          text: '#282A36',
          hoverBorder: '#FF79C6',
          hoverText: '#282A36',
          hoverBg: '#FF79C6',
          activeBorder: '#FF79C6',
          activeText: '#282A36',
          activeBg: '#FF92DF'
        },
        alt: {
          bg: '#44475A',
          text: '#F8F8F2',
          hoverBg: '#6272A4',
          hoverText: '#F8F8F2'
        }
      },
      customBlock: {
        info: {
          bg: '#1e2638',
          border: '#8BE9FD',
          text: '#8BE9FD',
          textDeep: '#A4FFFF'
        },
        tip: {
          bg: '#1a332a',
          border: '#50FA7B',
          text: '#50FA7B',
          textDeep: '#69FF94'
        },
        warning: {
          bg: '#3d3024',
          border: '#FFB86C',
          text: '#FFB86C',
          textDeep: '#F1FA8C'
        },
        danger: {
          bg: '#3d1f28',
          border: '#FF5555',
          text: '#FF5555',
          textDeep: '#FF6E6E'
        }
      },
      selection: {
        bg: '#44475A'
      },
      home: {
        heroNameColor: 'transparent',
        heroNameBackground:
          '-webkit-linear-gradient(120deg, #BD93F9 30%, #FF79C6)',
        heroImageBackground:
          'linear-gradient(-45deg, #BD93F9 50%, #FF79C6 50%)',
        heroImageFilter: 'blur(44px)'
      }
    }
  }
}
