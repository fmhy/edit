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
      {
        text: "Examples",
        items: [
          { text: "Markdown Examples", link: "/markdown-examples" },
          { text: "Runtime API Examples", link: "/api-examples" },
        ],
      },
    ],
    // TODO: add socials
    socialLinks: [],
  },
});
