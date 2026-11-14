import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ICON_LINKS, REDDIT_WIKI_PATHS } from '../docs/.vitepress/shared.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs')

function getMarkdownFiles(target) {
  let stat
  try {
    stat = fs.statSync(target)
  } catch {
    return []
  }

  if (stat.isFile()) return target.endsWith('.md') ? [target] : []
  if (!stat.isDirectory()) return []

  return fs
    .readdirSync(target, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => getMarkdownFiles(path.join(target, entry.name)))
}

const args = process.argv.slice(2)
const files =
  args.length > 0
    ? args.flatMap((target) => getMarkdownFiles(path.resolve(target)))
    : [
        ...getMarkdownFiles(DOCS_DIR),
        path.join(PROJECT_ROOT, '.github/CONTRIBUTING.md')
      ]
let hasErrors = false

let totalErrors = 0
const filesWithErrors = new Set()

// Only emit ANSI colors when writing to an interactive terminal
const useColor =
  !process.env.NO_COLOR &&
  (Boolean(process.env.FORCE_COLOR) || Boolean(process.stdout.isTTY))
const color = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text)
const INVISIBLE_CHARACTERS = /[\u200B-\u200D\uFEFF\u2060]/g
const ENCODED_INVISIBLE_CHARACTERS = /%E2%81%A0|%E2%80%8[B-D]|%EF%BB%BF/i
const LABEL_REDIRECT_EXCEPTIONS = {
  discord: new Set(['https://trw.lat/ds'])
}
const ICON_LABELS = new Map(
  ICON_LINKS.map((icon) => [icon.label.toLowerCase(), icon.label])
)
const LABEL_DOMAIN_CHECKS = new Map([
  ['subreddit', { domains: ['reddit.com'] }],
  ['github', { domains: ['github.com', 'github.io'] }],
  [
    'discord',
    {
      domains: [
        'discord.com',
        'discord.gg',
        'discordapp.com',
        'discord.me',
        'discord.li',
        'dsc.gg',
        'railgun.works'
      ]
    }
  ],
  [
    'telegram',
    { domains: ['t.me', 'telegram.me', 'telegram.org', 'telegram.dog'] }
  ],
  ['twitter', { domains: ['twitter.com', 'x.com', 't.co'] }],
  ['youtube', { domains: ['youtube.com', 'youtu.be'] }],
  [
    'lemmy',
    { domains: ['lemmy.', 'fediverse.', 'sh.itjust.works', 'join-lemmy.org'] }
  ],
  ['instagram', { domains: ['instagram.com'] }],
  ['facebook', { domains: ['facebook.com'] }],
  ['bluesky', { domains: ['bsky.app'] }],
  [
    'mastodon',
    { domains: ['mastodon.social', 'joinmastodon.org', 'apps.apple.com'] }
  ],
  [
    'x',
    { domainLabel: 'X/Twitter', domains: ['twitter.com', 'x.com', 't.co'] }
  ],
  ['.onion', { match: (hostname) => hostname.endsWith('.onion') }]
])
const FMHY_WIKI_PAGES = new Set(
  Object.values(REDDIT_WIKI_PATHS).map((p) => p.slice(1))
)
const COMMON_TYPOS = new Map([
  ['teh', 'the'],
  ['adn', 'and'],
  ['thier', 'their'],
  ['dont', "don't"],
  ['cant', "can't"],
  ['wont', "won't"],
  ['doesnt', "doesn't"],
  ['didnt', "didn't"],
  ['isnt', "isn't"],
  ['arent', "aren't"],
  ['wasnt', "wasn't"],
  ['werent', "weren't"],
  ['hasnt', "hasn't"],
  ['havent', "haven't"],
  ['wouldnt', "wouldn't"],
  ['couldnt', "couldn't"],
  ['shouldnt', "shouldn't"],
  ['youre', "you're"],
  ['theyre', "they're"],
  ['occured', 'occurred'],
  ['seperate', 'separate'],
  ['seperately', 'separately'],
  ['independant', 'independent'],
  ['reccomend', 'recommend'],
  ['recieve', 'receive'],
  ['adress', 'address'],
  ['neccessary', 'necessary'],
  ['tring', 'trying'],
  ['availalbe', 'available'],
  ['availabe', 'available'],
  ['definately', 'definitely'],
  ['maintainance', 'maintenance'],
  ['accomodate', 'accommodate'],
  ['begining', 'beginning'],
  ['enviroment', 'environment'],
  ['goverment', 'government'],
  ['relevent', 'relevant'],
  ['sucessful', 'successful'],
  ['untill', 'until'],
  ['wierd', 'weird'],
  ['whereever', 'wherever'],
  ['similiar', 'similar'],
  ['grammer', 'grammar'],
  ['langauge', 'language'],
  ['compatability', 'compatibility'],
  ['offical', 'official'],
  ['unoffical', 'unofficial'],
  ['extention', 'extension'],
  ['occuring', 'occurring'],
  ['visulization', 'visualization'],
  ['debain', 'debian']
])
const COMMON_TYPOS_REGEX = new RegExp(
  `\\b(${[...COMMON_TYPOS.keys()].join('|')})\\b`,
  'gi'
)
const FILES_TO_IGNORE_LINK_SEPARATOR_CHECK = [
  'docs/beginners-guide.md',
  'docs/unsafe.md'
]
const ALLOWED_LINK_CHARS = new Set([
  ...'/-,(&>:|*!.?;_+#►▷',
  '⭐',
  '🌐',
  '🌟',
  '↪️'
])
const ALLOWED_LINK_WORDS_REGEX = new RegExp(
  `(?:^|[^a-zA-Z0-9])(?:${'or and a an the use using via with in on at by to for from check see try requires including includes that this here your our of about their join getting most like every being mostly highly up we optionally these linux mac macos windows android ios web desktop mobile firefox chrome'.split(' ').join('|')})$`,
  'i'
)
const ALLOWED_REPEATED_WORDS = new Set('puyo duran agar hocus'.split(' '))
const REQUIRES_AN = new Set('hour honor honest heir nginx'.split(' '))
const REQUIRES_A = new Set(
  'one once use user useful utility universe university unicorn union unit united uniform unique euro european euphemism luks ui ux url usb userscript userscripts unix'.split(
    ' '
  )
)
const VOWEL_SOUNDING_LETTERS = new Set('AEFHILMNORSX')
const ARTICLE_REGEX = /\b(a|an)\s+([a-z0-9]+)\b/gi

