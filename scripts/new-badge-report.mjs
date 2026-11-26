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

// Prints the badge state for a few known entries without building the site.
// Each case mirrors a real commit in the repo history, so the output can be
// compared against what the old URL-only rule used to do.
//
// Usage: node scripts/new-badge-report.mjs

import fs from 'node:fs'
import { badgeKey, resolveNewEntry } from './new-badge.mjs'

const ADDED_DATES_FILE = 'docs/.vitepress/added-dates.json'
const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
const knownAdded = Object.fromEntries(
  Object.entries(JSON.parse(fs.readFileSync(ADDED_DATES_FILE, 'utf8'))).filter(
    ([key]) => key.includes('|')
  )
)

// "beforeNames" is the set of entry names that already existed in the file at
// the parent commit, i.e. what the identity rule checks. The values come from
// the diffs referenced above each case.
const cases = [
  {
    label: 'Metrolist inserted on audio.md (ce8a8d73cb, 2026-11-25)',
    page: 'audio.md',
    url: 'https://metrolist.meowery.eu/',
    name: 'Metrolist',
    date: '2026-11-25',
    beforeNames: new Set()
  },
  {
    label: 'Metrolist on mobile.md, same URL, old entry',
    page: 'mobile.md',
    url: 'https://metrolist.meowery.eu/',
    name: 'Metrolist',
    date: '2026-11-25',
    beforeNames: new Set(['metrolist'])
  },
  {
    label: 'masscan line rewritten with RustScan (edec9cd231, 2026-11-20)',
    page: 'developer-tools.md',
    url: 'https://github.com/robertdavidgraham/masscan',
    name: 'masscan',
    date: '2026-11-20',
    beforeNames: new Set(['masscan', 'rustscan'])
  },
  {
    label: 'APKCombo re-added on mobile.md (dd9cf3c51a, 2026-11-24)',
    page: 'mobile.md',
    url: 'https://apkcombo.com/',
    name: 'APKCombo',
    date: '2026-11-24',
    beforeNames: new Set()
  },
  {
    label: 'spanani Store, genuinely added on mobile.md (ce8a8d73cb)',
    page: 'mobile.md',
    url: 'https://github.com/spananide/spanani-store',
    name: 'spanani Store',
    date: '2026-11-25',
    beforeNames: new Set()
  }
]

let failures = 0
for (const item of cases) {
  const pageSource = fs.readFileSync(`docs/${item.page}`, 'utf8')
  const stillOnPage = pageSource.includes(item.url.replace(/\/$/, ''))
  const badge = resolveNewEntry({
    candidate: {
      page: item.page,
      url: item.url,
      name: item.name,
      date: item.date,
      beforeNames: item.beforeNames,
      stillOnPage
    },
    knownAdded,
    cutoff
  })
  const expected = item.label.includes('genuinely added') ? item.date : null
  const ok = badge === expected
  if (!ok) failures++
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${item.label}\n` +
      `     badge: ${badge ?? 'none'}${
        ok ? '' : ` (expected ${expected ?? 'none'})`
      }`
  )
}

console.log(
  `\n${cases.length - failures}/${cases.length} cases behave as intended ` +
    `(cutoff ${cutoff}, ${Object.keys(knownAdded).length} known dates).`
)

if (failures) process.exit(1)
