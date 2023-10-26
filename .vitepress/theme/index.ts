import { h } from "vue";
import "uno.css"
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import "./style.css";

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
    });
  },
  enhanceApp({ app, router, siteData }) {
  },
} satisfies Theme;
