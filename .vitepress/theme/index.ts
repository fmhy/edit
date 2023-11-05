import { h } from "vue";
import { type Theme, inBrowser } from "vitepress";
import DefaultTheme from "vitepress/theme";
import Sidebar from "./components/SidebarCard.vue";
import Layout from "./Layout.vue";
import "./style.css";
import "uno.css";

// if (inBrowser) import("./pwa");

export default {
  extends: DefaultTheme,
  Layout: Layout,
  enhanceApp({ app, router, siteData }) {},
} satisfies Theme;
