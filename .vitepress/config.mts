import { defineConfig } from "vitepress";
import UnoCSS from "unocss/vite";
import { presetUno, presetAttributify, presetIcons } from "unocss";

export default defineConfig({
  title: "FMHY",
  description: "site",
  titleTemplate: ":title | FreeMediaHeckYeah",
  lang: "en-US",
  lastUpdated: true,
  cleanUrls: true,
  appearance: "dark",
  srcExclude: ["README.md", "single-page", "DEVTools.md"],
  ignoreDeadLinks: true,
  head: [
    ["meta", { name: "theme-color", content: "#7bc5e4" }],
    ["meta", { name: "og:type", content: "website" }],
    ["meta", { name: "og:locale", content: "en" }],
  ],
  vite: {
    plugins: [
      UnoCSS({
        presets: [presetUno, presetAttributify, presetIcons({ scale: 1.2 })],
      }),
    ],
  },
  themeConfig: {
    search: {
      provider: "local",
    },
    nav: [
      { text: "Glossary", link: "https://rentry.org/The-Piracy-Glossary" },
      { text: "Guides", link: "https://rentry.co/fmhy-guides" },
    ],
    sidebar: [
      { text: "Beginners Guide to Piracy", link: "/Beginners-Guide" },
      { text: "Adblocking / Privacy", link: "/AdblockVPNGuide" },
      { text: "Artificial Intelligence", link: "/AI" },
      { text: "Android / iOS", link: "Android-iOSGuide" },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/fmhy/FMHYEdit" },
      { icon: "discord", link: "https://discord.gg/Stz6y6NgNg" },
    ],
  },
});
