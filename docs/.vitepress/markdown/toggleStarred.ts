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
import { readFileSync } from 'node:fs'

const excluded = ['Beginners Guide']
const starredMarkers = [':star:', ':glowing-star:', '⭐', '🌟']
const indexMarkers = ['🌐', ':globe_with_meridians:', ':globe-with-meridians:']

// Written by scripts/generate-removed.js from Git history: URL -> date added.
// Badges therefore appear and expire on their own with each build.
function loadNewSites(): Record<string, string> {
  try {
    return JSON.parse(
      readFileSync(new URL('../new-sites.json', import.meta.url), 'utf8')
    )
  } catch {
    return {}
  }
}

// Must match normalizeUrl() in scripts/generate-removed.js.
function normalizeUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.pathname !== '/')
      url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    return url.href
  } catch {
    return value
  }
}

// Same hover card as the Recently Removed dates ("2 days ago" + full date).
const newBadge = (date: string) =>
  `<button type="button" class="new-badge" aria-label="New, added ${date}" v-tooltip="{ content: () => $removedDateTooltip('${date}'), html: true, triggers: $removedDateTriggers, autoHide: true, popperClass: 'new-badge-popper' }"></button>`

type InlineToken = NonNullable<
  ReturnType<MarkdownRenderer['parse']>[number]['children']
>[number]

// Put a badge right after every link on the line that is new, so a link
// added in the middle or at the end of a line gets its own badge.
function markNewLinks(
  children: InlineToken[],
  newSites: Record<string, string>,
  Token: new (type: string, tag: string, nesting: number) => InlineToken
) {
  let found = false
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child.type !== 'link_open') continue
    if (child.meta?.newBadge) {
      found = true
      continue
    }
    const href = child.attrGet('href')
    if (!href || !/^https?:\/\//i.test(href)) continue
    const addedOn = newSites[normalizeUrl(href)]
    if (!addedOn) continue
    child.meta = { ...child.meta, newBadge: true }
    let depth = 0
    for (let j = i; j < children.length; j++) {
      if (children[j].type === 'link_open') depth++
      if (children[j].type === 'link_close' && --depth === 0) {
        const badge = new Token('html_inline', '', 0)
        badge.content = newBadge(addedOn)
        children.splice(j + 1, 0, badge)
        break
      }
    }
    found = true
  }
  return found
}

export function toggleStarredPlugin(md: MarkdownRenderer) {
  const newSites = loadNewSites()

  md.renderer.rules.list_item_open = (tokens, index, options, env, self) => {
    const contentToken = tokens[index + 2]

    if (!contentToken) return self.renderToken(tokens, index, options)

    const content = contentToken.content
    const isStarred =
      !excluded.includes(env.frontmatter.title) &&
      starredMarkers.some((marker) => content.includes(marker))
    const isIndex = indexMarkers.some((marker) => content.includes(marker))
    const isNew =
      !!contentToken.children &&
      markNewLinks(
        contentToken.children,
        newSites,
        md.core.State.prototype.Token
      )

    if (!isStarred && !isIndex && !isNew)
      return self.renderToken(tokens, index, options)

    const classes = []
    if (isStarred) classes.push('starred')
    if (isIndex) classes.push('index')
    if (isNew) classes.push('new')

    return `<li class="${classes.join(' ')}">`
  }
}
