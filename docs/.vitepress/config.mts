import { fileURLToPath } from 'node:url'
import consola from 'consola'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import OptimizeExclude from 'vite-plugin-optimize-exclude'
import Terminal from 'vite-plugin-terminal'
import { defineConfig } from 'vitepress'
import {
  commitRef,
  feedback,
  meta,
  nav,
  search,
  sidebar,
  socialLinks
} from './constants'
import { generateFeed, generateImages, generateMeta } from './hooks'
import { defs, emojiRender, movePlugin } from './markdown/emoji'
import { headersPlugin } from './markdown/headers'
import { toggleStarredPlugin } from './markdown/toggleStarred'
import { transforms } from './transformer'

// @unocss-include

const baseUrl = process.env.GITHUB_ACTIONS ? '/FMHYedit' : '/'
export default defineConfig({
  title: 'FMHY',
  description: meta.description,
  titleTemplate: ':title • freemediaheckyeah',
  lang: 'en-US',
  lastUpdated: false,
  cleanUrls: true,
  appearance: 'dark',
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
    ['link', { rel: 'icon', href: '/test.png', type: 'image/svg+xml' }],
    ['link', { rel: 'alternate icon', href: '/test.png' }],
    ['link', { rel: 'mask-icon', href: '/test.png', color: '#7bc5e4' }],
    ["meta", { name: "keywords", content: meta.keywords.join(" ") }],
    ['link', { rel: 'apple-touch-icon', href: '/test.png', sizes: '192x192' }],
    // Bing site verification
    ["meta", {
      name: "msvalidate.01", content: "55ae5a0600A8C7827B59CFD506D76DC2"
    }],
    // Google site verification
    ["meta", { name: "google-site-verification", content: "XCq-ZTw6VJPQ7gVNEOl8u0JRqfadK7WcsJ0H598Wv9E" }]
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
            new URL('./theme/Appearance.vue', import.meta.url)
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
      transforms(),
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
      md.use(headersPlugin)
    }
  },
  themeConfig: {
    search,
    footer: {
      message: `${feedback} (rev: ${commitRef})`,
      copyright: `© ${new Date().getFullYear()}, <a href="https://github.com/nbats">nbats</a>, <a href="https://github.com/taskylizard">taskylizard</a> and contributors. <a href="https://i.ibb.co/VJQmQ9t/image.png">Estd 2018.</a>`
    },
    editLink: {
      pattern: 'https://github.com/fmhy/FMHYEdit/edit/main/docs/:path',
      text: '📝 Edit this page'
    },
    outline: 'deep',
    logo: '/fmhy.ico',
    nav,
    sidebar,
    socialLinks
  }
})
