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

// Shared by scripts/generate-removed.js (which decides what is new) and the
// small checks in tests/, so the rule can be exercised without a site build.

const INVISIBLE = /[\u2060\u200B\u200C\u200D\uFEFF]/g

// Entry labels sometimes carry an invisible word joiner and stray spacing.
export function normalizeName(name) {
  return name.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

// "docs/mobile.md" -> "mobile.md", the form VitePress puts in
// env.relativePath and the form used as the first half of a badge key.
export function pageFromFile(file) {
  return file.replace(/\\/g, '/').replace(/^docs\//, '')
}

// A badge belongs to one entry on one page. Keying by URL alone let a page
// that inserted a shared link badge the same link everywhere else.
export function badgeKey(page, url) {
  return `${page}|${url}`
}

/**
 * Names a bullet already lists, before its description.
 *
 * Deliberately generous: every link label on the left of the description
 * separator counts, because a missed name only loses a badge while a
 * misread entry would wrongly give an old entry a new one. The result depends
 * only on the bullet, so the caller can cache it per parsed document.
 */
export function bulletNames(bullet) {
  const { text, links } = bullet
  if (!text || !links?.length) return []
  let descriptionIndex = text.length
  let end = 0
  for (const link of links) {
    const separator = text.slice(end, link.index).match(/\s+[-–—]\s+/)
    if (separator) {
      descriptionIndex = end + separator.index
      break
    }
    end = link.end
  }
  return links
    .filter((link) => link.index < descriptionIndex && normalizeName(link.name))
    .map((link) => normalizeName(link.name))
    .filter((name) => !/^\d+$/.test(name))
}

/**
 * Decide whether an entry that appeared on an added diff line counts as new.
 * Returns the date to show, or null for no badge.
 *
 * candidate: { page, url, date, name, beforeNames, stillOnPage }
 * knownAdded: "<page>|<url>" -> date, from docs/.vitepress/added-dates.json
 *
 * Everything is resolved conservatively: a date we cannot establish means no
 * badge, never a badge dated today.
 */
export function resolveNewEntry({
  candidate,
  knownAdded = {},
  cutoff,
  removedInWindow = new Set(),
  removedNames = new Set()
}) {
  const { page, url, date, name, beforeNames, stillOnPage } = candidate
  if (!stillOnPage) return null
  if (removedInWindow.has(url)) return null
  if (removedNames.has(normalizeName(name))) return null
  // Same label in the same file at the parent commit: an old entry whose line
  // was rewritten, re-linked, moved or renamed, so the diff is misleading.
  if (beforeNames?.has(normalizeName(name))) return null
  const known = knownAdded[badgeKey(page, url)]
  if (known && known < cutoff) return null
  if (known) return known
  return date
}
