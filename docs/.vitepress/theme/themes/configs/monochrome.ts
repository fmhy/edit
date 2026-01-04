import type { Theme } from '../types'

export const monochromeTheme: Theme = {
    name: 'monochrome',
    displayName: 'Monochrome',
    preview: '#808080',
    modes: {
        light: {
            brand: {
                1: '#000000',
                2: '#1a1a1a',
                3: '#333333',
                soft: '#666666'
            },
            bg: '#FFFFFF',
            bgAlt: '#F5F5F5',
            bgElv: 'rgba(255, 255, 255, 0.95)',
            bgMark: '#E0E0E0',
            text: {
                1: '#000000',
                2: '#333333',
                3: '#808080'
            },
            button: {
                brand: {
                    bg: '#000000',
                    border: '#000000',
                    text: '#FFFFFF',
                    hoverBorder: '#333333',
                    hoverText: '#FFFFFF',
                    hoverBg: '#333333',
                    activeBorder: '#000000',
                    activeText: '#FFFFFF',
                    activeBg: '#000000'
                },
                alt: {
                    bg: '#808080',
                    text: '#FFFFFF',
                    hoverBg: '#666666',
                    hoverText: '#FFFFFF'
                }
            },
            customBlock: {
                info: {
                    bg: '#F5F5F5',
                    border: '#000000',
                    text: '#000000',
                    textDeep: '#000000'
                },
                tip: {
                    bg: '#F5F5F5',
                    border: '#333333',
                    text: '#1a1a1a',
                    textDeep: '#000000'
                },
                warning: {
                    bg: '#F5F5F5',
                    border: '#666666',
                    text: '#333333',
                    textDeep: '#1a1a1a'
                },
                danger: {
                    bg: '#F5F5F5',
                    border: '#000000',
                    text: '#000000',
                    textDeep: '#000000'
                }
            },
            selection: {
                bg: '#CCCCCC'
            },
            home: {
                heroNameColor: '#000000',
                heroNameBackground: '#FFFFFF',
                heroImageBackground: 'linear-gradient(135deg, #E0E0E0 0%, #FFFFFF 100%)',
                heroImageFilter: 'blur(44px)'
            }
        },
        dark: {
            brand: {
                1: '#FFFFFF',
                2: '#E0E0E0',
                3: '#CCCCCC',
                soft: '#999999'
            },
            bg: '#000000',
            bgAlt: '#0A0A0A',
            bgElv: 'rgba(0, 0, 0, 0.95)',
            bgMark: '#1A1A1A',
            text: {
                1: '#FFFFFF',
                2: '#CCCCCC',
                3: '#808080'
            },
            button: {
                brand: {
                    bg: '#FFFFFF',
                    border: '#FFFFFF',
                    text: '#000000',
                    hoverBorder: '#CCCCCC',
                    hoverText: '#000000',
                    hoverBg: '#CCCCCC',
                    activeBorder: '#FFFFFF',
                    activeText: '#000000',
                    activeBg: '#FFFFFF'
                },
                alt: {
                    bg: '#808080',
                    text: '#000000',
                    hoverBg: '#999999',
                    hoverText: '#000000'
                }
            },
            customBlock: {
                info: {
                    bg: '#1A1A1A',
                    border: '#FFFFFF',
                    text: '#FFFFFF',
                    textDeep: '#FFFFFF'
                },
                tip: {
                    bg: '#1A1A1A',
                    border: '#CCCCCC',
                    text: '#E0E0E0',
                    textDeep: '#FFFFFF'
                },
                warning: {
                    bg: '#1A1A1A',
                    border: '#999999',
                    text: '#CCCCCC',
                    textDeep: '#E0E0E0'
                },
                danger: {
                    bg: '#1A1A1A',
                    border: '#FFFFFF',
                    text: '#FFFFFF',
                    textDeep: '#FFFFFF'
                }
            },
            selection: {
                bg: '#333333'
            },
            home: {
                heroNameColor: '#FFFFFF',
                heroNameBackground: '#000000',
                heroImageBackground: 'linear-gradient(135deg, #1A1A1A 0%, #000000 100%)',
                heroImageFilter: 'blur(44px)'
            }
        }
    }
}
