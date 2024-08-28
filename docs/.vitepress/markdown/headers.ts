/**
 *  Copyright (c) taskylizard. All rights reserved.
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
  // Add the Feedback component after the heading and close the container
  md.renderer.rules.heading_close = (tokens, idx, options, env, self) => {
    const result = self.renderToken(tokens, idx, options)
    const heading = tokens[idx - 1]
    const level = tokens[idx].tag.slice(1)
    if (!titles.includes(env.frontmatter.title) || level !== '2') return result

    return `<Feedback heading="${heading.content}" />${result}`
  }
}
