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

import { colors } from './docs/.vitepress/theme/utils/colors'
import {
  defineConfig,
  presetIcons,
  presetUno,
  transformerDirectives
} from 'unocss'

export default defineConfig({
  blocklist: ['container'],
  content: {
    filesystem: [
      '.vitepress/config.mts',
      '.vitepress/constants.ts',
      '.vitepress/shared.ts'
    ]
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
    [
      'kbd',
      {
        display: 'inline-block',
        padding: '0.2em 0.4em',
        'font-family': 'var(--vp-font-family-mono)',
        'font-size': '0.75em',
        'font-weight': '500',
        'line-height': '1',
        color: 'var(--vp-c-text-1)',
        'background-color': 'rgb(var(--vp-c-bg-alt))',
        'border-radius': '4px'
      }
    ]
  ],
  presets: [
    presetUno(),
    presetIcons({
      autoInstall: true,
      scale: 1.2,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle'
      },
      collections: {
        custom: {
          privateersclub: () =>
            fetch('https://megathread.pages.dev/favicon.svg').then((r) =>
              r.text()
            )
        }
      }
    })
  ],
  transformers: [transformerDirectives()]
})
