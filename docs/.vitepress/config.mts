import { fileURLToPath } from 'node:url'
import consola from 'consola'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import OptimizeExclude from 'vite-plugin-optimize-exclude'
import Terminal from 'vite-plugin-terminal'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitepress'
import {
  commitRef,
  feedback,
  meta,
  nav,
  search,
  algolia,
  sidebar,
  socialLinks
} from './constants'
import { generateFeed, generateImages, generateMeta } from './hooks'
import { defs, emojiRender, movePlugin } from './markdown/emoji'
import { headersPlugin } from './markdown/headers'
import { toggleStarredPlugin } from './markdown/toggleStarred'
import { transformsPlugin } from './transformer'
import { replaceNoteLink } from './utils/markdown'

// @unocss-include

const baseUrl = process.env.GITHUB_ACTIONS ? '/edit' : '/'
export default defineConfig({
  title: 'FMHY',
  description: meta.description,
  titleTemplate: ':title • freemediaheckyeah',
  lang: 'en-US',
  lastUpdated: false,
  cleanUrls: true,
  appearance: true,
  base: baseUrl,
  srcExclude: ['README.md', 'single-page'],
  ignoreDeadLinks: true,
  sitemap: {
    hostname: meta.hostname
  },
  head: [
    ['meta', { name: 'theme-color', content: '#7bc5e4' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['link', { rel: 'icon', href: '/test.png' }],
    // PWA
    ['link', { rel: 'manifest', href: '/manifest.json' }],
    ['link', { rel: 'icon', href: '/pwa_icon.png', type: 'image/svg+xml' }],
    ['link', { rel: 'alternate icon', href: '/pwa_icon.png' }],
    ['link', { rel: 'mask-icon', href: '/pwa_icon.png', color: '#000000ff' }],
    ['meta', { name: 'keywords', content: meta.keywords.join(' ') }],
    ['link', { rel: 'apple-touch-icon', href: '/pwa_icon.png', sizes: '192x192' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
    // Bing site verification
    [
      'meta',
      {
        name: 'msvalidate.01',
        content: 'F3028112EF6F929B562F4B18E58E3691'
      }
    ],
    // Google site verification
    [
      'meta',
      {
        name: 'google-site-verification',
        content: 'XCq-ZTw6VJPQ7gVNEOl8u0JRqfadK7WcsJ0H598Wv9E'
      }
    ],
    // Redirect to main site if embedded in iframe
    [
      'script',
      {},
      `
        (function() {
          if (window.self !== window.top) {
              window.top.location = window.location.href;
          }
        })();
        `
    ]
  ],
  transformHead: async (context) => generateMeta(context, meta.hostname),
  buildEnd: async (context) => {
    generateImages(context)
      .then(() => generateFeed(context))
      .finally(() => consola.success('Success!'))
  },
  vite: {
    ssr: {
      noExternal: ['@fmhy/components']
    },
    resolve: {
      alias: [
        {
          find: /^.*VPSwitchAppearance\.vue$/,
          replacement: fileURLToPath(
            new URL('./theme/components/ThemeDropdown.vue', import.meta.url)
          )
        },
        {
          find: /^.*VPLocalSearchBox\.vue$/,
          replacement: fileURLToPath(
            new URL('./theme/components/VPLocalSearchBox.vue', import.meta.url)
          )
        },
        {
          find: /^.*VPNavBarSearch\.vue$/,
          replacement: fileURLToPath(
            new URL('./theme/components/VPNavBarSearch.vue', import.meta.url)
          )
        }
      ]
    },
    optimizeDeps: { exclude: ['workbox-window'] },
    plugins: [
      OptimizeExclude(),
      Terminal({
        console: 'terminal',
        output: ['console', 'terminal']
      }),
      UnoCSS({
        configFile: '../unocss.config.ts'
      }),
      AutoImport({
        dts: '../.cache/imports.d.ts',
        imports: ['vue', 'vitepress'],
        vueTemplate: true,
        biomelintrc: {
          enabled: true,
          filepath: './.cache/imports.json'
        }
      }),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 4000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        manifest: {
          name: 'FMHY - freemediaheckyeah',
          short_name: 'FMHY',
          description: 'The largest collection of free stuff on the internet!',
          theme_color: '#000000ff',
          background_color: '#000000ff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/fmhy.ico',
              sizes: '16x16',
              type: 'image/x-icon'
            },
            {
              src: '/pwa_icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/pwa_icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      }),
      transformsPlugin(),
      {
        name: 'custom:adjust-order',
        configResolved(c) {
          movePlugin(
            c.plugins as any,
            'vitepress',
            'before',
            'unocss:transformers:pre'
          )
          movePlugin(
            c.plugins as any,
            'custom:transform-content',
            'before',
            'vitepress'
          )
        }
      }
    ],
    build: {
      // Shut the fuck up
      chunkSizeWarningLimit: Number.POSITIVE_INFINITY
    }
  },
  markdown: {
    emoji: { defs },
    config(md) {
      md.use(emojiRender)
      md.use(toggleStarredPlugin)
      meta.build.api && md.use(headersPlugin)
      replaceNoteLink(md)
    }
  },
  themeConfig: {
    search,
    algolia,
    footer: {
      message: `${feedback} (rev: ${commitRef})`,
      copyright:
        `© ${new Date().getFullYear()}, <a href="https://i.ibb.co/VJQmQ9t/image.png">Estd 2018.</a>` +
        `<br/> This site does not host any files.`
    },
    editLink: {
      pattern: 'https://github.com/fmhy/edit/edit/main/docs/:path',
      text: '📝 Edit this page'
    },
    outline: 'deep',
    logo: {
      src: '/fmhy.ico',
      alt: 'FMHY Logo'
    },
    nav,
    sidebar,
    socialLinks
  }
})