function stripInvisibleCharacters(text) {
  return text.replace(INVISIBLE_CHARACTERS, '')
}

function maskInlineCode(text, fillChar = ' ') {
  if (!text.includes('`')) return text
  let out = ''
  let i = 0
  while (i < text.length) {
    if (text[i] !== '`') {
      out += text[i++]
      continue
    }
    let ticks = 0
    while (i + ticks < text.length && text[i + ticks] === '`') ticks++
    let close = i + ticks
    let matched = false
    while (close < text.length) {
      if (text[close] === '`') {
        let closeTicks = 0
        while (
          close + closeTicks < text.length &&
          text[close + closeTicks] === '`'
        ) {
          closeTicks++
        }
        if (closeTicks === ticks) {
          const spanEnd = close + closeTicks
          out += fillChar.repeat(spanEnd - i)
          i = spanEnd
          matched = true
          break
        }
        close += closeTicks
      } else {
        close++
      }
    }
    if (!matched) {
      out += text.slice(i, i + ticks)
      i += ticks
    }
  }
  return out
}

function getSkippedLineIndices(lines) {
  const skipped = new Set()
  let inFrontmatter = false
  let activeFence = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (i === 0 && line.trim() === '---') {
      inFrontmatter = true
      skipped.add(i)
      continue
    }
    if (inFrontmatter) {
      skipped.add(i)
      if (line.trim() === '---') inFrontmatter = false
      continue
    }

    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})(.*)$/)
    if (fenceMatch) {
      const markerCharacter = fenceMatch[1][0]
      const markerLength = fenceMatch[1].length
      const infoRest = fenceMatch[2]
      if (!activeFence) {
        if (markerCharacter !== '`' || !infoRest.includes('`')) {
          activeFence = { char: markerCharacter, len: markerLength }
          skipped.add(i)
          continue
        }
      } else if (
        activeFence.char === markerCharacter &&
        markerLength >= activeFence.len &&
        infoRest.trim() === ''
      ) {
        activeFence = null
        skipped.add(i)
        continue
      }
    }
    if (activeFence) skipped.add(i)
  }

  return skipped
}

function normalizeText(text) {
  return stripInvisibleCharacters(text).trim().toLowerCase()
}

function normalizePrimaryUrl(rawUrl) {
  try {
    const url = new URL(rawUrl)
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key)) url.searchParams.delete(key)
    }
    url.searchParams.sort()
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString()
  } catch {
    return rawUrl
  }
}

function localTargetExists(sourceFile, rawTarget) {
  let target = rawTarget.trim().replace(/^<|>$/g, '')
  if (
    !target ||
    target.startsWith('#') ||
    target.startsWith('//') ||
    /^[a-z][a-z\d+.-]*:/i.test(target) ||
    /[{}:]/.test(target)
  ) {
    return true
  }

  target = target.split('#', 1)[0].split('?', 1)[0]
  try {
    target = decodeURIComponent(target)
  } catch {
    return true
  }

  const isRootRelative = target.startsWith('/')
  const basePath = isRootRelative
    ? path.join(DOCS_DIR, target.replace(/^\/+/, ''))
    : path.resolve(path.dirname(sourceFile), target)
  const candidates = [basePath]
  const extension = path.extname(basePath)

  if (!extension) {
    candidates.push(`${basePath}.md`, path.join(basePath, 'index.md'))
  } else if (extension === '.html') {
    candidates.push(basePath.slice(0, -5) + '.md')
  }

  if (isRootRelative) {
    candidates.push(path.join(DOCS_DIR, 'public', target.replace(/^\/+/, '')))
  }

  return candidates.some((candidate) => fs.existsSync(candidate))
}

const isUnicodeSupported = Boolean(
  process.env.CI ||
  process.env.WT_SESSION ||
  process.env.VSCODE_INJECTION ||
  process.env.TERM_PROGRAM ||
  (process.env.TERM && process.env.TERM !== 'dumb')
)

const icon = isUnicodeSupported ? '🔍' : '[INFO] >>>'
console.log(
  `${color('1;33', icon)} ${color('1;37', 'Scanning markdown files for formatting issues...\n')}`
)

