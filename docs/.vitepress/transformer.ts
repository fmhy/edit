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
import { basename } from 'pathe'
import { excluded, getHeader } from './transformer/constants'
import { replaceUnderscore, transformer } from './transformer/core'

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
        const contents = transform(code)

        if (_id === 'beginners-guide.md') {
          const _contents = transformGuide(contents)
          return header + _contents
        }
        if (_id === 'storage.md') return header + contents

        return header + transformLinks(contents)
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
    .replace(/https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/ai/g, '/ai')
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/adblock-vpn-privacy/g,
      '/adblockvpnguide'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/android/g,
      '/android-iosguide'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/games/g,
      '/gamingpiracyguide'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/reading/g,
      '/readingpiracyguide'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/download/g,
      '/downloadpiracyguide'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/torrent/g,
      '/torrentpiracyguide'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/edu/g,
      '/edupiracyguide'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/system-tools/g,
      '/system-tools'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/file-tools/g,
      '/file-tools'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/internet-tools/g,
      '/internet-tools'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/social-media/g,
      '/social-media-tools'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/text-tools/g,
      '/text-tools'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/video-tools/g,
      '/video-tools'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/audio-tools/g,
      '/audio-tools'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/game-tools/g,
      '/gaming-tools'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/video/g,
      '/videopiracyguide'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/audio/g,
      '/audiopiracyguide'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/linux/g,
      '/linuxguide'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/non-eng/g,
      '/non-english'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/misc/g,
      '/miscguide'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/storage/g,
      '/storage'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/dev-tools/g,
      '/devtools'
    )
    .replace(
      /https:\/\/www.reddit.com\/r\/FREEMEDIAHECKYEAH\/wiki\/img-tools/g,
      '/img-tools'
    )
    // Remove extra characters
    .replace(/\/#wiki_/g, '/#')
    .replace(/#wiki_/g, '/#')
    .replace(/.25BA_/g, '')
    .replace(/.25B7_/g, '')
    .replace(/_.2F_/g, '-')

  _text = replaceUnderscore(_text)
    .replace(/\/#(\d)/g, '/#_$1') // Prefix headings starting with numbers
    .replace(/#(\d)/g, '#_$1') // Prefix headings starting with numbers
    .replace(/\/#/g, '#')
    .replace(/\*\*\*\n\n/gm, '')
    .replace(/\*\*\*\n/gm, '')
    .replace(/# ►/g, '##')
    .replace(/## ▷/g, '###')
    .replace(/####/g, '###')
    // Replace emojis
    .replace(/🌟/g, ':glowing-star:')
    .replace(/⭐/g, ':star:')
    .replace(/🌐/g, ':globe-with-meridians:')
    .replace(/↪/g, ':repeat-button:')
    // Replace note/warning/tip
    .replace(/^\*\*Note\*\* - (.+)$/gm, ':::tip\n$1\n:::')
    .replace(/^\* \*\*Note\*\* - (.+)$/gm, ':::tip\n$1\n:::')
    .replace(/^Note - (.+)$/gm, ':::tip\n$1\n:::')
    .replace(/^\*\*Warning\*\* - (.+)$/gm, ':::warning\n$1\n:::')
    .replace(/^\* \*\*Warning\*\* - (.+)$/gm, ':::warning\n$1\n:::')
    .replace(/^\*\s([^*])/gm, '- $1')
    // Replace links
    .replace(
      /\/storage\/#encode--decode_urls/g,
      '/storage/#encode--decode-urls'
    )
    .replace(/\/devtools\/#machine-learning2/g, '/devtools/#machine-learning-1')
    .replace(/\/linuxguide#software-sites2/g, '/linuxguide#software-sites-1')
    .replace(/\/linuxguide#software_sites/g, '/linuxguide#software-sites')
    .replace(/\/non-english#reading10/g, '/non-english#reading-9')
    .replace(
      /\/storage#satellite-.26amp.3B_street_view_maps/g,
      '/storage#satellite-street-view-maps'
    )
    .replace(
      /(.+?) site or extension\.\n/gm,
      'Click on the texts to copy them decoded.\n'
    )

  return _text
}

const transformLinks = (text: string): string =>
  transformer(text)
    .transform('Links to Icons', [
      {
        name: 'Discord',
        find: /\[Discord\]\(([^\)]*?)\)/gm,
        replace:
          '<a target="_blank" href="$1"><div alt="Discord" class="i-carbon:logo-discord" /></a>'
      },
      {
        name: 'GitHub',
        find: /\[GitHub\]\(([^\)]*?)\)/gm,
        replace:
          '<a target="_blank" href="$1"><div alt="GitHub" class="i-carbon:logo-github" /></a>'
      },
      {
        name: 'GitLab',
        find: /\[GitLab\]\(([^\)]*?)\)/gm,
        replace:
          '<a target="_blank" href="$1"><div alt="GitLab" class="i-carbon:logo-gitlab" /></a>'
      },
      {
        name: 'Source Code',
        find: /\[Source Code\]\(([^\)]*?)\)/gm,
        replace:
          '<a target="_blank" href="$1"><div alt="Source Code" class="i-gravity-ui:code" /></a>'
      },
      {
        name: 'Telegram',
        find: /\[Telegram\]\(([^\)]*?)\)/gm,
        replace:
          '<a target="_blank" href="$1"><div alt="Telegram" class="i-mdi:telegram" /></a>'
      },
      {
        name: 'Subreddit',
        find: /\[Subreddit\]\(([^\)]*?)\)/gm,
        replace:
          '<a target="_blank" href="$1"><div alt="Reddit" class="i-mdi:reddit" /></a>'
      },
      {
        name: 'X',
        find: /\[X\]\(([^\)]*?)\)/gm,
        replace:
          '<a target="_blank" href="$1"><div alt="X" class="i-carbon:logo-x" /></a>'
      },
      {
        name: 'Tor',
        find: /\[.onion\]\(([^\)]*?)\)/gm,
        replace:
          '<a target="_blank" href="$1"><div alt=".onion" class="i-simple-icons:torbrowser w-1em h-1em" /></a>'
      }
    ])
    .getText()
