import { defineConfig } from "vitepress";

export const sharedConfig = defineConfig({
  lang: "en-US",
  lastUpdated: true,
  cleanUrls: true,
  appearance: "dark",
  head: [
    ["meta", { name: "theme-color", content: "#7bc5e4" }],
    ["meta", { name: "og:type", content: "website" }],
    ["meta", { name: "og:locale", content: "en" }],
  ],
  themeConfig: {
    search: {
      provider: "local",
    },
  },
});
