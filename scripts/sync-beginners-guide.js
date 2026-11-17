/**
 * Syncs the quick-pick lists in docs/beginners-guide.md with the wiki
 * category docs (docs/video.md, docs/audio.md, etc.).
 *
 * Every synced region in the guide is wrapped in HTML comment markers:
 *
 *   <!-- sync:start <id> -->
 *   ...generated bullets...
 *   <!-- sync:end <id> -->
 *
 * The MAPPING table below declares, for each marker id, which bullets to
 * generate and where every pick comes from. A pick either takes the top N
 * starred entries of a wiki section (`count`) or pins specific entries by
 * their exact source name (`names`), output in config order.
 *
 * Anything outside the markers is left byte-for-byte alone, so hand-written
 * guide content is never touched by a sync run.
 *
 * The script fails loudly when a source heading, pinned entry name, carried
 * link label, or `verify` substring (used for iOS version tags) can no
 * longer be resolved, so wiki renames surface as visible errors instead of
 * silent staleness. Run with --check to verify without writing.
 *
 * Standard library only.
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const GUIDE_PATH = path.join(ROOT, 'docs/beginners-guide.md')

const INVISIBLE_RE = /[\u2060\u200B\u200C\u200D\uFEFF]/g
const LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g

const stripInvisible = (text) => text.replace(INVISIBLE_RE, '')

// Punctuation-insensitive key so `Moon+ Reader`, `Vimm's Lair` and
// `Last.fm` match their source spellings exactly.
const normalizeKey = (text) =>
  stripInvisible(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const cleanLabel = (text) => stripInvisible(text).trim()

// ---------------------------------------------------------------------------
// Source parsing
// ---------------------------------------------------------------------------

function headingName(text) {
  const linked = text.match(/\[([^\]]+)\]\(/)
  if (linked) return stripInvisible(linked[1]).trim()
  return stripInvisible(text)
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .trim()
}

// Index of the ` - ` description separator that sits outside any link span.
function findDescIndex(line) {
  const spans = []
  for (const match of line.matchAll(LINK_RE)) {
    spans.push([match.index, match.index + match[0].length])
  }
  const separator = /\s[-\u2013\u2014]\s/g
  let match
  while ((match = separator.exec(line))) {
    const insideLink = spans.some(
      ([start, end]) => match.index >= start && match.index < end
    )
    if (!insideLink) return match.index
  }
  return -1
}

function parseEntry(raw) {
  const line = stripInvisible(raw)
  let marker = 'plain'
  if (line.includes('\u{1F31F}')) marker = 'super'
  else if (line.includes('\u2B50')) marker = 'star'
  else if (line.includes('\uD83C\uDF10')) marker = 'globe'
  else if (line.includes('\u21AA')) marker = 'jump'
  const links = []
  for (const match of line.matchAll(LINK_RE)) {
    links.push({
      label: match[1],
      url: match[2],
      bold:
        match.index >= 2 && line.slice(match.index - 2, match.index) === '**',
      start: match.index
    })
  }
  return {
    line,
    marker,
    isNote: /^\*\s+\*\*Note\*\*/.test(line),
    links,
    descIndex: findDescIndex(line)
  }
}

