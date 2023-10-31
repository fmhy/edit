import type { PwaOptions } from "@vite-pwa/vitepress";
import { meta } from "./constants";
import { resolve } from "pathe";
import fg from "fast-glob";

export const pwa = {
  outDir: ".vitepress/dist",
  registerType: "autoUpdate",
  includeManifestIcons: false,
  includeAssets: fg.sync("**/*.{png,webp,svg,gif,ico,txt}", {
    cwd: resolve(__dirname, "../public"),
  }),

  manifest: {
    id: "/",
    name: meta.name,
    short_name: meta.name,
    description: meta.description,
    theme_color: "#ffffff",
    start_url: "/",
    lang: "en-US",
    dir: "ltr",
    orientation: "natural",
    display: "standalone",
    display_override: ["window-controls-overlay"],
    categories: meta.keywords,
    // TODO: replace with actual icons
    icons: [
      {
        src: "test.png",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "test.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "test.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "maskable-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    handle_links: "preferred",
    launch_handler: {
      client_mode: ["navigate-existing", "auto"],
    },
    edge_side_panel: {
      preferred_width: 480,
    },
  },
  experimental: {
    includeAllowlist: true,
  },
  workbox: {
    globPatterns: ["**/*.{css,js,html,svg,png,ico,txt,woff2,json}"],
    globIgnores: ["**/404.html"],
    navigateFallback: null,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts-cache",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "gstatic-fonts-cache",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
  devOptions: {
    enabled: true,
    suppressWarnings: false,
  },
} satisfies PwaOptions;
