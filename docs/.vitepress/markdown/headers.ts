/**
 *  Copyright (c) 2024 taskylizard
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
import { headers } from '../transformer/constants'

const titles = Object.keys(headers).map((key) => headers[key].title)

export const headersPlugin = (md: MarkdownRenderer) => {
  // Add the Feedback component in the heading, before the link.
  //
  // Adding it after the link is closed prevents vitepress from properly
  // indexing the file's content.

  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const result = self.renderToken(tokens, idx, options)

    const idxClose =
      idx +
      tokens.slice(idx).findIndex((token) => token.type === 'heading_close')
    if (idxClose <= idx) return result

    const level = tokens[idx].tag.slice(1)
    if (!titles.includes(env.frontmatter.title) || level !== '2') return result

    // Find the token for the link.
    //
    // The token after `heading_open` contains the link as a child token.
    const children = tokens[idx + 1].children || []
    const linkOpenToken = children.findLast((c) => c.type === 'link_open')
    if (!linkOpenToken) return result

    const heading = tokens[idxClose - 1]

    linkOpenToken.meta = linkOpenToken.meta || {}
    linkOpenToken.meta.feedback = {
      heading: heading.content
    }

    return result
  }

  let defaultRender = md.renderer.rules.link_open;

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const result = defaultRender(tokens, idx, options, env, self);

    const meta = tokens[idx].meta
    if (!meta || !meta.feedback) return result

    const heading = meta.feedback.heading || ''
    if (!heading) return result

    return `<Feedback heading="${heading}" />${result}`
  }
}
