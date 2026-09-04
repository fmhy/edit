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
    pipeline: {
      exclude: [/\.md($|\?)/]
    },
    filesystem: [
      '.vitepress/config.mts',
      '.vitepress/constants.ts',
      '.vitepress/shared.ts'
    ]
  },
  // Markdown is excluded from extraction, so keep classes authored or generated there explicit.
  safelist: [
    'i-carbon:logo-bluesky',
    'i-carbon:logo-discord',
    'i-carbon:logo-github',
    'i-carbon:logo-gitlab',
    'i-carbon:logo-x',
    'i-fluent-mdl2:linux-logo-32',
    'i-fluent:globe-32-filled',
    'i-gravity-ui:code',
    'i-material-symbols:android',
    'i-mdi:mastodon',
    'i-mdi:reddit',
    'i-mdi:telegram',
    'i-qlementine-icons:mac-fill-16',
    'i-qlementine-icons:windows-24',
    'i-simple-icons:ios',
    'i-simple-icons:torbrowser',
    'h-1em',
    'w-1em',
    'text-4xl',
    'dark:text-text-2',
    'text-black',
    'font-extrabold',
    'lg:text-5xl',
    'lg:leading-[3.5rem]'
  ],
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
