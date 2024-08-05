import { basename } from 'pathe'
import type { Plugin } from 'vitepress'

interface Header {
  [key: string]: { title: string; description: string }
}

const headers: Header = {
  'adblockvpnguide.md': {
    title: 'Adblocking / Privacy',
    description: "Adblocking, Privacy, VPN's, Proxies, Antivirus"
  },
  'ai.md': {
    title: 'Artificial Intelligence',
    description: 'Chat Bots, Text Generators, Image Generators, ChatGPT Tools'
  },
  'android-iosguide.md': {
    title: 'Android / iOS',
    description: 'Apps, Jailbreaking, Android Emulators'
  },
  'audiopiracyguide.md': {
    title: 'Music / Podcasts / Radio',
    description: 'Stream Audio, Download Audio, Torrent Audio'
  },
  'beginners-guide.md': {
    title: 'Beginners Guide',
    description: 'A Guide for Beginners to Piracy'
  },
  'downloadpiracyguide.md': {
    title: 'Downloading',
    description: 'Download Sites, Software Sites, Open Directories'
  },
  'edupiracyguide.md': {
    title: 'Educational',
    description: 'Courses, Documentaries, Learning Resources'
  },
  'gamingpiracyguide.md': {
    title: 'Gaming / Emulation',
    description: 'Download Games, ROMs, Gaming Tools'
  },
  'linuxguide.md': {
    title: 'Linux / MacOS',
    description: 'Apps, Software Sites, Gaming'
  },
  'miscguide.md': {
    title: 'Miscellaneous',
    description: 'Extensions, Indexes, News, Health, Food, Fun'
  },
  'nsfwpiracy.md': {
    title: 'NSFW',
    description: 'NSFW Indexes, Streaming, Downloading'
  },
  'non-english.md': {
    title: 'Non-English',
    description: 'International Piracy Sites'
  },
  'readingpiracyguide.md': {
    title: 'Books / Comics / Manga',
    description: 'Books, Comics, Magazines, Newspapers'
  },
  'gaming-tools.md': {
    title: 'Gaming Tools',
    description: 'Gaming Optimization, Game Launchers, Multiplayer'
  },
  'devtools.md': {
    title: 'Developer Tools',
    description: 'Git, Hosting, App Dev, Software Dev'
  },
  'img-tools.md': {
    title: 'Image Tools',
    description: 'Image Editors, Generators, Compress'
  },
  'audio-tools.md': {
    title: 'Audio Tools',
    description: 'Audio Players, Audio Editors, Audio Downloaders'
  },
  'system-tools.md': {
    title: 'System Tools',
    description: 'System Tools, Hardware Tools, Windows ISOs, Customization'
  },
  'file-tools.md': {
    title: 'File Tools',
    description: 'Download Managers, File Hosting, File Archivers'
  },
  'video-tools.md': {
    title: 'Video Tools',
    description: 'Video Players, Video Editors, Live Streaming, Animation'
  },
  'text-tools.md': {
    title: 'Text Tools',
    description: 'Text Editors, Pastebins, Fonts, Translators'
  },
  'internet-tools.md': {
    title: 'Internet Tools',
    description: 'Browsers, Extensions, Search Engines'
  },
  'social-media-tools.md': {
    title: 'Social Media Tools',
    description: 'Discord Tools, Reddit Tools, YouTube Tools'
  },
  'storage.md': {
    title: 'Storage',
    description: 'Sections too big to fit on main pages'
  },
  'torrentpiracyguide.md': {
    title: 'Torrenting',
    description: 'Torrent Clients, Torrent Sites, Trackers'
  },
  'videopiracyguide.md': {
    title: 'Movies / TV / Anime',
    description: 'Stream Videos, Download Videos, Torrent Videos'
  },
  'base64.md': {
    title: 'Base64',
    description: 'Base64 storage'
  },
  'unsafesites.md': {
    title: 'Unsafe Sites',
    description: 'Unsafe/harmful sites to avoid.'
  }
}

const excluded = ['readme.md', 'single-page', 'feedback.md', 'index.md']

export function transformer(): Plugin {
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
        const header = getHeader(id)
        const contents = transform(code)

        if (_id === 'beginners-guide.md') {
          const _contents = transformGuide(contents)
          return header + _contents
        }
        return header + contents
      }
    }
  }
}

function getHeader(id: string) {
  const title =
    '<div class="space-y-2 not-prose"><h1 class="text-4xl font-extrabold tracking-tight text-primary underline lg:text-5xl lg:leading-[3.5rem]">'

  const description = '<p class="text-black dark:text-text-2">'

  const _id = basename(id)
  const data = headers[_id]
  let header = '---\n'
  header += `title: "${data.title}"\n`
  header += `description: ${data.description}\n`
  header += '---\n'
  header += `${title}${data.title}</h1>\n`
  header += `${description}${data.description}</p></div>\n\n`
  return header
}

export function transformGuide(text: string): string {
  const _text = text
    .replace(/\[TOC\]\n/gm, '')
    .replace(/\*\*Table of Contents\*\*\n\[TOC2\]\n/gm, '')
    .replace(/# -> \*\*\*Beginners Guide to Piracy\*\*\* <-\n/gm, '')
    .replace(/!!!note\s(.+?)\n/gm, '\n:::info\n$1\n:::\n')
    .replace(/!!!info\s(.+?)\n/gm, '\n:::info\n$1\n:::\n')
    .replace(/!!!warning\s(.+?)\n/gm, ':::warning\n$1\n:::\n')
    .replace(/>\s(.+?)\n/gm, '> $1\n\n')
    .replace(/\*\*\[\^ Back to Top\]\(#beginners-guide-to-piracy\)\*\*/gm, '')
    .replace(/!!!\s(.+?)\n/gm, ':::info\n$1\n:::\n')
    .replace(/\n\*\*\[/gm, '\n* **[')
    .replace(/>(.*)\n\n(.*)/gm, ':::details $1\n$2\n:::')
  return _text
}

function replaceUnderscore(text: string): string {
  const pattern = /\/#[\w\-]+(?:_[\w]+)*/g
  const matches = text.match(pattern) || []
  for (const match of matches) {
    const replacement = match.replace(/_/g, '-')
    text = text.replace(match, replacement)
  }
  return text
}

export function transform(text: string): string {
  let _text = text
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
    .replace(/\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\*\n\n/gm, '')
    .replace(/\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\* \n\n/gm, '')
    .replace(/\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\*\n\n/gm, '')
    .replace(/\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\n/gm, '')
    .replace(/\*\*\*\n\*\*\*\n\n\n\*\*\*\n\n/gm, '')
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
    .replace(
      /https:\/\/github.com\/nbats\/FMHYedit\/blob\/main\/base64.md#/g,
      '/base64/#'
    )
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
    .replace(/⭐/g, ':star:')
    .replace(/🌐/g, ':globe-with-meridians: ')
    .replace(/↪ /g, ':repeat-button: ')
    .replace(/^\*\*Note\*\* - (.+)$/gm, ':::tip\n$1\n:::')
    .replace(/^\* \*\*Note\*\* - (.+)$/gm, ':::tip\n$1\n:::')
    .replace(/^Note - (.+)$/gm, ':::tip\n$1\n:::')
    .replace(/^\*\*Warning\*\* - (.+)$/gm, ':::warning\n$1\n:::')
    .replace(/^\*\s([^*])/gm, '- $1')
    .replace(
      /\/storage\/#encode--decode_urls/g,
      '/storage/#encode--decode-urls'
    )
    .replace(/\/base64\/#do-k-ument/g, '/base64/#do_k_ument')
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
