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

import type { Theme } from 'vitepress'
import Components from '@fmhy/components'
import DefaultTheme from 'vitepress/theme'
import { loadProgress } from './composables/nprogress'
import Layout from './Layout.vue'
import Post from './PostLayout.vue'

import './style.scss'
import 'virtual:uno.css'

import Feedback from './components/Feedback.vue'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ router, app }) {
    app.use(Components)
    app.component('Post', Post)
    app.component('Feedback', Feedback)
    loadProgress(router)
  }
} satisfies Theme
