/**
 *  Copyright (c) taskylizard. All rights reserved.
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
import { transform, transformGuide } from './transformer'

// @unocss-include

export const meta = {
  name: 'freemediaheckyeah',
  description: 'The largest collection of free stuff on the internet!',
  hostname: 'https://fmhy.net',
  keywords: ['stream', 'movies', 'gaming', 'reading', 'anime']
}

export const commitRef =
  process.env.CF_PAGES && process.env.CF_PAGES_COMMIT_SHA
    ? `<a href="https://github.com/fmhy/FMHYEdit/commit/${
        process.env.CF_PAGES_COMMIT_SHA
      }">${process.env.CF_PAGES_COMMIT_SHA.slice(0, 8)}</a>`
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
  { icon: 'github', link: 'https://github.com/fmhy/FMHYEdit' },
  { icon: 'discord', link: 'https://discord.gg/Stz6y6NgNg' },
  {
    ariaLabel: 'Reddit',
    icon: {
      svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Reddit</title><path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/></svg>'
    },
    link: 'https://reddit.com/r/FREEMEDIAHECKYEAH'
  },
  {
    ariaLabel: 'Bluesky',
    icon: {
      svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Bluesky</title><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/></svg>'
    },
    link: 'https://bsky.app/profile/fmhy.bsky.social'
  }
]

export const nav: DefaultTheme.NavItem[] = [
  { text: '🔖 Glossary', link: 'https://rentry.org/The-Piracy-Glossary' },
  {
    text: '💾 Backups',
    link: 'https://github.com/fmhy/FMHY/wiki/Backups'
  },
  {
    text: '🪅 Ecosystem',
    items: [
      { text: '💙 Feedback', link: '/feedback' },
      { text: '🌐 Search', link: '/posts/search' },
      { text: '🏞 Wallpapers', link: '/other/wallpapers' },
      { text: '📋 snowbin', link: 'https://pastes.fmhy.net' },
      { text: '🔍 SearXNG', link: 'https://searx.fmhy.net/' },
      { text: '🔍 Whoogle', link: 'https://whoogle.fmhy.net/' },
      {
        text: '🔗 Bookmarks',
        link: 'https://github.com/fmhy/bookmarks'
      }
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

  // TODO: genetate sidebar from posts
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
      {
        text: '<span class="i-twemoji:no-one-under-eighteen"></span> NSFW',
        link: '/nsfwpiracy'
      },
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
