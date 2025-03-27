/**
 *  Copyright (c) 2025 taskylizard. Apache License 2.0.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import type { Rule } from 'unocss'
import { colors, shortcuts } from '@fmhy/colors'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  transformerDirectives
} from 'unocss'

const colorScales = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950'
] as const

const colorPattern = Object.keys(colors).join('|')
const createColorRules = (type: 'text' | 'bg' | 'border'): Rule[] => {
  const property =
    type === 'text'
      ? 'color'
      : type === 'bg'
        ? 'background-color'
        : 'border-color'

  return colorScales.map(
    (scale) =>
      [
        new RegExp(`^${type}-(${colorPattern})-${scale}$`),
        ([, color]) => ({ [property]: colors[color][scale] })
      ] as const
  )
}

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
  rules: [
    // Brand color utilities
    [
      /^brand-(\d+)$/,
      ([, d]) => ({ color: `var(--vp-c-brand-${d})` })
    ] as const,
    [
      /^bg-brand-(\d+)$/,
      ([, d]) => ({ 'background-color': `var(--vp-c-brand-${d})` })
    ] as const,
    [
      /^border-brand-(\d+)$/,
      ([, d]) => ({ 'border-color': `var(--vp-c-brand-${d})` })
    ] as const,
    [
      /^text-brand-(\d+)$/,
      ([, d]) => ({ color: `var(--vp-c-brand-${d})` })
    ] as const,

    // Color scale utilities
    ...createColorRules('text'),
    ...createColorRules('bg'),
    ...createColorRules('border')
  ],
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
