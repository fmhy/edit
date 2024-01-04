import { defineConfig } from "vitepress";
import UnoCSS from "unocss/vite";
import consola from "consola";
import { commitRef, feedback, meta, search, sidebar, socialLinks } from "./constants";
import { generateImages, generateMeta, generateFeed } from "./hooks";
import { toggleStarredPlugin } from "./markdown/toggleStarred";
import { base64DecodePlugin } from "./markdown/base64";

export default defineConfig({
  title: "FMHY",
  description: meta.description,
  titleTemplate: ":title • freemediaheckyeah",
  lang: "en-US",
  lastUpdated: true,
  cleanUrls: true,
  appearance: "dark",
  srcExclude: ["readme.md", "single-page"],
  ignoreDeadLinks: true,
  sitemap: {
    hostname: meta.hostname,
  },
  head: [
    ["meta", { name: "theme-color", content: "#7bc5e4" }],
    ["meta", { name: "og:type", content: "website" }],
    ["meta", { name: "og:locale", content: "en" }],
    ["link", { rel: "icon", href: "/test.png" }],
    // PWA
    ["link", { rel: "icon", href: "/test.png", type: "image/svg+xml" }],
    ["link", { rel: "alternate icon", href: "/test.png" }],
    ["link", { rel: "mask-icon", href: "/test.png", color: "#7bc5e4" }],
    // prettier-ignore
    ["meta", { name: "keywords", content: meta.keywords.join(" ") }],
    ["link", { rel: "apple-touch-icon", href: "/test.png", sizes: "192x192" }],
  ],
  transformHead: async (context) => generateMeta(context, meta.hostname),
  buildEnd: async (context) => {
    generateImages(context)
      .then(() => generateFeed(context))
      .finally(() => consola.success("Success!"));
  },
  vite: {
    plugins: [
      UnoCSS({
        configFile: "../unocss.config.ts",
      }),
    ],
    build: {
      // Shut the fuck up
      chunkSizeWarningLimit: Number.POSITIVE_INFINITY,
    },
  },
  markdown: {
    config(md) {
      md.use(toggleStarredPlugin);
      md.use(base64DecodePlugin);
    },
  },
  themeConfig: {
    search,
    footer: {
      message: `${feedback} (rev: ${commitRef})`,
    },
    outline: "deep",
    logo: "/fmhy.ico",
    nav: [
      { text: "Beginners Guide", link: "/beginners-guide" },
      { text: "Glossary", link: "https://rentry.org/The-Piracy-Glossary" },
      { text: "Guides", link: "https://rentry.co/fmhy-guides" },
      { text: "Backups", link: "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/backups" },
    ],
    sidebar,
    socialLinks,
  },
});
