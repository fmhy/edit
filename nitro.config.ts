// https://nitro.unjs.io/config
import { defineNitroConfig } from 'nitropack'

export default defineNitroConfig({
  runtimeConfig: {
    WEBHOOK_URL: {
      public: false,
      // Add any necessary environment variable validation here
      // For example:
      // match: /.+/,
    }
  },
  srcDir: '.vitepress',
  routeRules: {
    '/': {
      cors: false
    },
    // Add any additional route rules as needed
    // For example:
    // '/api/*': { cors: true },
  }
})

