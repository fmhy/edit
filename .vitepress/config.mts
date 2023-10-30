import { defineConfig } from "vitepress";
import { withPwa } from "@vite-pwa/vitepress";
import UnoCSS from "unocss/vite";
import { presetUno, presetAttributify, presetIcons } from "unocss";
import { meta } from "./constants";
import { pwa } from "./pwa";
import { generateMeta } from "./hooks/meta";

export default withPwa(
  defineConfig({
    title: "FMHY",
    description: meta.description,
    titleTemplate: ":title | FreeMediaHeckYeah",
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
      ["meta", { property: "og:type", content: "website" }],
      ["meta", { property: "og:title", content: meta.name }],
      ["link", { rel: "icon", href: "/fmhy.ico", sizes: "any" }],
      ["link", { rel: "icon", href: "/test.png", type: "image/svg+xml" }],
      ["link", { rel: "mask-icon", href: "/test.png", color: "#7bc5e4" }],
      // pwa
      ["link", { rel: "alternate icon", href: "/test.png" }],
      ["link", { rel: "apple-touch-icon", href: "/fmhy.png", sizes: "192x192" }],
      ["meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }],
      ["meta", { name: "keywords", content: meta.keywords.join(" ") }],
      ["meta", { name: "twitter:description", content: meta.description }],
      ["meta", { name: "twitter:title", content: meta.name }],
      ["meta", { name: "twitter:card", content: "summary_large_image" }],
      ["meta", { name: "twitter:site", content: meta.hostname }],
    ],
   transformHead: async (context) => generateMeta(context, meta.hostname),

    vite: {
      plugins: [
        UnoCSS({
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
    },
    themeConfig: {
      search: {
        provider: "local",
      },
      outline: "deep",
      logo: "/fmhy.ico",
      nav: [
        { text: "Beginners Guide", link: "/Beginners-Guide" },
        { text: "Glossary", link: "https://rentry.org/The-Piracy-Glossary" },
        { text: "Guides", link: "https://rentry.co/fmhy-guides" },
        { text: "Backups", link: "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/backups" },
        { text: "Updates", link: "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/updates/" },
      ],
      sidebar: [
        { text: "📛 Adblocking / Privacy", link: "/AdblockVPNGuide" },
        { text: "🤖 Artificial Intelligence", link: "/AI" },
        { text: "📺 Movies / TV / Anime", link: "/VideoPiracyGuide" },
        { text: "🎵 Music / Podcasts / Radio", link: "/AudioPiracyGuide" },
        { text: "🎮 Gaming / Emulation", link: "/GamingPiracyGuide" },
        { text: "📗 Books / Comics / Manga", link: "/ReadingPiracyGuide" },
        { text: "💾 Downloading", link: "/DownloadPiracyGuide" },
        { text: "🌀 Torrenting", link: "/TorrentPiracyGuide" },
        { text: "🧠 Educational", link: "/EDUPiracyGuide" },
        { text: "🔧 Tools", link: "/TOOLSGuide" },
        { text: "📷 Image Tools", link: "/img-tools" },
        { text: "👨‍💻 Developer Tools", link: "/DEVTools" },
        { text: "📱 Android / iOS", link: "/Android-iOSGuide" },
        { text: "🐧 Linux / MacOS", link: "/LinuxGuide" },
        { text: "🌍 Non-English", link: "/Non-English" },
        { text: "📂 Miscellaneous", link: "/MISCGuide" },
        { text: "🔞 NSFW", link: "/NSFWPiracy" },
        { text: "⚠️ Unsafe Sites", link: "/UnsafeSites" },
        { text: "🔑 Base64", link: "/base64" },
        { text: "📦 Storage", link: "/STORAGE" },
      ],
      socialLinks: [
        { icon: "github", link: "https://github.com/fmhy/FMHYEdit" },
        { icon: "discord", link: "https://discord.gg/Stz6y6NgNg" },
        {
          icon: {
            svg: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#888888" d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547l-.8 3.747c1.824.07 3.48.632 4.674 1.488c.308-.309.73-.491 1.207-.491c.968 0 1.754.786 1.754 1.754c0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87c-3.874 0-7.004-2.176-7.004-4.87c0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754c.463 0 .898.196 1.207.49c1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197a.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248c.687 0 1.248-.561 1.248-1.249c0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25c0 .687.561 1.248 1.249 1.248c.688 0 1.249-.561 1.249-1.249c0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094a.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913c.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463a.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73c-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>',
          },
          link: "https://reddit.com/r/FREEMEDIAHECKYEAH",
        },
      ],
      ...pwa,
    },
  }),
);
