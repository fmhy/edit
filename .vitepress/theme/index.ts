import { h } from "vue";
import  {type Theme, inBrowser } from "vitepress";
import DefaultTheme from "vitepress/theme";
import "./style.css";
import "uno.css";

if (inBrowser)
  import('./pwa')


export default {
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
    });
  },
  enhanceApp({ app, router, siteData }) {
  },
} satisfies Theme;
