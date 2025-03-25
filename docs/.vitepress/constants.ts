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

import type { DefaultTheme } from 'vitepress'
import consola from 'consola'
import { transform, transformGuide } from './transformer'

// @unocss-include

export const meta = {
  name: 'freemediaheckyeah',
  description: 'The largest collection of free stuff on the internet!',
  hostname: 'https://fmhy.net',
  keywords: ['stream', 'movies', 'gaming', 'reading', 'anime'],
  build: {
    api: true,
    nsfw: true
  }
}

if (process.env.FMHY_BUILD_NSFW === 'false') {
  consola.info('FMHY_BUILD_NSFW is set to false, disabling NSFW content')
  meta.build.nsfw = false
}
if (process.env.FMHY_BUILD_API === 'false') {
  consola.info('FMHY_BUILD_API is set to false, disabling API component')
  meta.build.api = false
}

const formatCommitRef = (commitRef: string) =>
  `<a href="https://github.com/fmhy/edit/commit/${commitRef}">${commitRef.slice(0, 8)}</a>`

export const commitRef =
  process.env.CF_PAGES && process.env.CF_PAGES_COMMIT_SHA
    ? formatCommitRef(process.env.CF_PAGES_COMMIT_SHA)
    : process.env.COMMIT_REF
      ? formatCommitRef(process.env.COMMIT_REF)
      : 'dev'

export const feedback = `<a href="/feedback" class="feedback-footer">Made with ❤</a>`

