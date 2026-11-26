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

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  badgeKey,
  bulletNames,
  normalizeName,
  pageFromFile,
  resolveNewEntry
} from '../scripts/new-badge.mjs'

const page = 'mobile.md'
const cutoff = '2026-11-19'
const recent = '2026-11-25'

const candidate = (overrides = {}) => ({
  page,
  url: 'https://metrolist.meowery.eu/',
  name: 'Metrolist',
  date: recent,
  beforeNames: new Set(),
  stillOnPage: true,
  ...overrides
})

const resolve = (overrides, extra = {}) =>
  resolveNewEntry({ candidate: candidate(overrides), cutoff, ...extra })

describe('badge keys', () => {
  test('are scoped to the page, not just the URL', () => {
    assert.equal(
      badgeKey('mobile.md', 'https://a.test/'),
      'mobile.md|https://a.test/'
    )
    assert.notEqual(
      badgeKey('mobile.md', 'https://a.test/'),
      badgeKey('audio.md', 'https://a.test/')
    )
  })

  test('strip the docs/ prefix the same way on both sides', () => {
    assert.equal(pageFromFile('docs/mobile.md'), 'mobile.md')
    assert.equal(
      pageFromFile('docs/other/selfhosting.md'),
      'other/selfhosting.md'
    )
    assert.equal(pageFromFile('mobile.md'), 'mobile.md')
  })

  test('ignore the invisible word joiner in labels', () => {
    assert.equal(normalizeName('\u2060Metrolist '), 'metrolist')
  })
})

describe('resolveNewEntry', () => {
  test('badges a genuinely new entry with its own date', () => {
    assert.equal(resolve({ url: 'https://example.test/new-app' }), recent)
  })

  test('does not badge a name that already existed in the same file', () => {
    // Metrolist on mobile.md: the line was not new, only its URL was touched
    // elsewhere. Same-name entries never count as additions.
    assert.equal(resolve({ beforeNames: new Set(['metrolist']) }), null)
  })

  test('does not badge a URL known to be older than the window', () => {
    const knownAdded = {
      'mobile.md|https://metrolist.meowery.eu/': '2024-12-28'
    }
    assert.equal(resolve({}, { knownAdded }), null)
  })

  test('does not inherit a date recorded for another page', () => {
    const knownAdded = { 'audio.md|https://metrolist.meowery.eu/': recent }
    assert.equal(resolve({}, { knownAdded }), recent)
    assert.equal(
      resolve(
        { page: 'gaming.md', url: 'https://metrolist.meowery.eu/' },
        { knownAdded }
      ),
      recent
    )
  })

  test('does not badge an entry that is no longer on the page', () => {
    assert.equal(resolve({ stillOnPage: false }), null)
  })

  test('does not badge a URL removed earlier in the window', () => {
    assert.equal(
      resolve(
        {},
        { removedInWindow: new Set(['https://metrolist.meowery.eu/']) }
      ),
      null
    )
  })

  test('does not badge a name removed in the same commit', () => {
    assert.equal(resolve({}, { removedNames: new Set(['metrolist']) }), null)
  })

  test('leaves an unresolvable entry unbadged rather than dating it today', () => {
    assert.equal(resolve({ date: null }), null)
  })
})

describe('renderer key matches the generator key', () => {
  test('newBadgeDate survives a dynamic import of the plugin', async (t) => {
    // The plugin is TypeScript; older Node builds without type stripping skip
    // this check rather than failing the suite for the wrong reason.
    let m
    try {
      m = await import('../docs/.vitepress/markdown/toggleStarred.ts')
    } catch (error) {
      t.diagnostic(`skipped: cannot load the .ts plugin (${error.message})`)
      return
    }
    const sites = { 'mobile.md|https://metrolist.meowery.eu/': '2026-11-25' }
    assert.equal(
      m.newBadgeDate(sites, 'mobile.md', 'https://metrolist.meowery.eu/'),
      '2026-11-25'
    )
    // Another page holding the same URL must not pick up this date.
    assert.equal(
      m.newBadgeDate(sites, 'audio.md', 'https://metrolist.meowery.eu/'),
      undefined
    )
    // Trailing-slash and case normalisation must agree with the generator.
    assert.equal(
      m.newBadgeDate(sites, 'mobile.md', 'https://Metrolist.meowery.eu'),
      '2026-11-25'
    )
  })
})

describe('bulletNames', () => {
  // The bullet shape parseInlineLinks() produces: text is the rendered line,
  // links carry their label and the offset the label starts at.
  const bullet = (text, pairs) => ({
    text,
    links: pairs.map(([name, url, marker]) => ({
      name,
      url,
      index: text.indexOf(marker),
      end: text.indexOf(marker) + marker.length
    }))
  })

  test('collects peer names on the left of the description', () => {
    const b = bullet(
      '* [masscan](https://github.com/robertdavidgraham/masscan) or [RustScan](https://github.com/bee-san/RustScan) - Port Scanners',
      [
        [
          'masscan',
          'https://github.com/robertdavidgraham/masscan',
          '[masscan]'
        ],
        ['RustScan', 'https://github.com/bee-san/RustScan', '[RustScan]']
      ]
    )
    assert.deepEqual(bulletNames(b), ['masscan', 'rustscan'])
  })

  test('ignores links in the description, which are supporting links', () => {
    const b = bullet(
      '* [Metrolist](https://metrolist.meowery.eu/) - Player / [GitHub](https://github.com/x)',
      [
        ['Metrolist', 'https://metrolist.meowery.eu/', '[Metrolist]'],
        ['GitHub', 'https://github.com/x', '[GitHub]']
      ]
    )
    assert.deepEqual(bulletNames(b), ['metrolist'])
  })

  test('drops numeric side-link labels', () => {
    const b = bullet(
      '* [Metrolist](https://a.test), [2](https://b.test) - Player',
      [
        ['Metrolist', 'https://a.test', '[Metrolist]'],
        ['2', 'https://b.test', '[2]']
      ]
    )
    assert.deepEqual(bulletNames(b), ['metrolist'])
  })

  test('returns nothing for a bullet without links', () => {
    assert.deepEqual(
      bulletNames({ text: '* **Note** - plain text', links: [] }),
      []
    )
  })
})
