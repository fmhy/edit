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

import type { MarkdownRenderer } from 'vitepress'

const excluded = ['Beginners Guide']

export function toggleStarredPlugin(md: MarkdownRenderer) {
  md.renderer.rules.list_item_open = (tokens, index, options, env, self) => {
    const contentToken = tokens[index + 2]

    // Ensure the token exists
    if (contentToken) {
      const content = contentToken.content

      if (
        !excluded.includes(env.frontmatter.title) &&
        (content.includes(':star:') || content.includes(':glowing-star:'))
      ) {
        return `<li class="starred">`
      }
    }

    return self.renderToken(tokens, index, options)
  }
}