export const search: DefaultTheme.Config['search'] = {
  options: {
    _render(src, env, md) {
      let contents = src
      // I do this as env.frontmatter is not available until I call `md.render`
      if (contents.includes('Beginners Guide'))
        contents = transformGuide(contents)
      contents = transform(contents)
      const html = md.render(contents, env)
      return html
    },
    miniSearch: {
      options: {
        tokenize: (text) => text.split(/[\n\r #%*,=/:;?[\]{}()&]+/u), // simplified charset: removed [-_.@] and non-english chars (diacritics etc.)
        processTerm: (term, fieldName) => {
          // biome-ignore lint/style/noParameterAssign: h
          term = term
            .trim()
            .toLowerCase()
            .replace(/^\.+/, '')
            .replace(/\.+$/, '')
          const stopWords = [
            'frontmatter',
            '$frontmatter.synopsis',
            'and',
            'about',
            'but',
            'now',
            'the',
            'with',
            'you'
          ]
          if (term.length < 2 || stopWords.includes(term)) return false

          if (fieldName === 'text') {
            const parts = term.split('.')
            if (parts.length > 1) {
              const newTerms = [term, ...parts]
                .filter((t) => t.length >= 2)
                .filter((t) => !stopWords.includes(t))
              return newTerms
            }
          }
          return term
        }
      },
      searchOptions: {
        combineWith: 'AND',
        fuzzy: true,
        // @ts-ignore
        boostDocument: (documentId, term, storedFields: Record) => {
          const titles = (storedFields?.titles as string[])
            .filter((t) => Boolean(t))
            .map((t) => t.toLowerCase())
          // Downrank posts
          if (documentId.match(/\/posts/)) return -5
          // Downrank /other
          if (documentId.match(/\/other/)) return -5

          // Uprate if term appears in titles. Add bonus for higher levels (i.e. lower index)
          const titleIndex =
            titles
              .map((t, i) => (t?.includes(term) ? i : -1))
              .find((i) => i >= 0) ?? -1
          if (titleIndex >= 0) return 10000 - titleIndex

          return 1
        }
      }
    },
    detailedView: true
  },
  provider: 'local'
}

export const socialLinks: DefaultTheme.SocialLink[] = [
  { icon: 'github', link: 'https://github.com/fmhy/edit' },
  { icon: 'discord', link: 'https://rentry.co/fmhy-invite' },
  {
    icon: 'reddit',
    link: 'https://reddit.com/r/FREEMEDIAHECKYEAH'
  },
  {
    icon: 'bluesky',
    link: 'https://bsky.app/profile/fmhy.net'
  }
]

export const nav: DefaultTheme.NavItem[] = [
  { text: '🔖 Glossary', link: 'https://rentry.org/The-Piracy-Glossary' },
  {
    text: '💾 Backups',
    link: 'https://github.com/fmhy/FMHY/wiki/Backups'
  },
  {
    text: '🌱 Ecosystem',
    items: [
      { text: '🌐 Search', link: '/posts/search' },
      { text: '🔗 Bookmarks', link: 'https://github.com/fmhy/bookmarks' },
      { text: '✅ SafeGuard', link: 'https://github.com/fmhy/FMHY-SafeGuard' },
      { text: '📋 snowbin', link: 'https://pastes.fmhy.net' },
      {
        text: '💡 Site Hunting',
        link: 'https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/find-new-sites/'
      },
      { text: '❓ FAQs', link: 'https://redd.it/xrxen7' },
      {
        text: '😇 SFW FMHY',
        link: 'https://fmhy.xyz/'
      },
      {
        text: '🏠 Selfhosting',
        link: '/other/selfhosting'
      },
      { text: '🏞 Wallpapers', link: '/other/wallpapers' },
      { text: '💙 Feedback', link: '/feedback' }
    ]
  }
]

export const sidebar: DefaultTheme.Sidebar | DefaultTheme.NavItemWithLink[] = [
  {
    text: '<span class="i-twemoji:books"></span> Beginners Guide',
    link: '/beginners-guide'
  },
  {
    text: '<span class="i-twemoji:newspaper"></span> Posts',
    link: '/posts'
  },
  {
    text: '<span class="i-twemoji:light-bulb"></span> Contribute',
    link: '/other/contributing'
  },
  {
    text: 'Wiki',
    collapsed: false,
    items: [
      {
        text: '<span class="i-twemoji:name-badge"></span> Adblocking / Privacy',
        link: '/adblockvpnguide'
      },
      {
        text: '<span class="i-twemoji:robot"></span> Artificial Intelligence',
        link: '/ai'
      },
      {
        text: '<span class="i-twemoji:television"></span> Movies / TV / Anime',
        link: '/videopiracyguide'
      },
      {
        text: '<span class="i-twemoji:musical-note"></span> Music / Podcasts / Radio',
        link: '/audiopiracyguide'
      },
      {
        text: '<span class="i-twemoji:video-game"></span> Gaming / Emulation',
        link: '/gamingpiracyguide'
      },
      {
        text: '<span class="i-twemoji:green-book"></span> Books / Comics / Manga',
        link: '/readingpiracyguide'
      },
      {
        text: '<span class="i-twemoji:floppy-disk"></span> Downloading',
        link: '/downloadpiracyguide'
      },
      {
        text: '<span class="i-twemoji:cyclone"></span> Torrenting',
        link: '/torrentpiracyguide'
      },
      {
        text: '<span class="i-twemoji:brain"></span> Educational',
        link: '/edupiracyguide'
      },
      {
        text: '<span class="i-twemoji:mobile-phone"></span> Android / iOS',
        link: '/android-iosguide'
      },
      {
        text: '<span class="i-twemoji:penguin"></span> Linux / MacOS',
        link: '/linuxguide'
      },
      {
        text: '<span class="i-twemoji:globe-showing-asia-australia"></span> Non-English',
        link: '/non-english'
      },
      {
        text: '<span class="i-twemoji:file-folder"></span> Miscellaneous',
        link: '/miscguide'
      }
    ]
  },
  {
    text: 'Tools',
    collapsed: false,
    items: [
      {
        text: '<span class="i-twemoji:laptop"></span> System Tools',
        link: '/system-tools'
      },
      {
        text: '<span class="i-twemoji:card-file-box"></span> File Tools',
        link: '/file-tools'
      },
      {
        text: '<span class="i-twemoji:paperclip"></span> Internet Tools',
        link: '/internet-tools'
      },
      {
        text: '<span class="i-twemoji:left-speech-bubble"></span> Social Media Tools',
        link: '/social-media-tools'
      },
      {
        text: '<span class="i-twemoji:memo"></span> Text Tools',
        link: '/text-tools'
      },
      {
        text: '<span class="i-twemoji:alien-monster"></span> Gaming Tools',
        link: '/gaming-tools'
      },
      {
        text: '<span class="i-twemoji:camera"></span> Image Tools',
        link: '/img-tools'
      },
      {
        text: '<span class="i-twemoji:videocassette"></span> Video Tools',
        link: '/video-tools'
      },
      {
        text: '<span class="i-twemoji:speaker-high-volume"></span> Audio Tools',
        link: '/audiopiracyguide#audio-tools'
      },
      {
        text: '<span class="i-twemoji:red-apple"></span> Educational Tools',
        link: '/edupiracyguide#educational-tools'
      },
      {
        text: '<span class="i-twemoji:man-technologist"></span> Developer Tools',
        link: '/devtools'
      }
    ]
  },
  {
    text: 'More',
    collapsed: true,
    items: [
      meta.build.nsfw
        ? {
            text: '<span class="i-twemoji:no-one-under-eighteen"></span> NSFW',
            link: 'https://rentry.co/NSFW-Checkpoint'
          }
        : {},
      {
        text: '<span class="i-twemoji:warning"></span> Unsafe Sites',
        link: '/unsafesites'
      },
      {
        text: '<span class="i-twemoji:package"></span> Storage',
        link: '/storage'
      }
    ]
  }
]
