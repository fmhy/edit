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

import type { Plugin } from 'vitepress'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ICON_LINKS, REDDIT_WIKI_PATHS } from './shared'
import { excluded, getHeader } from './transformer/constants'
import { replaceUnderscore, transformer } from './transformer/core'

// The link/icon transforms below run dozens of regexes over every page in
// both the client and SSR bundles; output depends only on the source, so it
// is cached per content hash under .vitepress/cache (restored in CI).
const TRANSFORM_CACHE_DIR = fileURLToPath(
  new URL('./cache/transform-content', import.meta.url)
)
const transformMemCache = new Map<string, string>()

export function transformsPlugin(): Plugin {
  return {
    name: 'custom:transform-content',
    enforce: 'pre',
    transform(code, id) {
      const _id = basename(id)

      if (
        id.endsWith('.md') &&
        !excluded.includes(_id) &&
        // check if it's a post
        !id.includes('posts') &&
        !id.includes('other')
      ) {
        const header = getHeader(_id)
        if (_id === 'recently-removed.md') return header + code

        const cacheKey = createHash('sha256')
          .update(_id)
          .update(code)
          .digest('hex')
        const cached =
          transformMemCache.get(cacheKey) ??
          (existsSync(join(TRANSFORM_CACHE_DIR, `${cacheKey}.md`))
            ? readFileSync(join(TRANSFORM_CACHE_DIR, `${cacheKey}.md`), 'utf8')
            : undefined)
        if (cached !== undefined) {
          transformMemCache.set(cacheKey, cached)
          return cached
        }

        const contents = transform(code)
        let result: string
        if (_id === 'beginners-guide.md') {
          result = header + transformGuide(contents)
        } else if (_id === 'storage.md') {
          result = header + contents
        } else {
          result = header + transformLinks(contents)
        }

        transformMemCache.set(cacheKey, result)
        try {
          mkdirSync(TRANSFORM_CACHE_DIR, { recursive: true })
          writeFileSync(join(TRANSFORM_CACHE_DIR, `${cacheKey}.md`), result)
        } catch {
          // cache is best-effort only
        }
        return result
      }
    }
  }
}

