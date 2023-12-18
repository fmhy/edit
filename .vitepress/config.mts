import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";
import UnoCSS from "unocss/vite";
import { presetUno, presetAttributify, presetIcons } from "unocss";
import { commitRef, meta, socials } from "./constants";
import { generateImages, generateMeta } from "./hooks";
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
  metaChunk: true,
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
    generateImages(context);
  },
  vite: {
    plugins: [
      UnoCSS({
        theme: {
          colors: {
            primary: "var(--vp-c-brand-1)",
            bg: "var(--vp-c-bg)",
            "bg-alt": "var(--vp-c-bg-alt)",
            "bg-elv": "var(--vp-c-bg-elv)",
            text: "var(--vp-c-text-1)",
            "text-2": "var(--vp-c-text-2)",
            div: "var(--vp-c-divider)",
          },
        },
        presets: [
          presetUno(),
          presetAttributify(),
          presetIcons({
            scale: 1.2,
            extraProperties: {
              display: "inline-block",
              "vertical-align": "middle",
            },
          }),
        ],
      }),
    ],
    build: {
      // Shut the fuck up
      chunkSizeWarningLimit: Number.POSITIVE_INFINITY,
    },
    resolve: {
      alias: [
        {
          find: /^.*VPSwitchAppearance\.vue$/,
          replacement: fileURLToPath(
            new URL("./theme/components/ThemeSwitch.vue", import.meta.url),
          ),
        },
      ],
    },
  },
  markdown: {
    config(md) {
      md.use(toggleStarredPlugin);
      md.use(base64DecodePlugin);
    },
  },
  themeConfig: {
    search: {
      options: {
        miniSearch: { searchOptions: { combineWith: "AND" } },
        detailedView: true,
      },
      provider: "local",
    },
    footer: {
      message: `Made with ❤️ (rev: ${commitRef})`,
    },
    outline: "deep",
    logo: "/fmhy.ico",
    nav: [
      { text: "Beginners Guide", link: "/beginners-guide" },
      { text: "Glossary", link: "https://rentry.org/The-Piracy-Glossary" },
      { text: "Guides", link: "https://rentry.co/fmhy-guides" },
      { text: "Backups", link: "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/backups" },
      { text: "Updates", link: "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/updates/" },
    ],
    sidebar: [
      { text: "📛 Adblocking / Privacy", link: "/adblockvpnguide" },
      { text: "🤖 Artificial Intelligence", link: "/ai" },
      { text: "📺 Movies / TV / Anime", link: "/videopiracyguide" },
      { text: "🎵 Music / Podcasts / Radio", link: "/audiopiracyguide" },
      { text: "🎮 Gaming / Emulation", link: "/gamingpiracyguide" },
      { text: "📗 Books / Comics / Manga", link: "/readingpiracyguide" },
      { text: "💾 Downloading", link: "/downloadpiracyguide" },
      { text: "🌀 Torrenting", link: "/torrentpiracyguide" },
      { text: "🧠 Educational", link: "/edupiracyguide" },
      { text: "📱 Android / iOS", link: "/android-iosguide" },
      { text: "🐧 Linux / MacOS", link: "/linuxguide" },
      { text: "🌍 Non-English", link: "/non-english" },
      { text: "📂 Miscellaneous", link: "/miscguide" },
      { text: "🔞 NSFW", link: "/nsfwpiracy" },
      { text: "⚠️ Unsafe Sites", link: "/unsafesites" },
      { text: "🔑 Base64", link: "/base64" },
      { text: "📦 Storage", link: "/storage" },
      {
        text: "🔧 Tools",
        collapsed: false,
        items: [
          { text: "💻 System Tools", link: "/system-tools" },
          { text: "🗃️ File Tools", link: "/file-tools" },
          { text: "🔗 Internet Tools", link: "/internet-tools" },
          { text: "💬 Social Media Tools", link: "/social-media-tools" },
          { text: "📝 Text Tools", link: "/text-tools" },
          { text: "👾 Gaming Tools", link: "/gamingpiracyguide#gaming-tools" },
          { text: "📷 Image Tools", link: "/img-tools" },
          { text: "📼 Video Tools", link: "/video-tools" },
          { text: "🔊 Audio Tools", link: "/audio-tools" },
          { text: "🍎 Educational Tools", link: "/edupiracyguide#educational-tools" },
          { text: "👨‍💻 Developer Tools", link: "/devtools" },
        ],
      },
    ],
    socialLinks: socials,
  },
});