files.forEach((file) => {
  // Skip anything that isn't a readable regular file
  let stat
  try {
    stat = fs.statSync(file)
  } catch {
    return
  }
  if (!stat.isFile()) return

  const content = fs.readFileSync(file, 'utf-8')
  const lines = content.split(/\r?\n/)
  const skippedLines = getSkippedLineIndices(lines)
  const relativePath = path.relative(PROJECT_ROOT, file)
  const normalizedPath = relativePath.replace(/\\/g, '/')

  // Files to completely ignore from all checks
  const FILES_TO_IGNORE = [
    'docs/feedback.md',
    'docs/index.md',
    'docs/recently-removed.md',
    'docs/posts.md',
    'docs/sandbox.md',
    'docs/startpage.md'
  ]

  // Folders to completely ignore from all checks (any depth beneath them)
  const FOLDERS_TO_IGNORE = [
    'docs/.vitepress/dist/',
    'docs/posts/',
    'docs/other/',
    'docs/public/'
  ]

  if (FILES_TO_IGNORE.includes(normalizedPath)) return
  if (FOLDERS_TO_IGNORE.some((folder) => normalizedPath.includes(folder)))
    return

  // Files to ignore for english-specific checks (Typos, A/An, Repeated Words)
  const FILES_TO_IGNORE_ENGLISH_CHECKS = ['docs/non-english.md']
  const isSeparatedEnglishCheck =
    FILES_TO_IGNORE_ENGLISH_CHECKS.includes(normalizedPath)

  let currentHeader = ''
  const headingStack = []
  const seenHeadings = new Map()
  const primaryUrlsBySection = new Map()
  const sectionUrlLines = new Map()
  const hierarchyCache = new Map()

  lines.forEach((line, index) => {
    const lineNum = index + 1
    if (skippedLines.has(index)) return

    const rawLine = line
    // Strip zero-width and invisible joiner characters to avoid false positives in spacing checks
    line = stripInvisibleCharacters(line)

    let errors = []
    // Record an error, optionally with the offending substring of `line` so the
    // reporter can underline exactly where the problem is.
    const addError = (message, match, index = -1) =>
      errors.push({ message, match, index })

    const rawLineNoCode = maskInlineCode(rawLine)
    for (const m of rawLineNoCode.matchAll(/\]\(([^)\r\n]+)\)/g)) {
      const rawTarget = m[1]
      const cleanTarget = stripInvisibleCharacters(rawTarget)
      const targetIndex = stripInvisibleCharacters(
        rawLine.slice(0, m.index + 2)
      ).length
      if (rawTarget !== cleanTarget) {
        addError(
          'Invisible character inside link destination',
          cleanTarget || null,
          cleanTarget ? targetIndex : -1
        )
      }
      const encodedMatch = cleanTarget.match(ENCODED_INVISIBLE_CHARACTERS)
      if (encodedMatch) {
        addError(
          `Percent-encoded invisible character (${encodedMatch[0]}) inside link destination`,
          encodedMatch[0],
          targetIndex + encodedMatch.index
        )
      }
    }

    const isCatalogEntry =
      /^\s*[*+-]\s+(?:(?:⭐|🌐|↪\uFE0F?|🌟)\s+)?(?:\*\*)?\[[^\]]+\]\(/u.test(
        line
      )

    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const title = headingMatch[2].trim()
      const normalizedTitle = normalizeText(
        title.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '')
      )
      const parentPath = headingStack.slice(1, level).join(' > ')
      const headingKey = `${parentPath}\u0000${level}\u0000${normalizedTitle}`
      const firstLine = seenHeadings.get(headingKey)
      if (firstLine) {
        addError(
          `Duplicate heading in the same parent section (first seen on line ${firstLine})`,
          headingMatch[2]
        )
      } else {
        seenHeadings.set(headingKey, lineNum)
      }
      headingStack[level] = normalizedTitle
      headingStack.length = level + 1
      currentHeader = line
    }

    const lineNoCode = maskInlineCode(line)

    const emptyLinkMatch = lineNoCode.match(/\[[^\]]*\]\(\s*\)/)
    if (emptyLinkMatch) {
      addError('Empty link destination', emptyLinkMatch[0])
    }

    for (const m of lineNoCode.matchAll(/\[([^\]]+)\]\(/g)) {
      const label = m[1]
      if (/^\s|\s$/.test(label)) {
        addError(
          `Broken link syntax (leading or trailing space inside []): "${label}"`,
          `[${label}]`,
          m.index
        )
      }
    }

    for (const m of lineNoCode.matchAll(/\[[^\]]+\]\s*(https?:\/\/[^\s)]+)/g)) {
      addError(
        'Broken link syntax (missing parentheses around URL)',
        m[0],
        m.index
      )
    }

    for (const m of lineNoCode.matchAll(/\[(https?:\/\/[^\]\s]+)\](?!\()/g)) {
      addError(
        'Broken link syntax (bare URL in brackets without link destination)',
        m[0],
        m.index
      )
    }

    for (const m of lineNoCode.matchAll(
      /\]\((https?:\/\/[^)\s]*,)\)|<(https?:\/\/[^>\s]*,)>/g
    )) {
      const url = m[1] || m[2]
      addError(
        'Broken link syntax (trailing comma inside URL)',
        url,
        m.index + (m[1] ? 2 : 1)
      )
    }

    const localLinkRegex = /!?\[[^\]]*\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g
    let localLinkMatch
    while ((localLinkMatch = localLinkRegex.exec(lineNoCode)) !== null) {
      const target = localLinkMatch[1]
      if (!localTargetExists(file, target)) {
        addError(`Local link or asset target does not exist: ${target}`, target)
      }
    }

    // ---------------------------------------------------------------------
    // Check 1: Starred, Superstar, Index, and Redirect links must be bolded
    // ---------------------------------------------------------------------

    // Pattern: * ⭐ **[Link]... or * 🌐 **[Link]...
    // Uses the 'u' flag so surrogate pairs (🌟, 🌐) and variation selectors (\uFE0F) are processed as single characters
    const featuredMatch = line.match(/^\s*[*+-]\s+([⭐🌟🌐]|↪\uFE0F?)(.*)/u)
    if (featuredMatch) {
      const fullEmoji = featuredMatch[1]
      const restOfLine = featuredMatch[2]

      // Check if the content immediately following the emoji (ignoring whitespace) starts with '**'
      if (!/^\s*\*\*/.test(restOfLine)) {
        let iconName = 'Featured'
        if (fullEmoji.includes('⭐')) iconName = 'Starred'
        else if (fullEmoji.includes('🌟')) iconName = 'Superstar'
        else if (fullEmoji.includes('🌐')) iconName = 'Index'
        else if (fullEmoji.includes('↪')) iconName = 'Redirect'

        const matchIdx = line.indexOf(fullEmoji)
        addError(
          `${iconName} link not bolded (expected: ${fullEmoji} **[Link](URL)**)`,
          fullEmoji,
          matchIdx !== -1 ? matchIdx : 0
        )
      }

      if (fullEmoji.includes('↪')) {
        for (const m of lineNoCode.matchAll(
          /\]\((https?:\/\/(?:www\.)?fmhy\.net\/([a-z0-9-]+)[^)\s]*)\)/gi
        )) {
          if (FMHY_WIKI_PAGES.has(m[2].toLowerCase())) {
            addError(
              'Redirect entry (↪️) should use the Reddit wiki link instead of fmhy.net',
              m[1],
              m.index + 2
            )
          }
        }
      }
    }

    // ---------------------------------------------------------------------
    // Check 2: Space between ] (
    // ---------------------------------------------------------------------

    const bracketParenMatch = lineNoCode.matchAll(
      /\]\s+\((?:https?:\/\/|\/|\.\.?\/|#)/g
    )
    for (const m of bracketParenMatch) {
      addError('Space between bracket and parenthesis in link', m[0], m.index)
    }

    // ---------------------------------------------------------------------
    // Check 3: Missing closing bracket ]
    // ---------------------------------------------------------------------

    // Pattern: [Text(http... or [Text(/path...
    // We look for [ followed by (url/path without ] in between.
    const missingBracketMatch = lineNoCode.matchAll(
      /\[[^\]]*\((?:https?:\/\/|\/|\.\.?\/|#)/g
    )
    for (const m of missingBracketMatch) {
      if (!/^\[[^[\]]*\]\(/.test(lineNoCode.slice(m.index))) {
        addError('Possible missing closing bracket "]"', m[0], m.index)
      }
    }

    // ---------------------------------------------------------------------
    // Check 4: Missing closing parenthesis )
    // ---------------------------------------------------------------------

    // Pattern: [Text](http... or [Text](/path... where it ends without )
    const missingParens = lineNoCode.matchAll(
      /\]\(((?:https?:\/\/|\/|\.\.?\/|#)(?:[^()\s]|\([^()\s]*\))*)/g
    )
    for (const m of missingParens) {
      // Check if the link is missing a closing parenthesis on this line
      // by verifying that the text immediately following the URL closes it.
      const remainder = lineNoCode.slice(m.index + m[0].length)
      if (!remainder.startsWith(')')) {
        addError(
          `Possible broken link (missing closing parenthesis or trailing space)`,
          m[1],
          m.index + 2
        )
      }
    }

    // ---------------------------------------------------------------------
    // Check 5: Double parenthesis in link
    // ---------------------------------------------------------------------

    // specific pattern: ](url))
    // This is often valid if inside parenthesis: (See [Link](url))
    // We only flag if parentheses are UNBALANCED in the line.
    const doubleParenMatch = lineNoCode.matchAll(/\]\(([^)]+?)\)\)/g)
    for (const m of doubleParenMatch) {
      const openParens = (lineNoCode.match(/\(/g) || []).length
      const closeParens = (lineNoCode.match(/\)/g) || []).length
      if (closeParens > openParens) {
        addError(
          'Double closing parenthesis in link (Unbalanced)',
          m[0],
          m.index
        )
      }
    }

    // ---------------------------------------------------------------------
    // Check 6: Double spaces & Comma spacing
    // ---------------------------------------------------------------------

    const lineNoCodeOrUrl = maskInlineCode(line, '\u0001')
      .replace(/<!--[\s\S]*?-->/g, (m) => '\u0001'.repeat(m.length))
      .replace(/https?:\/\/[^\s)>]+/g, (m) => '\u0001'.repeat(m.length))

    // We want to avoid double spaces in the text, but ignore leading indentation.
    // We trim start of line to ignore indentation, then check for "  ".
    const leadSpaceLength = line.length - line.trimStart().length
    const doubleSpaceMatch = lineNoCodeOrUrl.trimStart().matchAll(/ {2,}/g)
    for (const m of doubleSpaceMatch) {
      addError('Double space detected', m[0], leadSpaceLength + m.index)
    }

    for (const m of lineNoCodeOrUrl.matchAll(/(?<=\S)[ \t]+,/g)) {
      addError('Space before comma detected', m[0], m.index)
    }

    for (const m of lineNoCodeOrUrl.matchAll(/,{2,}/g)) {
      addError('Repeated comma detected', m[0], m.index)
    }

    // ---------------------------------------------------------------------
    // Check 7: Broken Bold Syntax (Unclosed tags & improper spacing)
    // ---------------------------------------------------------------------

    // 1. Skip thematic break / horizontal rule lines like ***, ---, or * * *
    if (!/^\s*(?:\*|\-|_){3,}\s*$/.test(line)) {
      // 2. Count exact occurrences of double asterisks '**' using `lineNoCode`
      const doubleAsteriskMatches = [...lineNoCode.matchAll(/\*\*/g)]
      if (doubleAsteriskMatches.length % 2 !== 0) {
        const lastMatch =
          doubleAsteriskMatches[doubleAsteriskMatches.length - 1]
        addError(
          'Unclosed or broken bold syntax (mismatched ** tags)',
          '**',
          lastMatch.index
        )
      } else {
        // 4. Pair matched ** delimiters sequentially so literal '*' inside bold text doesn't shift pairs
        for (let bi = 0; bi < doubleAsteriskMatches.length; bi += 2) {
          const openIdx = doubleAsteriskMatches[bi].index
          const closeIdx = doubleAsteriskMatches[bi + 1].index
          const inner = lineNoCode.slice(openIdx + 2, closeIdx)
          if (inner.length > 0 && (/^\s/.test(inner) || /\s$/.test(inner))) {
            addError(
              'Broken bold syntax (leading or trailing space inside **)',
              lineNoCode.slice(openIdx, closeIdx + 2),
              openIdx
            )
          }
        }
      }
    }

    // ---------------------------------------------------------------------
    // Check 8: Asymmetric spaces around slash & Compound words
    // ---------------------------------------------------------------------

    const lineForChecks = maskInlineCode(line)
      .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length))
      .replace(
        /\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g,
        (m, dest) => `](${' '.repeat(dest.length)})`
      )
      .replace(/https?:\/\/[^\s)\]]+/g, (m) => ' '.repeat(m.length))

    if (!/^\s*link:/i.test(line)) {
      const slashes = lineForChecks.matchAll(/\//g)

      for (const match of slashes) {
        const i = match.index

        // Check if there are spaces directly adjacent to the slash
        const spaceBefore = i === 0 || /\s/.test(lineForChecks[i - 1])
        const spaceAfter =
          i === lineForChecks.length - 1 || /\s/.test(lineForChecks[i + 1])

        // Capture the full non-space clusters touching the slash
        const beforeMatch = lineForChecks.slice(0, i).match(/(\S+)$/)
        const wordBeforeFull = beforeMatch ? beforeMatch[1] : ''

        const afterMatch = lineForChecks.slice(i + 1).match(/^(\S+)/)
        const wordAfterFull = afterMatch ? afterMatch[1] : ''

        // --- GLOBAL EXCEPTIONS ---
        if (wordAfterFull.startsWith('>')) continue // Ignore HTML tags />
        if (wordBeforeFull.endsWith('<')) continue // Ignore HTML tags </

        // Ignore leading slashes in relative URLs like [Text](/path) or [Text](./path)
        if (wordBeforeFull.endsWith('(')) continue

        // Ignore relative path links (e.g., ./LICENSE, ../docs)
        if (wordBeforeFull.endsWith('.') || wordAfterFull.startsWith('.'))
          continue
        if (wordBeforeFull.includes('/') || wordAfterFull.includes('/'))
          continue

        // Clean off surrounding punctuation for word/abbr checks
        const pureWordBefore = wordBeforeFull.replace(/^[^\w]+|[^\w]+$/g, '')
        const pureWordAfter = wordAfterFull.replace(/^[^\w]+|[^\w]+$/g, '')

        // Ignore abbreviations, dates, and common shorthand (w/, r/, 10/11, w/o)
        if (/^(w|r|u|c)$/i.test(pureWordBefore)) continue
        if (
          pureWordBefore.toLowerCase() === 'w' &&
          pureWordAfter.toLowerCase() === 'o'
        )
          continue
        if (/^\d+$/.test(pureWordBefore) && /^\d+$/.test(pureWordAfter))
          continue

        // --- BLOCK A: Empty or trailing slash separator ("/ /", "/ ,", or trailing " /") ---
        if (spaceBefore && spaceAfter) {
          const restAfterSlash = line
            .slice(i + 1)
            .replace(/<!--[\s\S]*?-->/g, '')
            .trimStart()
          if (isCatalogEntry && restAfterSlash === '') {
            addError('Trailing slash at end of line', '/', i)
          } else if (
            restAfterSlash.startsWith('/') ||
            /^[,;]/.test(restAfterSlash)
          ) {
            addError('Empty or stray slash separator', '/', i)
          }
        }

        // --- BLOCK B: Missing space after ("Word /Word") ---
        else if (spaceBefore && !spaceAfter) {
          addError(
            `Missing space after slash: "/${wordAfterFull}"`,
            `/${wordAfterFull}`,
            i
          )
        }

        // --- BLOCK B: Missing space before ("Word/ Word") ---
        else if (!spaceBefore && spaceAfter) {
          const startIndex = i - wordBeforeFull.length
          addError(
            `Missing space before slash: "${wordBeforeFull}/"`,
            `${wordBeforeFull}/`,
            startIndex
          )
        }

        // --- BLOCK C: Missing spaces on BOTH sides ("Word/Word") ---
        else if (!spaceBefore && !spaceAfter) {
          // Strictly target layout mistakes touching Markdown structural anchors: )/[ or ]/( or [/path/]
          const isStructuralMarkdownError =
            /\]|\)/.test(wordBeforeFull) || /^\[|^\(/.test(wordAfterFull)

          if (isStructuralMarkdownError) {
            const matchString = `${wordBeforeFull}/${wordAfterFull}`
            const startIndex = i - wordBeforeFull.length
            addError(
              `Missing spaces around slash: "${matchString}"`,
              matchString,
              startIndex
            )
          }
        }
      }
    }

    if (isCatalogEntry) {
      for (const m of lineForChecks.matchAll(
        /(?<=\S)(\s+)(-(?:[A-Za-z]|\d+[A-Za-z]|[^\s-\d>])\S*)/g
      )) {
        addError(
          `Missing space after dash: "${m[2]}"`,
          m[2],
          m.index + m[1].length
        )
      }
    }

    // ---------------------------------------------------------------------
    // Check 9: Duplicate primary resource URLs in the same section
    // ---------------------------------------------------------------------

    if (isCatalogEntry) {
      const primaryLinkMatch = line.match(
        /^\s*[*+-]\s+(?:(?:⭐|🌐|↪\uFE0F?|🌟)\s+)?(?:\*\*)?\[([^\]]+)\]\((https?:\/\/(?:[^()\s]|\([^()\s]*\))+)\)/u
      )

      if (primaryLinkMatch) {
        const primaryUrl = primaryLinkMatch[2]
        const normalizedName = normalizeText(primaryLinkMatch[1])
        const normalizedUrl = normalizePrimaryUrl(primaryUrl)
        const sectionPath = headingStack.filter(Boolean).join(' > ')
        const duplicateKey = `${sectionPath}\u0000${normalizedName}\u0000${normalizedUrl}`
        const firstLine = primaryUrlsBySection.get(duplicateKey)
        const urlStartIndex = line.indexOf(primaryUrl, primaryLinkMatch.index)
        const reportIndex =
          urlStartIndex !== -1 ? urlStartIndex : primaryLinkMatch.index

        if (firstLine) {
          addError(
            `Duplicate primary resource URL in the same section (first seen on line ${firstLine})`,
            primaryUrl,
            reportIndex
          )
        } else {
          primaryUrlsBySection.set(duplicateKey, lineNum)
          const isExemptSharedUrl =
            /^\s*[*+-]\s+🌐/u.test(line) ||
            /^https?:\/\/(?:www\.)?fmhy\.net(?:\/|$)/i.test(normalizedUrl) ||
            /reddit\.com\/r\/freemediaheckyeah\/wiki\//i.test(normalizedUrl) ||
            normalizedUrl === 'https://github.com/crimera/piko'
          if (!isExemptSharedUrl) {
            const urlOnlyKey = `${sectionPath}\u0000${normalizedUrl}`
            const urlFirstLine = sectionUrlLines.get(urlOnlyKey)
            if (urlFirstLine) {
              addError(
                `Duplicate primary resource URL in the same section under different name (first seen on line ${urlFirstLine})`,
                primaryUrl,
                reportIndex
              )
            } else {
              sectionUrlLines.set(urlOnlyKey, lineNum)
            }
          }
        }
      }
    }

    // ---------------------------------------------------------------------
    // Check 10: Adjacent links without separator
    // ---------------------------------------------------------------------

    const isIgnoredFile = FILES_TO_IGNORE_LINK_SEPARATOR_CHECK.some(
      (ignoredFile) =>
        path.normalize(file).endsWith(path.normalize(ignoredFile))
    )

    if (isCatalogEntry && !isIgnoredFile) {
      const linkRegex = /\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g
      let match

      while ((match = linkRegex.exec(lineNoCode)) !== null) {
        const index = match.index
        if (index === 0) continue

        const preceding = lineNoCode.slice(0, index)

        // Ignore start-of-line markers, star badges, or bold/italic prefixes
        if (/^\s*([*+-]|\d+\.)\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+⭐\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+🌐\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+🌟\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+↪️?\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+[*_]+\s*$/.test(preceding)) continue

        const trimmedPreceding = preceding.trimEnd()
        if (trimmedPreceding.length === 0) continue

        // Check if last character is an allowed separator symbol
        const lastChar = trimmedPreceding.slice(-1)
        if (ALLOWED_LINK_CHARS.has(lastChar)) continue

        // Check if preceding word is an allowed functional word/qualifier
        if (ALLOWED_LINK_WORDS_REGEX.test(trimmedPreceding)) continue

        addError(
          `Missing separator before link (expected "/", "or", ",", etc): "...${preceding.slice(-10)}[${match[1]}]..."`,
          match[0],
          index
        )
      }
    }

    // ---------------------------------------------------------------------
    // Check 11: Duplicate Descriptions within a single entry
    // ---------------------------------------------------------------------

    const normalizedFilePath = path.normalize(file)

    const isTempMailSection =
      normalizedFilePath.endsWith(path.normalize('docs/internet-tools.md')) &&
      currentHeader.includes('Temp Mail')

    const isStaticHostingSection =
      normalizedFilePath.endsWith(path.normalize('docs/developer-tools.md')) &&
      currentHeader.includes('Static Page Hosting')

    const lineForDesc = maskInlineCode(line, '\u0001')

    if (
      lineForDesc.includes('/') &&
      !isTempMailSection &&
      !isStaticHostingSection
    ) {
      // Find where description text starts (after ") - ")
      const dashMatch = lineForDesc.match(/\)\s*-\s+/)

      if (dashMatch) {
        const descStartIndex = dashMatch.index + dashMatch[0].length
        const descMasked = lineForDesc.slice(descStartIndex)
        const sepMatches = [...descMasked.matchAll(/\s+\/\s+/g)]

        if (sepMatches.length >= 1) {
          const seenDescriptions = new Map()
          let partStart = 0

          for (let k = 0; k <= sepMatches.length; k++) {
            const partEnd =
              k < sepMatches.length ? sepMatches[k].index : descMasked.length
            const rawPart = line.slice(
              descStartIndex + partStart,
              descStartIndex + partEnd
            )
            const leadingMatch = rawPart.match(/^[\s\-\*⭐]*/)
            const leadingLength = leadingMatch ? leadingMatch[0].length : 0

            const desc = rawPart
              .trim()
              .replace(/^[\s\-\*⭐]+/, '')
              .replace(/[\s\-\*⭐]+$/, '')

            if (desc) {
              const exactDescIndex = descStartIndex + partStart + leadingLength
              const checkDesc = desc.toLowerCase()

              if (seenDescriptions.has(checkDesc)) {
                addError(
                  `Duplicate description detected: "${desc}"`,
                  desc,
                  exactDescIndex
                )
              } else {
                seenDescriptions.set(checkDesc, exactDescIndex)
              }
            }

            if (k < sepMatches.length) {
              partStart = partEnd + sepMatches[k][0].length
            }
          }
        }
      }
    }

    // ---------------------------------------------------------------------
    // Check 12: Link Label Mismatch
    // ---------------------------------------------------------------------

    // Ensures that labels like "Subreddit", "GitHub", "Discord", etc. point to the correct domain
    const linkMatchRegex =
      /\[([^\]]+)\]\((https?:\/\/(?:[^()\s]|\([^()\s]*\))+)\)/g
    let lm

    while ((lm = linkMatchRegex.exec(lineNoCode)) !== null) {
      const matchText = lm[0] // Full text e.g. "[Discord](https://example.com)"
      const labelText = lm[1] // Inside brackets e.g. "Discord"
      const rawUrlText = lm[2] // Inside parens e.g. "https://example.com"
      const matchIndex = lm.index // Exact index where `[` begins on the line

      let parsedUrl
      try {
        parsedUrl = new URL(rawUrlText)
      } catch {
        continue
      }
      const hostname = parsedUrl.hostname.toLowerCase().replace(/\.$/, '')

      const hostnameMatches = (domain) => {
        const normalizedDomain = domain.toLowerCase().replace(/^\./, '')
        if (normalizedDomain.endsWith('.')) {
          return hostname.startsWith(normalizedDomain)
        }
        return (
          hostname === normalizedDomain ||
          hostname.endsWith(`.${normalizedDomain}`)
        )
      }

      const isFmhyInternalReference =
        hostnameMatches('fmhy.net') ||
        (hostnameMatches('reddit.com') &&
          parsedUrl.pathname
            .toLowerCase()
            .includes('/r/freemediaheckyeah/wiki/')) ||
        (hostnameMatches('github.com') &&
          parsedUrl.pathname.toLowerCase().startsWith('/fmhy/fmhy/wiki/'))

      const isKnownLabelRedirect = (label) => {
        if (
          typeof LABEL_REDIRECT_EXCEPTIONS !== 'undefined' &&
          LABEL_REDIRECT_EXCEPTIONS[label]?.has(parsedUrl.href)
        ) {
          return true
        }
        if (label !== 'discord') return false
        return (
          hostname.startsWith('discord.') ||
          /(^|\/)discord(?:\/|$)/i.test(parsedUrl.pathname)
        )
      }

      const trimmedLabel = normalizeText(labelText)

      // Exact match check for keywords to avoid flagging descriptive names like "GitHub Dorks"
      const domainCheck = LABEL_DOMAIN_CHECKS.get(trimmedLabel)
      if (
        domainCheck &&
        !isFmhyInternalReference &&
        !isKnownLabelRedirect(trimmedLabel)
      ) {
        const domainMatches = domainCheck.match
          ? domainCheck.match(hostname)
          : domainCheck.domains.some(hostnameMatches)
        if (!domainMatches) {
          addError(
            `Link label mismatch: Label "${labelText}" points to non-${domainCheck.domainLabel ?? trimmedLabel} domain (${rawUrlText})`,
            matchText,
            matchIndex
          )
        }
      }

      // Special check for "r/" prefix (e.g. [r/OpenAI]) - ONLY if it's the full label
      if (/^r\/[a-zA-Z0-9_]+$/.test(trimmedLabel)) {
        if (!isFmhyInternalReference && !hostnameMatches('reddit.com')) {
          addError(
            `Link label mismatch: Subreddit label "${labelText}" points to non-reddit domain (${rawUrlText})`,
            matchText,
            matchIndex
          )
        }
      }

      // Case-exact check for VitePress icon link labels (whitespace edges handled separately)
      const expectedIconLabel = ICON_LABELS.get(trimmedLabel)
      if (expectedIconLabel && labelText.trim() !== expectedIconLabel) {
        const isSecondaryIconLink = /\/\s*\*{0,2}\s*$/.test(
          line.slice(0, matchIndex)
        )
        // Primary entries like "* ⭐ **[Bluesky](https://bsky.app/)**" intentionally use "Bluesky"
        if (trimmedLabel !== 'bluesky' || isSecondaryIconLink) {
          addError(
            `Icon link label casing mismatch: "${labelText}" (expected "${expectedIconLabel}")`,
            labelText,
            matchIndex + 1
          )
        }
      }
    }

    // ---------------------------------------------------------------------
    // Checks 13, 14, 15: English-specific linting (Repeated words, Typos, Article usage)
    // ---------------------------------------------------------------------

    if (!isSeparatedEnglishCheck) {
      // Mask inline code, URLs, and links with a non-whitespace sentinel so
      // word/article checks keep 1:1 indices without bridging across stripped spans.
      const lineNoCodeAndUrl = maskInlineCode(line, '\u0001').replace(
        /https?:\/\/[^\s)]+/g,
        (m) => '\u0001'.repeat(m.length)
      )
      const lineCleaned = lineNoCodeAndUrl.replace(
        /\[[^\]]+\]\([^)]*\)/g,
        (m) => '\u0001'.repeat(m.length)
      )

      // ---------------------------------------------------------------------
      // Check 13: Repeated Words (e.g., "the the", "and and")
      // ---------------------------------------------------------------------

      // Find adjacent identical words separated by whitespace
      const repeatedWordMatches = lineCleaned.matchAll(/\b([a-zA-Z]+)\s+\1\b/gi)
      for (const m of repeatedWordMatches) {
        const word = m[1].toLowerCase()
        if (!ALLOWED_REPEATED_WORDS.has(word)) {
          addError(`Repeated word detected: "${m[1]}"`, m[0], m.index)
        }
      }

      // ---------------------------------------------------------------------
      // Check 14: Common Typos
      // ---------------------------------------------------------------------

      for (const m of lineCleaned.matchAll(COMMON_TYPOS_REGEX)) {
        const correction = COMMON_TYPOS.get(m[0].toLowerCase())
        addError(
          `Possible typo: "${m[0]}" (should be "${correction}")`,
          m[0],
          m.index
        )
      }

      // ---------------------------------------------------------------------
      // Check 15: Basic A/An Grammar
      // ---------------------------------------------------------------------

      // Unwrap [label](url) and emphasis markers 1:1 so linked words (e.g., "a [adblocker](...)")
      // are checked without exposing link labels to Checks 13 & 14.
      const lineForArticleCheck = lineNoCodeAndUrl
        .replace(/!\[[^\]]*\]\([^)]*\)/g, (m) => '\u0001'.repeat(m.length))
        .replace(
          /\[([^\]]+)\]\([^)]*\)/g,
          (m, label) => ' ' + label + ' '.repeat(m.length - label.length - 1)
        )
        .replace(/\*+/g, (m) => ' '.repeat(m.length))

      for (const match of lineForArticleCheck.matchAll(ARTICLE_REGEX)) {
        const articleUsed = match[1].toLowerCase()
        const nextWordRaw = match[2]
        const nextWordLower = nextWordRaw.toLowerCase()

        let shouldBeAn = false

        if (REQUIRES_AN.has(nextWordLower)) {
          shouldBeAn = true
        } else if (REQUIRES_A.has(nextWordLower)) {
          shouldBeAn = false
        } else if (/^[A-Z0-9]*[A-Z][A-Z0-9]*$/.test(nextWordRaw)) {
          shouldBeAn = VOWEL_SOUNDING_LETTERS.has(nextWordRaw[0])
        } else {
          shouldBeAn = /^[aeiou]/i.test(nextWordLower)
        }

        const displayPhrase = match[0].replace(/\s+/g, ' ')
        const matchedSource = line.slice(
          match.index,
          match.index + match[0].length
        )

        if (articleUsed === 'a' && shouldBeAn) {
          addError(
            `Incorrect article "a" usage: "${displayPhrase}" (should be "an")`,
            matchedSource,
            match.index
          )
        } else if (articleUsed === 'an' && !shouldBeAn) {
          addError(
            `Incorrect article "an" usage: "${displayPhrase}" (should be "a")`,
            matchedSource,
            match.index
          )
        }
      }
    }

    // ---------------------------------------------------------------------
    // Check 16: Catalog entry hierarchy order (Index > Redirect > Superstar > Star > Regular)
    // ---------------------------------------------------------------------

    if (isCatalogEntry) {
      const getTier = (str) => {
        const badgeMatch = str.match(/^\s*[*+-]\s+([🌐🌟⭐]|↪\uFE0F?)/u)
        if (!badgeMatch) return 5
        const badge = badgeMatch[1]
        if (badge.includes('🌐')) return 1 // Tier 1: Index
        if (badge.includes('↪')) return 2 // Tier 2: Redirect
        if (badge.includes('🌟')) return 3 // Tier 3: Superstar
        if (badge.includes('⭐')) return 4 // Tier 4: Star
        return 5 // Tier 5: Regular
      }

      const isCatalogLine = (str) =>
        /^\s*[*+-]\s+(?:(?:⭐|🌐|↪️?|🌟)\s+)?(?:\*\*)?\[[^\]]+\]/u.test(str)

      let start = index
      while (
        start > 0 &&
        !skippedLines.has(start - 1) &&
        isCatalogLine(stripInvisibleCharacters(lines[start - 1]))
      ) {
        start--
      }

      let end = index
      while (
        end < lines.length - 1 &&
        !skippedLines.has(end + 1) &&
        isCatalogLine(stripInvisibleCharacters(lines[end + 1]))
      ) {
        end++
      }

      const N = end - start + 1

      if (N > 1) {
        const cacheKey = `${start}:${end}`
        let inLNDS = hierarchyCache.get(cacheKey)
        if (!inLNDS) {
          const blockTiers = []
          for (let k = start; k <= end; k++) {
            blockTiers.push(getTier(lines[k]))
          }

          const dp = new Array(N).fill(1)
          const parent = new Array(N).fill(-1)

          for (let i = 0; i < N; i++) {
            for (let j = 0; j < i; j++) {
              if (blockTiers[j] <= blockTiers[i]) {
                if (dp[j] + 1 > dp[i]) {
                  dp[i] = dp[j] + 1
                  parent[i] = j
                }
              }
            }
          }

          let maxLen = 0
          let maxIdx = -1
          for (let i = 0; i < N; i++) {
            if (dp[i] >= maxLen) {
              maxLen = dp[i]
              maxIdx = i
            }
          }

          inLNDS = new Set()
          let curr = maxIdx
          while (curr !== -1) {
            inLNDS.add(curr)
            curr = parent[curr]
          }
          hierarchyCache.set(cacheKey, inLNDS)
        }

        const localIdx = index - start

        if (!inLNDS.has(localIdx)) {
          const currentTier = getTier(lines[index])
          const titleMatch = line.match(/\[[^\]]+\]/)
          const offendingMatch = titleMatch
            ? titleMatch[0]
            : line.trim().slice(0, 20)
          const matchIndex = titleMatch
            ? line.indexOf(titleMatch[0])
            : Math.max(0, line.search(/[*+-]/))

          addError(
            `Hierarchy violation, Wrong or missing featured emoji: Tier ${currentTier} entry is out of sequence in this block`,
            offendingMatch,
            matchIndex !== -1 ? matchIndex : 0
          )
        }
      }
    }

    // ---------------------------------------------------------------------
    // REPORTER
    // ---------------------------------------------------------------------

    if (errors.length > 0) {
      hasErrors = true
      totalErrors += errors.length
      filesWithErrors.add(file)

      const cleanPath = relativePath.replace(/\\/g, '/')
      const locationStr = color('1;36', cleanPath) + color(36, `:${lineNum}`)

      // Single Line Header (clean file:line location without per-line badges)
      console.log(locationStr)

      let searchOffset = 0

      // Loop through each individual error on this line
      errors.forEach((err) => {
        const message = typeof err === 'string' ? err : err.message
        const match = typeof err === 'string' ? err : err.match || null
        const index = typeof err === 'string' ? -1 : err.index

        let idx =
          index !== undefined && index !== -1
            ? index
            : match
              ? line.indexOf(match, searchOffset)
              : -1

        // Bulleted Error Message
        console.log(`  ${color('38;5;141', '- ' + message)}`)

        if (idx !== -1 && match) {
          searchOffset = idx + 1

          const contextLength = 23
          const shownLen = Math.min(match.length, 100)
          const truncated = match.length > shownLen
          const start = Math.max(0, idx - contextLength)
          const offendingText =
            line.slice(idx, idx + shownLen) + (truncated ? '...' : '')
          const end = Math.min(line.length, idx + match.length + contextLength)

          const prefix = (start > 0 ? '... ' : '  ') + line.slice(start, idx)
          const suffix = truncated
            ? ''
            : line.slice(idx + match.length, end) +
              (end < line.length ? ' ...' : '')

          const highlightedMatch = color('43;30', offendingText)

          // Indented context line (+2 spaces for bullet alignment)
          console.log(
            `  ${color(90, prefix)}${highlightedMatch}${color(90, suffix)}`
          )

          // Indented Carets matching context slice (+2 spaces)
          const visualCaretIndex = prefix.length + 2
          const caret = ' '.repeat(visualCaretIndex) + '^'.repeat(shownLen || 1)
          console.log(color('1;33', caret))
        } else {
          console.log(`    ${color(90, line.trim().slice(0, 80))}`)
        }
      })
    }
  })
})

if (!hasErrors) {
  const successIcon = isUnicodeSupported ? '✅' : '[OK]'
  console.log(
    `${color('1;32', successIcon)} ${color('1;32', 'No formatting issues found.')}\n`
  )
} else {
  const errorIcon = isUnicodeSupported ? '❌ ' : '[ERROR] >>>'
  const issueLabel =
    totalErrors === 1
      ? '1 formatting issue'
      : `${totalErrors} formatting issues`
  const fileCount = filesWithErrors.size
  const fileLabel = fileCount === 1 ? ' 1 file' : ` ${fileCount} files`

  console.log(
    `\n${color('1;31', errorIcon)} ${color('1;31', `${issueLabel} found across${fileLabel}.`)}\n`
  )
  process.exit(1)
}