export const transformGuide = (text: string): string =>
  transformer(text)
    .transform('Beginners Guide', [
      {
        name: 'TOC',
        find: /\[TOC\]\n/gm,
        replace: ''
      },
      {
        name: 'TOC2',
        find: /\*\*Table of Contents\*\*\n\[TOC2\]\n/gm,
        replace: ''
      },
      {
        name: 'Beginners Guide',
        find: /# -> \*\*\*Beginners Guide to Piracy\*\*\* <-\n/gm,
        replace: ''
      },
      {
        name: 'Note',
        find: /!!!note\s(.+?)\n/gm,
        replace: '\n:::info\n$1\n:::\n'
      },
      {
        name: 'Info',
        find: /!!!info\s(.+?)\n/gm,
        replace: '\n:::info\n$1\n:::\n'
      },
      {
        name: 'Warning',
        find: /!!!warning\s(.+?)\n/gm,
        replace: ':::warning\n$1\n:::\n'
      },
      {
        name: 'Quote',
        find: />\s(.+?)\n/gm,
        replace: '> $1\n\n'
      },
      {
        name: 'Back to Top',
        find: /\*\*\[\^ Back to Top\]\(#beginners-guide-to-piracy\)\*\*/gm,
        replace: ''
      },
      {
        name: 'Back to Top',
        find: /\*\*\[\^ Back to Top\]\(#beginners-guide-to-piracy\)\*\*/gm,
        replace: ''
      }
    ])
    .getText()

export function transform(text: string): string {
  let _text = text
    // Remove extra characters
    .replace(/\/#wiki_/g, '/#')
    .replace(/#wiki_/g, '/#')
    .replace(/.25BA_/g, '')
    .replace(/.25B7_/g, '')
    .replace(/_?\.2F_?/g, '-')
    .replace(/_?.26amp.3B_?/g, '-')
    .replace(/(?<=r\/FREEMEDIA.+_[a-z]+)2(?=\))/g, '-1')
    .replace(/(?<=r\/FREEMEDIA.+)\.(?=[a-z]+_)/g, '-')

    // Transform reddit index links
    .replace(
      /\*\*\[◄◄ Back to Wiki Index\]\(https:\/\/www\.reddit\.com\/r\/FREEMEDIAHECKYEAH\/wiki\/index\)\*\*\n/gm,
      ''
    )
    .replace(
      /\*\*\[◄◄ Back to Wiki Index\]\(https:\/\/www\.reddit\.com\/r\/FREEMEDIAHECKYEAH\/wiki\/tools-index\)\*\*\n/gm,
      ''
    )
    .replace(
      /\*\*\[Table of Contents\]\(https?:\/\/.*?ibb\.co.*\)\*\* - For mobile users\n/gm,
      ''
    )
    // Remove extra lines
    .replace(/\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\*\n\n/gm, '')
    .replace(/\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\* \n\n/gm, '')
    .replace(/\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\*\n\n/gm, '')
    .replace(/\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\n/gm, '')
    .replace(/\*\*\*\n\*\*\*\n\n\n\*\*\*\n\n/gm, '')
  // Transform reddit links
  for (const [slug, target] of Object.entries(REDDIT_WIKI_PATHS)) {
    _text = _text.replaceAll(
      `https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/${slug}`,
      target
    )
  }

  _text = replaceUnderscore(_text)
    // Prefix numeric heading fragments only inside Markdown destinations.
    .replace(/(\]\([^\s)]*)#(\d)/g, '$1#_$2')
    .replace(/(\]\(\s*)\/\s*(\#[^)\s]*?\s*\))/g, '$1$2')
    .replace(/\*\*\*\n\n/gm, '')
    .replace(/\*\*\*\n/gm, '')
    .replace(/# ►/g, '##')
    .replace(/## ▷/g, '###')
    .replace(/####/g, '###')
    // Replace emojis
    .replace(/⭐/g, ':star:')
    .replace(/🌟/g, ':glowing-star:')
    .replace(/🌐/g, ':globe-with-meridians:')
    .replace(/↪/g, ':repeat-button:')
    // Replace note/warning/tip
    .replace(/^\*\*Note\*\* - (.+)$/gm, ':::tip\n$1\n:::')
    .replace(/^\* \*\*Note\*\* - (.+)$/gm, ':::tip\n$1\n:::')
    .replace(/^Note - (.+)$/gm, ':::tip\n$1\n:::')
    .replace(/^\*\*Warning\*\* - (.+)$/gm, ':::warning\n$1\n:::')
    .replace(/^\* \*\*Warning\*\* - (.+)$/gm, ':::warning\n$1\n:::')
    .replace(/^\*\s([^*])/gm, '- $1')

  return _text
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const iconLinkTransforms = ICON_LINKS.map(
  ({ label, iconClass, name, tooltip, requireSlash }) => {
    const escapedLabel = escapeRegex(label)
    const prefix = requireSlash ? '(?<=\\/ )' : ''
    const tooltipText = tooltip ?? label
    return {
      name: name ?? label,
      find: new RegExp(`${prefix}\\[${escapedLabel}\\]\\(([^)]*?)\\)`, 'gm'),
      replace: `<a target="_blank" href="$1"><span v-tooltip="'${tooltipText}'" alt="${tooltipText}" class="${iconClass}" /></a>`
    }
  }
)

const transformLinks = (text: string): string =>
  transformer(text)
    .transform('Links to Icons', [
      ...iconLinkTransforms,
      // Platform indicators
      {
        name: 'Windows',
        find: /(?<=\/ (\/>|[^/\r\n])*)(,\s)?(?<![a-z]\s)Windows(?=,|[ \t]\/|$)/gm,
        replace:
          ' <span v-tooltip="\'Windows\'" alt="Windows" class="i-qlementine-icons:windows-24" /> '
      },
      {
        name: 'macOS',
        find: /(?<=\/ (\/>|[^/\r\n])*)(,\s)?(?<![a-z]\s)(?:Mac|macOS)(?=,|[ \t]\/|$)/gm,
        replace:
          ' <div v-tooltip="\'macOS\'" alt="macOS" class="i-qlementine-icons:mac-fill-16" /> '
      },
      {
        name: 'Linux',
        find: /(?<=\/ (\/>|[^/\r\n])*)(,\s)?(?<![a-z]\s)Linux(?=,|[ \t]\/|$)/gm,
        replace:
          ' <span v-tooltip="\'Linux\'" alt="Linux" class="i-fluent-mdl2:linux-logo-32" /> '
      },
      {
        name: 'Android',
        find: /(?<=\/ (\/>|[^/\r\n])*)(,\s)?(?<![a-z]\s)Android(?=,|[ \t]\/|$)/gm,
        replace:
          ' <span v-tooltip="\'Android\'" alt="Android" class="i-material-symbols:android" /> '
      },
      {
        name: 'iOS',
        find: /(?<=\/ (\/>|[^/\r\n])*)(,\s)?(?<![a-z]\s)iOS(?=,|[ \t]\/|$)/gm,
        replace:
          ' <span v-tooltip="\'iOS\'" alt="iOS" class="i-simple-icons:ios" /> '
      },
      {
        name: 'Web',
        find: /(?<=\/ (\/>|[^/\r\n])*)(,\s)?(?<![a-z]\s)Web(?=,|[ \t]\/|$)/gm,
        replace:
          ' <span v-tooltip="\'Web\'" alt="Web" class="i-fluent:globe-32-filled" /> '
      },
      {
        name: 'Docker',
        find: /(?<=\/ (\/>|[^/\r\n])*)(,\s)?(?<![a-z]\s)Docker(?=,|[ \t]\/|$)/gm,
        replace:
          ' <span v-tooltip="\'Docker\'" alt="Docker" class="i-simple-icons:docker inline-block w-3em h-3em align-middle" /> '
      }
    ])
    .getText()
