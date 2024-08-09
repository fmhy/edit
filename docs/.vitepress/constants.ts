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
        boostDocument: (
          documentId,
          term,
          storedFields: Record<string, string | string[]>
        ) => {
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
    icon: 'reddit',
    link: 'https://reddit.com/r/FREEMEDIAHECKYEAH'
  },
  {
    ariaLabel: 'Bluesky',
    icon: {
      svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Bluesky</title><path fill="#A1A1AA" d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/></svg>'
    },
    link: 'https://bsky.app/profile/fmhy.bsky.social'
  }
]

export const sidebar: DefaultTheme.Sidebar | DefaultTheme.NavItemWithLink[] = [
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
  },
  {
    text: '<span class="i-twemoji:wrench"></span> Tools',
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
    text: '<span class="i-twemoji:plus"></span> More',
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
