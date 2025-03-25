import { meta } from '../constants'

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
interface Header {
  [file: string]: { title: string; description: string }
}

export const headers: Header = {
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
    title: 'Linux / macOS',
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
} as const

export const excluded = [
  'readme.md',
  'single-page',
  'feedback.md',
  'index.md',
  'sandbox.md'
]

export function getHeader(id: string) {
  const title =
    '<div class="space-y-2 not-prose"><h1 class="text-4xl font-extrabold tracking-tight text-primary underline lg:text-5xl lg:leading-[3.5rem]">'

  const description = '<p class="text-black dark:text-text-2">'

  const feedback = meta.build.api ? '<Feedback />' : ''

  const data = headers[id]
  let header = '---\n'
  header += `title: "${data.title}"\n`
  header += `description: ${data.description}\n`
  header += '---\n'
  header += `${title}${data.title}</h1>\n`
  header += `${description}${data.description}</p></div>\n\n${feedback}\n\n`
  return header
}
