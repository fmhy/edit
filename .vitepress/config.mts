import { defineNuxtConfig } from 'nuxt'
import UnoCSS from 'unocss/vite'
import {
  commitRef,
  feedback,
  meta,
  search,
  sidebar,
  socialLinks
} from './constants'
import { generateImages, generateMeta, generateFeed } from './hooks'
import { toggleStarredPlugin } from './markdown/toggleStarred'
import { movePlugin, emojiRender, defs } from './markdown/emoji'

const baseUrl = process.env.GITHUB_ACTIONS ? '/FMHYedit' : '/'

export default defineNuxtConfig({
  // ...other options

  app: {
    head: {
      // ...other head tags
    }
  },

  vite: {
    optimizeDeps: { exclude: ['workbox-window'] },
    plugins: [
      UnoCSS({
        configFile: '../unocss.config.ts'
      }),
      {
        name: 'custom:adjust-order',
        configResolved(c) {
          movePlugin(
            c.plugins as any,
            'vitepress',
            'before',
            'unocss:transformers:pre'
          )
        }
      }
    ],
    build: {
      // Shut the fuck up
      chunkSizeWarningLimit: Number.POSITIVE_INFINITY
    }
  },

  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt'
  ],

  unocss: {
    configFile: '../unocss.config.ts'
  },

  buildModules: [
    '@nuxt/typescript-build'
  ],

  typescript: {
    shim: false
  },

  router: {
    base: baseUrl
  },

  nitro: {
    compressPublicAssets: true
  },

  hooks: {
    'pages:extend': (pages) => {
      // ...other hooks
    }
  },

  buildEnd: async (context) => {
    generateImages(context)
      .then(() => generateFeed(context))
      .finally(() => console.log('Success!'))
  },

  markdown: {
    emoji: { defs },
    config(md) {
      md.use(emojiRender)
      md.use(toggleStarredPlugin)
    }
  },

  theme: {
    // ...other theme options
  }
})



import { defineConfig } from 'unocss'

export default defineConfig({
  // ...unocss config options
})



{
  "extends": "@nuxt/typescript-build",
  "compilerOptions": {
    "moduleResolution": "node",
    "types": [
      "node",
      "unocss"
    ]
  }
}



export const commitRef = '...'
export const feedback = '...'
export const meta = {
  // ...meta object
}
export const search = '...'
export const sidebar = '...'
export const socialLinks = '...'



export const generateImages = async (context) => {
  // ...generateImages function
}

export const generateMeta = async (context, hostname) => {
  // ...generateMeta function
}

export const generateFeed = async (context) => {
  // ...generateFeed function
}



import { defineEmojiPlugin } from 'vitepress'

const defs = {
  // ...emoji definitions
}

export const emojiRender = defineEmojiPlugin({
  // ...emojiRender config
})

export const movePlugin = (plugins, target, position, plugin) => {
  // ...movePlugin function
}



// ...toggleStarredPlugin code

