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

// FIXME: tasky: possibly write less horror jank?
export function base64DecodePlugin(md: MarkdownRenderer) {
  const decode = (str: string): string =>
    Buffer.from(str, 'base64').toString('binary')
  // Save the original rule for backticks
  const defaultRender =
    md.renderer.rules.code_inline ||
    function (tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options)
    }

  md.renderer.rules.code_inline = function (tokens, idx, options, env, self) {
    if (
      !env.frontmatter.title ||
      (env.frontmatter.title && env.frontmatter.title !== 'base64')
    ) {
      return defaultRender(tokens, idx, options, env, self)
    }
    const token = tokens[idx]
    const content = token.content

    return `<button class='base64' onclick="(function(btn){ const codeEl = btn.querySelector('code'); navigator.clipboard.writeText('${decode(
      content
    )}').then(() => { const originalText = codeEl.textContent; codeEl.textContent = 'Copied'; setTimeout(() => codeEl.textContent = originalText, 3000); }).catch(console.error); })(this)"><code>${content}</code></button>`
  }
}
