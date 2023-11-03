import { h } from "vue";
import { type Theme, inBrowser } from "vitepress";
import DefaultTheme from "vitepress/theme";
import Sidebar from "./components/SidebarPane.vue";
import "./style.css";
import "uno.css";

if (inBrowser) import("./pwa");

export default {
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      "sidebar-nav-before": () => h(Sidebar),
    });
  },
  enhanceApp({ app, router, siteData }) {},
} satisfies Theme;
