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

const newBadge = (date: string) => {
  const label = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
  return `<span class="new-badge" role="img" aria-label="Added ${label}" title="Added ${label}"></span>`
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
    const firstLink = contentToken.children?.find(
      (child) => child.type === 'link_open'
    )
    const href = firstLink?.attrGet('href')
    const addedOn =
      href && /^https?:\/\//i.test(href)
        ? newSites[normalizeUrl(href)]
        : undefined

    if (!isStarred && !isIndex && !addedOn)
      return self.renderToken(tokens, index, options)

    const classes = []
    if (isStarred) classes.push('starred')
    if (isIndex) classes.push('index')
    if (addedOn) classes.push('new')

    return `<li class="${classes.join(' ')}">${addedOn ? newBadge(addedOn) : ''}`
  }
}
