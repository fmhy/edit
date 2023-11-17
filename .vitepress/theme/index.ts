import { type Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";
import { loadProgress } from "./composables/nprogress";
import "./style.css";
import "uno.css";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ router }) {
    loadProgress(router);
  },
} satisfies Theme;
