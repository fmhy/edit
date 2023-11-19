import { type Component } from "vue";

declare module "*.vue" {
  const component: Component;
  export default component;
}
