import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "FMHY",
  description: "site",
  titleTemplate: ":title | FreeMediaHeckYeah",
  lang: "en-US",
  lastUpdated: true,
  cleanUrls: true,
  appearance: "dark",
  srcExclude: ["README.md", "single-page"],
  head: [
    ["meta", { name: "theme-color", content: "#7bc5e4" }],
    ["meta", { name: "og:type", content: "website" }],
    ["meta", { name: "og:locale", content: "en" }],
  ],
  themeConfig: {
    search: {
      provider: "local",
    },
    // TODO: add navbar items
    nav: [],
    sidebar: [
      { text: "Beginners Guide to Piracy", link: "/Beginners-Guide" },
      { text: "Adblocking / Privacy", link: "/AdblockVPNGuide" },
      { text: "Artificial Intelligence", link: "/AI" },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/fmhy/FMHYEdit" },
      { icon: "discord", link: "https://discord.gg/Stz6y6NgNg" },
    ],
  },
});
