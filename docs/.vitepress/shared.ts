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

export const excluded = [
    'readme.md',
    'single-page',
    'feedback.md',
    'index.md',
    'sandbox.md',
    'startpage.md'
]

const safeEnv = (key: string) => typeof process !== 'undefined' ? process.env?.[key] : undefined

if (safeEnv('FMHY_BUILD_NSFW') === 'false') {
    meta.build.nsfw = false
}
if (safeEnv('FMHY_BUILD_API') === 'false') {
    meta.build.api = false
}

const formatCommitRef = (commitRef: string) =>
    `<a href="https://github.com/fmhy/edit/commit/${commitRef}">${commitRef.slice(0, 8)}</a>`

const cfStart = safeEnv('CF_PAGES_COMMIT_SHA')
const commitStart = safeEnv('COMMIT_REF')

export const commitRef =
    safeEnv('CF_PAGES') && cfStart
        ? formatCommitRef(cfStart)
        : commitStart
            ? formatCommitRef(commitStart)
            : 'dev'

export const feedback = `<a href="/feedback" class="feedback-footer">Made with ❤</a>`

export const socialLinks: DefaultTheme.SocialLink[] = [
    { icon: 'github', link: 'https://github.com/fmhy/edit' },
    { icon: 'discord', link: 'https://github.com/fmhy/FMHY/wiki/FMHY-Discord' },
    {
        icon: 'reddit',
        link: 'https://reddit.com/r/FREEMEDIAHECKYEAH'
    }
]

export const nav: DefaultTheme.NavItem[] = [
    { text: '📑 Changelog', link: '/posts/changelog-sites' },
    { text: '📖 Glossary', link: 'https://rentry.org/The-Piracy-Glossary' },
    {
        text: '💾 Backups',
        link: '/other/backups'
    },
    {
        text: '🌱 Ecosystem',
        items: [
            { text: '🌐 Search', link: '/posts/search' },
            { text: '❓ FAQs', link: '/other/FAQ' },
            { text: '🔖 Bookmarks', link: 'https://github.com/fmhy/bookmarks' },
            { text: '✅ SafeGuard', link: 'https://github.com/fmhy/FMHY-SafeGuard' },
            { text: '🚀 Startpage', link: 'https://fmhy.net/startpage' },
            { text: '📋 snowbin', link: 'https://pastes.fmhy.net' },
            { text: '🔎 SearXNG', link: 'https://searx.fmhy.net/' },
            {
                text: '💡 Site Hunting',
                link: 'https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/find-new-sites/'
            },
            {
                text: '😇 SFW FMHY',
                link: 'https://rentry.org/piracy'
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
                link: '/privacy'
            },
            {
                text: '<span class="i-twemoji:robot"></span> Artificial Intelligence',
                link: '/ai'
            },
            {
                text: '<span class="i-twemoji:television"></span> Movies / TV / Anime',
                link: '/video'
            },
            {
                text: '<span class="i-twemoji:musical-note"></span> Music / Podcasts / Radio',
                link: '/audio'
            },
            {
                text: '<span class="i-twemoji:video-game"></span> Gaming / Emulation',
                link: '/gaming'
            },
            {
                text: '<span class="i-twemoji:green-book"></span> Books / Comics / Manga',
                link: '/reading'
            },
            {
                text: '<span class="i-twemoji:floppy-disk"></span> Downloading',
                link: '/downloading'
            },
            {
                text: '<span class="i-twemoji:cyclone"></span> Torrenting',
                link: '/torrenting'
            },
            {
                text: '<span class="i-twemoji:brain"></span> Educational',
                link: '/educational'
            },
            {
                text: '<span class="i-twemoji:mobile-phone"></span> Android / iOS',
                link: '/mobile'
            },
            {
                text: '<span class="i-twemoji:penguin"></span> Linux / macOS',
                link: '/linux-macos'
            },
            {
                text: '<span class="i-twemoji:globe-showing-asia-australia"></span> Non-English',
                link: '/non-english'
            },
            {
                text: '<span class="i-twemoji:file-folder"></span> Miscellaneous',
                link: '/misc'
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
                link: '/image-tools'
            },
            {
                text: '<span class="i-twemoji:videocassette"></span> Video Tools',
                link: '/video-tools'
            },
            {
                text: '<span class="i-twemoji:speaker-high-volume"></span> Audio Tools',
                link: '/audio#audio-tools'
            },
            {
                text: '<span class="i-twemoji:red-apple"></span> Educational Tools',
                link: '/educational#educational-tools'
            },
            {
                text: '<span class="i-twemoji:man-technologist"></span> Developer Tools',
                link: '/developer-tools'
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
                    link: 'https://rentry.org/NSFW-Checkpoint'
                }
                : {},
            {
                text: '<span class="i-twemoji:warning"></span> Unsafe Sites',
                link: '/unsafe'
            },
            {
                text: '<span class="i-twemoji:package"></span> Storage',
                link: '/storage'
            }
        ]
    }
]