function parseDoc(file) {
  const raw = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const sections = []
  let h1 = null
  let section = null
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = stripInvisible(rawLine)
    const h2Match = line.match(/^## (.+)$/)
    const h1Match = line.match(/^# (.+)$/)
    if (h2Match) {
      section = { file, h1, h2: headingName(h2Match[1]), entries: [] }
      sections.push(section)
    } else if (h1Match) {
      h1 = headingName(h1Match[1])
      section = { file, h1, h2: null, entries: [] }
      sections.push(section)
    } else if (section && line.startsWith('* ')) {
      section.entries.push(parseEntry(line))
    }
  }
  return sections
}

const sectionCache = new Map()

function getSections(file) {
  if (!sectionCache.has(file)) sectionCache.set(file, parseDoc(file))
  return sectionCache.get(file)
}

function sectionPath(section) {
  return section.h2 ? `${section.h1} \u203A ${section.h2}` : section.h1
}

function getSection(file, heading) {
  const found = getSections(file).find((s) => sectionPath(s) === heading)
  if (found) return found
  const available = getSections(file)
    .map((s) => `  - ${sectionPath(s)}`)
    .join('\n')
  throw new Error(
    `Section "${heading}" not found in ${file}. Available sections:\n${available}`
  )
}

// ---------------------------------------------------------------------------
// Pick resolution
// ---------------------------------------------------------------------------

function primaryLink(entry) {
  const bold = entry.links.find((link) => link.bold)
  const link = bold ?? entry.links[0]
  if (!link) throw new Error(`Source entry has no link: ${entry.line}`)
  return link
}

function buildPick(bullet, entry, link, cfg, context) {
  const pick = {
    label: cleanLabel(link.label),
    url: link.url,
    note: cfg?.note,
    withLinks: [],
    warnings: []
  }
  for (const label of cfg?.with ?? []) {
    const found = entry.links.find(
      (l) => normalizeKey(l.label) === normalizeKey(label)
    )
    if (!found) {
      throw new Error(
        `${context}: entry "${cfg.name}" has no link labeled "${label}" on its source line`
      )
    }
    pick.withLinks.push({ label: cleanLabel(found.label), url: found.url })
  }
  const warnLabels = bullet.warnLabels ?? {}
  if (entry.descIndex >= 0) {
    for (const l of entry.links) {
      if (l === link) continue
      const label = cleanLabel(l.label)
      if (l.bold && l.start > entry.descIndex && /warning/i.test(label)) {
        pick.warnings.push({ label: warnLabels[label] ?? label, url: l.url })
      }
    }
  }
  return pick
}

function resolvePicks(bullet, context) {
  // Per-source entry groups so a pinned name can be scoped to one section
  // with `{ name: ..., in: 0 }` when the same name appears in two of them.
  const groups = bullet.from.map(
    ([file, heading]) => getSection(file, heading).entries
  )
  const entries = groups.flat()

  if (bullet.count != null) {
    const starred = entries.filter(
      (entry) =>
        !entry.isNote && (entry.marker === 'star' || entry.marker === 'super')
    )
    if (starred.length < bullet.count) {
      throw new Error(
        `${context}: expected ${bullet.count} starred entries in ${bullet.from
          .map(([file, heading]) => `${file} "${heading}"`)
          .join(', ')}, found only ${starred.length}`
      )
    }
    return starred
      .slice(0, bullet.count)
      .map((entry) =>
        buildPick(bullet, entry, primaryLink(entry), null, context)
      )
  }

  return bullet.names.map((name) => {
    const cfg = typeof name === 'string' ? { name } : name
    const key = normalizeKey(cfg.name)
    if (cfg.in != null && !groups[cfg.in]) {
      throw new Error(
        `${context}: name "${cfg.name}" scopes to from[${cfg.in}] but ${bullet.from.length} sources are listed`
      )
    }
    const scope = cfg.in == null ? entries : groups[cfg.in]
    const matches = []
    for (const entry of scope) {
      for (const link of entry.links) {
        if (normalizeKey(link.label) === key) matches.push({ entry, link })
      }
    }
    if (matches.length === 0) {
      throw new Error(
        `${context}: entry "${cfg.name}" not found in ${bullet.from
          .map(([file, heading]) => `${file} "${heading}"`)
          .join(', ')}`
      )
    }
    const owners = new Set(matches.map((match) => match.entry))
    if (owners.size > 1) {
      throw new Error(
        `${context}: entry "${cfg.name}" matches ${owners.size} different source entries, refusing to guess`
      )
    }
    const { entry, link } = matches[0]
    if (cfg.verify && !entry.line.includes(cfg.verify)) {
      throw new Error(
        `${context}: source line for "${cfg.name}" no longer contains "${cfg.verify}", update the mapping`
      )
    }
    return buildPick(bullet, entry, link, cfg, context)
  })
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderLabeledPart(bullet, pick) {
  const joiner = bullet.withJoiner ?? ' / '
  let part = `[${pick.label}](${pick.url})`
  if (pick.note) part += ` (${pick.note})`
  for (const link of pick.withLinks) {
    part += `${joiner}[${link.label}](${link.url})`
  }
  for (const warning of pick.warnings) {
    part += ` / [${warning.label}](${warning.url})`
  }
  return part
}

function renderUnlabeledPick(pick) {
  let line = `* **[${pick.label}](${pick.url})**`
  if (pick.note) line += ` - ${pick.note}`
  for (const link of pick.withLinks) {
    line += ` / [${link.label}](${link.url})`
  }
  for (const warning of pick.warnings) {
    line += ` / **[${warning.label}](${warning.url})**`
  }
  return line
}

function renderBullet(bullet, context) {
  const picks = resolvePicks(bullet, context)
  if (bullet.label) {
    const parts = picks.map((pick) => renderLabeledPart(bullet, pick))
    return [`* **${bullet.label}: ${parts.join(' / ')}**`]
  }
  return picks.map((pick) => renderUnlabeledPick(pick))
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

// One entry per `<!-- sync:start <id> -->` marker pair in the guide. A
// bullet is one generated guide line: `label` bullets join every pick into
// a single bold line, unlabeled bullets render one line per pick.
export const MAPPING = [
  {
    id: 'movies-streaming',
    bullets: [
      {
        label: 'Streaming',
        from: [['docs/video.md', 'Streaming Sites \u203A Stream Aggregators']],
        count: 4
      }
    ]
  },
  {
    id: 'movies-media',
    bullets: [
      {
        label: 'Torrenting',
        from: [['docs/video.md', 'Torrent Sites']],
        names: ['1337x Movies', 'ExT']
      },
      {
        label: 'Sports Streaming',
        from: [['docs/video.md', 'Live TV / Sports \u203A Live Sports']],
        count: 2
      },
      {
        label: 'Drama Streaming',
        from: [['docs/video.md', 'Specialty Streaming \u203A Drama Streaming']],
        count: 2
      },
      {
        label: 'Tracking',
        from: [['docs/video.md', 'Tracking / Databases']],
        count: 2
      },
      {
        label: 'Discovery',
        from: [
          ['docs/video.md', 'Tracking / Databases \u203A Recommendation Tools']
        ],
        names: ['They Shoot Pictures', 'MDBList', 'Series Graph']
      }
    ]
  },
  {
    id: 'anime',
    bullets: [
      {
        label: 'Streaming',
        from: [['docs/video.md', 'Specialty Streaming \u203A Anime Streaming']],
        count: 4
      },
      {
        label: 'Downloading',
        from: [['docs/video.md', 'Download Sites \u203A Anime Downloading']],
        count: 2
      },
      {
        label: 'Torrenting',
        from: [['docs/video.md', 'Torrent Sites \u203A Anime Torrenting']],
        names: ['Nyaa', { name: 'Hayase', with: ['Extensions'] }]
      },
      {
        label: 'Tracking',
        from: [
          [
            'docs/video.md',
            'Tracking / Databases \u203A Anime Tracking / Databases'
          ]
        ],
        count: 2
      },
      {
        label: 'Discovery',
        from: [
          [
            'docs/video.md',
            'Tracking / Databases \u203A Anime Tracking / Databases'
          ],
          ['docs/video.md', 'Tracking / Databases \u203A Recommendation Tools']
        ],
        names: ['Anime-Planet', 'AnimeKarmaList']
      }
    ]
  },
  {
    id: 'music',
    bullets: [
      {
        label: 'Streaming',
        from: [
          ['docs/audio.md', 'Spotify Tools'],
          ['docs/audio.md', 'Audio Streaming \u203A Streaming Sites']
        ],
        names: ['SpotX', 'Monochrome']
      },
      {
        label: 'Downloading',
        from: [
          ['docs/audio.md', 'Audio Ripping \u203A Audio Ripping Sites'],
          ['docs/audio.md', 'Audio Ripping \u203A Audio Ripping Tools']
        ],
        names: ['lucida', 'Nicotine+']
      },
      {
        label: 'Android',
        from: [
          ['docs/mobile.md', 'Android Audio'],
          ['docs/mobile.md', 'Android Audio \u203A YouTube Music']
        ],
        names: [
          {
            name: 'Morphe',
            note: 'YTM Patch',
            with: ['Easy Install / Updates']
          },
          'ArchiveTune',
          'Mornye'
        ]
      },
      {
        label: 'iOS',
        from: [['docs/mobile.md', 'iOS Audio']],
        names: [
          { name: '8SPINE', with: ['Modules'] },
          'EeveeSpotifyReincarnated'
        ]
      },
      {
        label: 'Tracking',
        from: [['docs/audio.md', 'Tracking / Databases']],
        names: ['RateYourMusic', 'Last.fm']
      },
      {
        label: 'Discovery',
        from: [
          ['docs/audio.md', 'Tracking / Databases \u203A Music Discovery'],
          [
            'docs/audio.md',
            'Tracking / Databases \u203A Curated Recommendations'
          ]
        ],
        names: ['RateYourMusic Charts', 'AnyDecentMusic', 'NTS Radio']
      }
    ]
  },
  {
    id: 'gaming',
    bullets: [
      {
        label: 'Download / Torrent',
        from: [
          ['docs/gaming.md', 'Download Games'],
          ['docs/gaming.md', 'Download Games \u203A Game Repacks']
        ],
        names: [
          'HizSearch',
          'Virgil Game Search',
          'AnkerGames',
          'SteamRIP',
          'FitGirl Repacks'
        ]
      },
      {
        label: 'Emulation / ROMs',
        from: [
          ['docs/gaming.md', 'Emulation / ROMs \u203A Emulators'],
          ['docs/gaming.md', 'Emulation / ROMs \u203A ROM Sites']
        ],
        names: ['Emulation Wiki', 'Axekin', 'r/ROMs Mega']
      },
      {
        label: 'Tracking',
        from: [['docs/gaming-tools.md', 'Tracking / Databases']],
        count: 2
      },
      {
        label: 'Discovery',
        from: [
          [
            'docs/gaming-tools.md',
            'Tracking / Databases \u203A Curated Recommendations'
          ]
        ],
        names: ['AcclaimedVideoGames', 'SteamDB Ratings']
      }
    ]
  },
  {
    id: 'reading',
    bullets: [
      {
        label: 'Downloading',
        from: [['docs/reading.md', 'Ebooks']],
        count: 2
      },
      {
        label: 'Audiobooks',
        from: [['docs/reading.md', 'Audiobooks \u203A Downloading']],
        count: 2,
        warnLabels: { 'Warning / Link Fix': 'Warning' }
      },
      {
        label: 'Ebook Readers',
        from: [
          ['docs/reading.md', 'Ebooks \u203A Ebook Readers'],
          ['docs/reading.md', 'Ebooks \u203A Browser Ebook Readers']
        ],
        names: [{ name: 'Readest', in: 0 }, 'Koodo', 'Google Play Books']
      },
      {
        label: 'Manga',
        from: [['docs/reading.md', 'Visual Media \u203A Manga']],
        names: ['Weeb Central', 'Kagane', 'MangaDot']
      },
      {
        label: 'Comics',
        from: [['docs/reading.md', 'Visual Media \u203A Comics']],
        count: 2
      },
      {
        label: 'Android Readers',
        from: [['docs/mobile.md', 'Android Reading']],
        withJoiner: ' + ',
        names: ['Librera', { name: 'Moon+ Reader', with: ['Theme Guide'] }]
      },
      {
        label: 'Tracking',
        from: [
          ['docs/reading.md', 'Book Tracking / Databases'],
          [
            'docs/reading.md',
            'Book Tracking / Databases \u203A Comic Tracking / Databases'
          ],
          [
            'docs/reading.md',
            'Book Tracking / Databases \u203A Manga Tracking / Databases'
          ]
        ],
        names: [
          'StoryGraph',
          { name: 'Hardcover', note: 'Books' },
          { name: 'MAL', note: 'Manga' },
          { name: 'LeagueOfComicGeeks', note: 'Comics' }
        ]
      },
      {
        label: 'Discovery',
        from: [
          [
            'docs/reading.md',
            'Curated Recommendations \u203A Book Recommendations'
          ],
          [
            'docs/reading.md',
            'Curated Recommendations \u203A Comic Recommendations'
          ],
          [
            'docs/reading.md',
            'Curated Recommendations \u203A Manga Recommendations'
          ]
        ],
        names: [
          'Five Books',
          { name: 'The Greatest Books', note: 'Books' },
          { name: 'MangaBaka', note: 'Manga' },
          { name: 'ComicBookCanon', note: 'Comics' }
        ]
      }
    ]
  },
  {
    id: 'software-sites',
    bullets: [
      {
        label: 'Software Sites',
        from: [['docs/downloading.md', 'Software Sites']],
        names: [
          'Virgil Software Search',
          { name: 'CracksURL', with: ['Download Guide'] },
          'LRepacks'
        ]
      }
    ]
  },
  {
    id: 'android',
    bullets: [
      {
        from: [['docs/mobile.md', 'Android APKs \u203A Modded APKs']],
        names: [{ name: 'Mobilism', note: 'Modded APKs' }]
      },
      {
        from: [['docs/mobile.md', 'Android APKs \u203A Untouched APKs']],
        names: [{ name: 'APKMirror', note: 'Untouched APKs' }]
      },
      {
        from: [['docs/mobile.md', 'Android APKs \u203A FOSS APKs']],
        names: [
          { name: 'Droid-ify', note: 'FOSS Android Apps', with: ['GitHub'] }
        ]
      },
      {
        from: [['docs/mobile.md', 'Android APKs \u203A APK Tools']],
        names: [{ name: 'Obtainium', note: 'Get Android App Updates' }]
      }
    ]
  },
  {
    id: 'ios',
    bullets: [
      {
        from: [['docs/mobile.md', 'iOS Tools \u203A iOS Sideloading']],
        names: [
          {
            name: 'TrollStore',
            note: 'Unlimited App Sideloading [iOS 14.0 - 16.6.1, 16.7 RC, 17.0]',
            verify: '14.0 - 16.6.1, 16.7 RC, 17.0'
          },
          {
            name: 'SideStore',
            note: 'Non-Jailbreak Sideloading App [iOS 14.0 & Above]',
            verify: 'iOS 14.0 & Above'
          },
          {
            name: 'Sideloadly',
            note: 'Non-Jailbreak Sideload Apps [iOS 7.0 & Above]',
            verify: 'iOS 7.0 & Above'
          },
          {
            name: 'Impactor',
            note: 'Non-Jailbreak Sideloading [iOS 9.0 & Above]',
            verify: 'iOS 9.0 & Above'
          }
        ]
      }
    ]
  }
]

// ---------------------------------------------------------------------------
// Marker handling
// ---------------------------------------------------------------------------

const START_RE = /^\s*<!--\s*sync:start\s+([\w-]+)\s*-->\s*$/
const END_RE = /^\s*<!--\s*sync:end\s+([\w-]+)\s*-->\s*$/

function findSyncBlocks(lines) {
  const blocks = []
  let open = null
  for (let index = 0; index < lines.length; index++) {
    const start = lines[index].match(START_RE)
    const end = lines[index].match(END_RE)
    if (start) {
      if (open) {
        throw new Error(
          `sync:start "${start[1]}" found before "${open.id}" was closed`
        )
      }
      open = { id: start[1], start: index }
    } else if (end) {
      if (!open) {
        throw new Error(`sync:end "${end[1]}" without a matching sync:start`)
      }
      if (end[1] !== open.id) {
        throw new Error(
          `sync:end "${end[1]}" does not match sync:start "${open.id}"`
        )
      }
      blocks.push({ id: open.id, start: open.start, end: index })
      open = null
    }
  }
  if (open) throw new Error(`sync:start "${open.id}" is never closed`)
  return blocks
}

/**
 * Returns the synced guide content for `original` without writing it.
 * Throws when markers are missing, duplicated, unmapped, or when any
 * mapped source pick can no longer be resolved.
 */
export function syncContent(original) {
  const eol = original.includes('\r\n') ? '\r\n' : '\n'
  const lines = original.split(/\r?\n/)
  const blocks = findSyncBlocks(lines)

  for (const mapping of MAPPING) {
    if (!blocks.some((block) => block.id === mapping.id)) {
      throw new Error(
        `Missing sync markers for block "${mapping.id}" in docs/beginners-guide.md`
      )
    }
  }
  for (const block of blocks) {
    if (!MAPPING.some((mapping) => mapping.id === block.id)) {
      throw new Error(`No mapping entry for sync block "${block.id}"`)
    }
  }

  const output = lines.slice()
  let changed = false
  // Back to front so splicing cannot shift the indices of later blocks.
  for (const block of [...blocks].reverse()) {
    const mapping = MAPPING.find((m) => m.id === block.id)
    const rendered = mapping.bullets.flatMap((bullet) =>
      renderBullet(bullet, `${block.id} \u00B7 ${bullet.label ?? 'unlabeled'}`)
    )
    const current = lines.slice(block.start + 1, block.end)
    if (current.join('\n') !== rendered.join('\n')) changed = true
    output.splice(block.start + 1, block.end - block.start - 1, ...rendered)
  }

  return { content: output.join(eol), changed }
}

/**
 * Debug/introspection helper: for every source file referenced by the
 * mapping, lists each section path and the link labels of its entries.
 */
export function describeSources() {
  const files = [
    ...new Set(
      MAPPING.flatMap((block) =>
        block.bullets.flatMap((b) => b.from.map(([file]) => file))
      )
    )
  ]
  return files.map((file) => ({
    file,
    sections: getSections(file).map((section) => ({
      path: sectionPath(section),
      entries: section.entries.map((entry) =>
        entry.links.map((link) => cleanLabel(link.label))
      )
    }))
  }))
}

/**
 * Validates the whole mapping against the current wiki sources: every
 * heading resolves, every pinned name resolves unambiguously, every
 * carried link exists, and every verify substring still matches. Also
 * checks the guide actually contains a marker pair per mapping id.
 * Throws on the first problem found.
 */
export function validateMapping() {
  let bullets = 0
  let picks = 0
  for (const mapping of MAPPING) {
    for (const bullet of mapping.bullets) {
      bullets++
      const context = `${mapping.id} \u00B7 ${bullet.label ?? 'unlabeled'}`
      picks += resolvePicks(bullet, context).length
    }
  }
  const lines = fs.readFileSync(GUIDE_PATH, 'utf8').split(/\r?\n/)
  const blocks = findSyncBlocks(lines)
  for (const mapping of MAPPING) {
    if (!blocks.some((block) => block.id === mapping.id)) {
      throw new Error(
        `Missing sync markers for block "${mapping.id}" in docs/beginners-guide.md`
      )
    }
  }
  return { blocks: MAPPING.length, bullets, picks }
}

function main() {
  const check = process.argv.includes('--check')
  const original = fs.readFileSync(GUIDE_PATH, 'utf8')
  let result
  try {
    result = syncContent(original)
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exitCode = 1
    return
  }
  if (!result.changed) {
    console.log('docs/beginners-guide.md is already in sync.')
    return
  }
  if (check) {
    console.error(
      'docs/beginners-guide.md is out of sync. Run `pnpm sync:bg` to update it.'
    )
    process.exitCode = 1
    return
  }
  fs.writeFileSync(GUIDE_PATH, result.content)
  console.log('Updated docs/beginners-guide.md.')
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
