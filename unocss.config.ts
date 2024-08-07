import {
  defineConfig,
  presetUno,
  presetAttributify,
  presetIcons,
  transformerDirectives
} from 'unocss'
import { colors, shortcuts } from '@fmhy/colors'

export default defineConfig({
  content: {
    filesystem: ['.vitepress/config.mts', '.vitepress/constants.ts']
  },
  theme: {
    colors: {
      ...colors,
      primary: 'var(--vp-c-brand-1)',
      bg: 'var(--vp-c-bg)',
      'bg-alt': 'var(--vp-c-bg-alt)',
      'bg-elv': 'var(--vp-c-bg-elv)',
      text: 'var(--vp-c-text-1)',
      'text-2': 'var(--vp-c-text-2)',
      div: 'var(--vp-c-divider)'
    }
  },
  shortcuts,
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle'
      }
    })
  ],
  transformers: [transformerDirectives()]
})
