/**
 *  Copyright (c) 2025 taskylizard. Apache License 2.0.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/* eslint-disable ts/consistent-type-imports */
declare module '*.vue' {
  const component: import('vue').Component
  export default component
}

declare module 'vitepress/dist/client/theme-default/composables/nav' {
  export function useNav(): {
    isScreenOpen: import('vue').Ref<boolean>
    openScreen: () => void
    closeScreen: () => void
    toggleScreen: () => void
  }
}

declare module 'vitepress/dist/client/theme-default/components/VPNavBar.vue' {
  const component: import('vue').Component
  export default component
}

declare module 'vitepress/dist/client/theme-default/components/VPNavScreen.vue' {
  const component: import('vue').Component
  export default component
}

// Vite's HMR API (`import.meta.hot`). Vite isn't hoisted to the root
// node_modules, so we can't pull in `vite/client` via tsconfig `types`;
// declare the slice of the API this theme uses instead.
interface ImportMeta {
  readonly hot?: {
    accept(dep: string, cb: (mod: { default: unknown }) => void): void
    accept(cb?: (mod: unknown) => void): void
  }
}

// Virtual module emitted by VitePress' local-search build step. The default
// export is keyed by locale; each value lazy-loads that locale's MiniSearch
// index JSON.
declare module '@localSearchIndex' {
  const data: Record<string, () => Promise<{ default: string }>>
  export default data
}

// VitePress ships these as runtime-only deep imports (no sibling .d.ts), and
// the subpaths aren't in its package `exports` map, so declare what we use.
declare module 'vitepress/types/local-search' {
  export interface ModalTranslations {
    displayDetails?: string
    resetButtonTitle?: string
    backButtonTitle?: string
    noResultsText?: string
    footer?: Record<string, string>
  }
}

declare module 'vitepress/dist/client/app/utils' {
  export function pathToFile(path: string): string
}

declare module 'vitepress/dist/client/shared' {
  export function escapeRegExp(str: string): string
}

declare module 'vitepress/dist/client/theme-default/composables/data' {
  // The theme-default composable just re-exports the client's `useData`;
  // borrow its real (fully-typed) signature instead of hand-rolling one.
  export { useData } from 'vitepress/dist/client/index.js'
}

declare module 'vitepress/dist/client/theme-default/support/translation' {
  export function createSearchTranslate(
    defaultTranslations: Record<string, unknown>
  ): (key: string) => string
}

declare module 'mark.js/src/vanilla.js' {
  interface MarkOptions {
    exclude?: string[]
    acrossElements?: boolean
    done?: () => void
    [key: string]: unknown
  }
  export default class Mark {
    constructor(ctx: Element | Element[] | NodeList | string)
    mark(keyword: string | string[], options?: MarkOptions): void
    markRegExp(regexp: RegExp, options?: MarkOptions): void
    unmark(options?: MarkOptions): void
  }
}
