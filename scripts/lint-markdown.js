import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
const LABEL_REDIRECT_EXCEPTIONS = {
  discord: new Set(['https://trw.lat/ds'])
}

function stripInvisibleCharacters(text) {
  return text.replace(INVISIBLE_CHARACTERS, '')
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
  const lines = content.split('\n')
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
  let fenceCharacter = ''
  let inFrontmatter = false
  const headingStack = []
  const seenHeadings = new Map()
  const primaryUrlsBySection = new Map()
  const hierarchyCache = new Map()

  lines.forEach((line, index) => {
    const lineNum = index + 1
    if (index === 0 && line.trim() === '---') {
      inFrontmatter = true
      return
    }
    if (inFrontmatter) {
      if (line.trim() === '---') inFrontmatter = false
      return
    }

    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch) {
      const markerCharacter = fenceMatch[1][0]
      if (!fenceCharacter) fenceCharacter = markerCharacter
      else if (fenceCharacter === markerCharacter) fenceCharacter = ''
      return
    }
    if (fenceCharacter) return

    // Strip zero-width and invisible joiner characters to avoid false positives in spacing checks
    line = stripInvisibleCharacters(line)

    let errors = []
    // Record an error, optionally with the offending substring of `line` so the
    // reporter can underline exactly where the problem is.
    const addError = (message, match, index = -1) =>
      errors.push({ message, match, index })

    const isCatalogEntry =
      /^\s*[*+-]\s+(?:(?:⭐|🌐|↪️|🌟)\s+)?(?:\*\*)?\[[^\]]+\]\(/u.test(line)

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

    const emptyLinkMatch = line.match(/\[[^\]]*\]\(\s*\)/)
    if (emptyLinkMatch) {
      addError('Empty link destination', emptyLinkMatch[0])
    }

    const localLinkRegex = /!?\[[^\]]*\]\(([^)]+)\)/g
    let localLinkMatch
    while ((localLinkMatch = localLinkRegex.exec(line)) !== null) {
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
    }

    // ---------------------------------------------------------------------
    // Check 2: Space between ] (
    // ---------------------------------------------------------------------

    const bracketParenMatch = line.matchAll(/\]\s+\(http/g)
    for (const m of bracketParenMatch) {
      addError('Space between bracket and parenthesis in link', m[0], m.index)
    }

    // ---------------------------------------------------------------------
    // Check 3: Missing closing bracket ]
    // ---------------------------------------------------------------------

    // Pattern: [Text(http...
    // We look for [ followed by (http without ] in between.
    const missingBracketMatch = line.matchAll(/\[[^\]]*\(http/g)
    for (const m of missingBracketMatch) {
      addError('Possible missing closing bracket "]"', m[0], m.index)
    }

    // ---------------------------------------------------------------------
    // Check 4: Missing closing parenthesis )
    // ---------------------------------------------------------------------

    // Pattern: [Text](http...  where it ends without )
    // We look for "](http..." followed by space or end of line, but NOT ending with )
    // regex: \]\(http[^)]*($|\s) matches "](http://url" at EOL or "](http://url "
    const missingParens = line.matchAll(/\]\((http[^)\s]*)/g)
    for (const m of missingParens) {
      // Check if the link is missing a closing parenthesis on this line
      // by verifying that the text after the URL does not cleanly close it.
      const remainder = line.slice(m.index + m[0].length)
      if (!remainder.startsWith(')') && !m[0].endsWith(')')) {
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
    const doubleParenMatch = line.matchAll(/\]\(([^)]+?)\)\)/g)
    for (const m of doubleParenMatch) {
      const openParens = (line.match(/\(/g) || []).length
      const closeParens = (line.match(/\)/g) || []).length
      if (closeParens > openParens) {
        addError(
          'Double closing parenthesis in link (Unbalanced)',
          m[0],
          m.index
        )
      }
    }

    // ---------------------------------------------------------------------
    // Check 6: Double spaces
    // ---------------------------------------------------------------------

    // We want to avoid double spaces in the text, but ignore leading indentation.
    // We trim start of line to ignore indentation, then check for "  ".
    const leadSpaceLength = line.length - line.trimStart().length
    const doubleSpaceMatch = line.trimStart().matchAll(/ {2,}/g)
    for (const m of doubleSpaceMatch) {
      addError('Double space detected', m[0], leadSpaceLength + m.index)
    }

    // ---------------------------------------------------------------------
    // Check 7: Broken Bold Syntax (Unclosed tags & improper spacing)
    // ---------------------------------------------------------------------

    // 1. Skip thematic break / horizontal rule lines like ***, ---, or * * *
    if (!/^\s*(?:\*|\-|_){3,}\s*$/.test(line)) {
      // 2. Strip inline code blocks to prevent false positives inside backticks
      const lineNoCode = line.replace(/`[^`]+`/g, (m) => ' '.repeat(m.length))

      // 3. Count exact occurrences of double asterisks '**'
      const doubleAsteriskMatches = [...lineNoCode.matchAll(/\*\*/g)]
      if (doubleAsteriskMatches.length % 2 !== 0) {
        const lastMatch =
          doubleAsteriskMatches[doubleAsteriskMatches.length - 1]
        addError(
          'Unclosed or broken bold syntax (mismatched ** tags)',
          '**',
          lastMatch.index
        )
      }

      // 4. Check for leading/trailing space inside bold tags: ** text** or **text **
      const boldMatches = lineNoCode.matchAll(/\*\*([^*]+)\*\*/g)
      for (const m of boldMatches) {
        const text = m[1]
        if (text.length > 0 && (/^\s/.test(text) || /\s$/.test(text))) {
          addError(
            'Broken bold syntax (leading or trailing space inside **)',
            m[0],
            m.index
          )
        }
      }
    }

    // ---------------------------------------------------------------------
    // Check 8: Asymmetric spaces around slash & Compound words
    // ---------------------------------------------------------------------

    const lineForChecks = line
      .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length))
      .replace(/`[^`]+`/g, (m) => ' '.repeat(m.length))
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

        // --- BLOCK A: Missing space after ("Word /Word") ---
        if (spaceBefore && !spaceAfter) {
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

    // ---------------------------------------------------------------------
    // Check 9: Duplicate primary resource URLs in the same section
    // ---------------------------------------------------------------------

    if (isCatalogEntry) {
      const primaryLinkMatch = line.match(
        /^\s*[*+-]\s+(?:(?:⭐|🌐|↪️|🌟)\s+)?(?:\*\*)?\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/u
      )

      if (primaryLinkMatch) {
        const primaryUrl = primaryLinkMatch[2]
        const normalizedName = normalizeText(primaryLinkMatch[1])
        const normalizedUrl = normalizePrimaryUrl(primaryUrl)
        const sectionPath = headingStack.filter(Boolean).join(' > ')
        const duplicateKey = `${sectionPath}\u0000${normalizedName}\u0000${normalizedUrl}`
        const firstLine = primaryUrlsBySection.get(duplicateKey)

        if (firstLine) {
          const urlStartIndex = line.indexOf(primaryUrl, primaryLinkMatch.index)
          addError(
            `Duplicate primary resource URL in the same section (first seen on line ${firstLine})`,
            primaryUrl,
            urlStartIndex !== -1 ? urlStartIndex : primaryLinkMatch.index
          )
        } else {
          primaryUrlsBySection.set(duplicateKey, lineNum)
        }
      }
    }

    // ---------------------------------------------------------------------
    // Check 10: Adjacent links without separator
    // ---------------------------------------------------------------------

    const FILES_TO_IGNORE_LINK_SEPARATOR_CHECK = [
      'docs/beginners-guide.md',
      'docs/unsafe.md'
    ]

    const isIgnoredFile = FILES_TO_IGNORE_LINK_SEPARATOR_CHECK.some(
      (ignoredFile) =>
        path.normalize(file).endsWith(path.normalize(ignoredFile))
    )

    if (isCatalogEntry && !isIgnoredFile) {
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      let match

      const allowedChars = new Set([
        '/',
        '-',
        ',',
        '(',
        '&',
        '>',
        ':',
        '|',
        '*',
        '!',
        '.',
        '?',
        ';',
        '_',
        '⭐',
        '🌐',
        '🌟',
        '↪️',
        '+',
        '#',
        '►',
        '▷'
      ])

      const allowedWords = [
        'or',
        'and',
        'a',
        'an',
        'the',
        'use',
        'using',
        'via',
        'with',
        'in',
        'on',
        'at',
        'by',
        'to',
        'for',
        'from',
        'check',
        'see',
        'try',
        'requires',
        'including',
        'includes',
        'that',
        'this',
        'here',
        'your',
        'our',
        'of',
        'about',
        'their',
        'join',
        'getting',
        'most',
        'like',
        'every',
        'being',
        'mostly',
        'highly',
        'up',
        'we',
        'optionally',
        'these',
        'linux',
        'mac',
        'macos',
        'windows',
        'android',
        'ios',
        'web',
        'desktop',
        'mobile',
        'firefox',
        'chrome'
      ]

      const allowedWordsRegex = new RegExp(
        `(?:^|[^a-zA-Z0-9])(?:${allowedWords.join('|')})$`,
        'i'
      )

      while ((match = linkRegex.exec(line)) !== null) {
        const index = match.index
        if (index === 0) continue

        const preceding = line.slice(0, index)

        // Ignore start-of-line markers, star badges, or bold/italic prefixes
        if (/^\s*([*+-]|\d+\.)\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+⭐\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+🌐\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+🌟\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+↪️\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+[*_]+\s*$/.test(preceding)) continue

        const trimmedPreceding = preceding.trimEnd()
        if (trimmedPreceding.length === 0) continue

        // Check if last character is an allowed separator symbol
        const lastChar = trimmedPreceding.slice(-1)
        if (allowedChars.has(lastChar)) continue

        // Check if preceding word is an allowed functional word/qualifier
        if (allowedWordsRegex.test(trimmedPreceding)) continue

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

    if (line.includes('/') && !isTempMailSection && !isStaticHostingSection) {
      // Find where description text starts (after ") - ")
      const dashMatch = line.match(/\)\s*-\s+/)

      if (dashMatch) {
        const descStartIndex = dashMatch.index + dashMatch[0].length
        const descriptionText = line.slice(descStartIndex)

        // Split by spaced slashes " / "
        const parts = descriptionText.split(/\s+\/\s+/)

        if (parts.length >= 2) {
          const seenDescriptions = new Map()
          let currentOffsetInLine = descStartIndex

          parts.forEach((part) => {
            const leadingMatch = part.match(/^[\s\-\*⭐]*/)
            const leadingLength = leadingMatch ? leadingMatch[0].length : 0

            const desc = part
              .trim()
              .replace(/^[\s\-\*⭐]+/, '')
              .replace(/[\s\-\*⭐]+$/, '')

            if (desc) {
              const exactDescIndex = currentOffsetInLine + leadingLength
              const checkDesc = desc.toLowerCase()

              if (seenDescriptions.has(checkDesc)) {
                // Pass exactDescIndex as the 3rd argument (index)
                addError(
                  `Duplicate description detected: "${desc}"`,
                  desc,
                  exactDescIndex
                )
              } else {
                seenDescriptions.set(checkDesc, exactDescIndex)
              }
            }

            // Move cursor past this part + the 3 chars of " / "
            currentOffsetInLine += part.length + 3
          })
        }
      }
    }

    // ---------------------------------------------------------------------
    // Check 12: Link Label Mismatch
    // ---------------------------------------------------------------------

    // Ensures that labels like "Subreddit", "GitHub", "Discord", etc. point to the correct domain
    const linkMatchRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
    let lm

    while ((lm = linkMatchRegex.exec(line)) !== null) {
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

      const checks = [
        { key: 'subreddit', domains: ['reddit.com'] },
        { key: 'github', domains: ['github.com', 'github.io'] },
        {
          key: 'discord',
          domains: [
            'discord.com',
            'discord.gg',
            'discordapp.com',
            'discord.me',
            'discord.li',
            'dsc.gg',
            'railgun.works'
          ]
        },
        {
          key: 'telegram',
          domains: ['t.me', 'telegram.me', 'telegram.org', 'telegram.dog']
        },
        { key: 'twitter', domains: ['twitter.com', 'x.com', 't.co'] },
        { key: 'youtube', domains: ['youtube.com', 'youtu.be'] },
        {
          key: 'lemmy',
          domains: ['lemmy.', 'fediverse.', 'sh.itjust.works', 'join-lemmy.org']
        },
        { key: 'instagram', domains: ['instagram.com'] },
        { key: 'facebook', domains: ['facebook.com'] },
        { key: 'bluesky', domains: ['bsky.app'] },
        {
          key: 'mastodon',
          domains: ['mastodon.social', 'joinmastodon.org', 'apps.apple.com']
        }
      ]

      const trimmedLabel = normalizeText(labelText)

      for (const check of checks) {
        // Exact match check for keywords to avoid flagging descriptive names like "GitHub Dorks"
        if (trimmedLabel === check.key) {
          if (
            !isFmhyInternalReference &&
            !isKnownLabelRedirect(check.key) &&
            !check.domains.some(hostnameMatches)
          ) {
            addError(
              `Link label mismatch: Label "${labelText}" points to non-${check.key} domain (${rawUrlText})`,
              matchText,
              matchIndex
            )
          }
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

      // Special check for "X" label (social media)
      if (
        trimmedLabel === 'x' &&
        !isFmhyInternalReference &&
        !hostnameMatches('x.com') &&
        !hostnameMatches('twitter.com') &&
        !hostnameMatches('t.co')
      ) {
        addError(
          `Link label mismatch: Label "X" points to non-X/Twitter domain (${rawUrlText})`,
          matchText,
          matchIndex
        )
      }
    }

    // ---------------------------------------------------------------------
    // Checks 13, 14, 15: English-specific linting (Repeated words, Typos, Article usage)
    // ---------------------------------------------------------------------

    if (!isSeparatedEnglishCheck) {
      // Create a sanitized line for text checks: strip URLs and inline links
      // Preserves character indices 1:1 by replacing matches with equivalent whitespace padding
      const lineCleaned = line
        .replace(/https?:\/\/[^\s)]+/g, (m) => ' '.repeat(m.length))
        .replace(/\[[^\]]+\]\([^)]*\)/g, (m) => ' '.repeat(m.length))

      // ---------------------------------------------------------------------
      // Check 13: Repeated Words (e.g., "the the", "and and")
      // ---------------------------------------------------------------------

      // Allowlist for legitimate adjacent repeated words (proper nouns, games, tech)
      const allowedRepeatedWords = new Set(['puyo', 'duran', 'agar', 'hocus'])

      // Find adjacent identical words separated by whitespace
      const repeatedWordMatches = lineCleaned.matchAll(/\b([a-zA-Z]+)\s+\1\b/gi)
      for (const m of repeatedWordMatches) {
        const word = m[1].toLowerCase()
        if (!allowedRepeatedWords.has(word)) {
          addError(`Repeated word detected: "${m[1]}"`, m[0], m.index)
        }
      }

      // ---------------------------------------------------------------------
      // Check 14: Common Typos
      // ---------------------------------------------------------------------

      const commonTypos = {
        teh: 'the',
        adn: 'and',
        thier: 'their',
        dont: "don't",
        cant: "can't",
        wont: "won't",
        occured: 'occurred',
        seperate: 'separate',
        independant: 'independent',
        reccomend: 'recommend',
        recieve: 'receive',
        adress: 'address',
        neccessary: 'necessary',
        tring: 'trying',
        availalbe: 'available',
        availabe: 'available',
        definately: 'definitely',
        maintainance: 'maintenance',
        accomodate: 'accommodate',
        begining: 'beginning',
        enviroment: 'environment',
        goverment: 'government',
        relevent: 'relevant',
        sucessful: 'successful',
        untill: 'until',
        wierd: 'weird',
        whereever: 'wherever'
      }

      for (const [typo, correction] of Object.entries(commonTypos)) {
        const typoRegex = new RegExp(`\\b${typo}\\b`, 'gi')
        const typoMatches = lineCleaned.matchAll(typoRegex)
        for (const m of typoMatches) {
          addError(
            `Possible typo: "${m[0]}" (should be "${correction}")`,
            m[0],
            m.index
          )
        }
      }

      // ---------------------------------------------------------------------
      // Check 15: Basic A/An Grammar
      // ---------------------------------------------------------------------

      // // PHONETIC EXCEPTIONS
      const requiresAn = ['hour', 'honor', 'honest', 'heir']
      const requiresA = [
        'one',
        'once',
        'use',
        'user',
        'utility',
        'universe',
        'university',
        'unicorn',
        'union',
        'united',
        'euro',
        'european',
        'euphemism',
        'unique',
        'luks'
      ]

      const articleRegex = /\b(a|an)\s+([a-z0-9]+)\b/gi

      for (const match of line.matchAll(articleRegex)) {
        const articleUsed = match[1].toLowerCase()
        const nextWordRaw = match[2]
        const nextWordLower = nextWordRaw.toLowerCase()

        let shouldBeAn = false

        // KNOWN PHONETIC EXCEPTION
        if (requiresAn.includes(nextWordLower)) {
          shouldBeAn = true
        } else if (requiresA.includes(nextWordLower)) {
          shouldBeAn = false
        }
        // ACRONYM CHECK
        else if (/^[A-Z0-9]*[A-Z][A-Z0-9]*$/.test(nextWordRaw)) {
          const vowelSoundingLetters = [
            'A',
            'E',
            'F',
            'H',
            'I',
            'L',
            'M',
            'N',
            'O',
            'R',
            'S',
            'X'
          ]
          shouldBeAn = vowelSoundingLetters.includes(nextWordRaw[0])
        }
        // STANDARD SPELLING RULE
        else {
          const startsWithVowel = /^[aeiou]/i.test(nextWordLower)
          shouldBeAn = startsWithVowel
        }

        if (articleUsed === 'a' && shouldBeAn) {
          addError(
            `Incorrect article "a" usage: "${match[0]}" (should be "an")`,
            match[0],
            match.index
          )
        } else if (articleUsed === 'an' && !shouldBeAn) {
          addError(
            `Incorrect article "an" usage: "${match[0]}" (should be "a")`,
            match[0],
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
      while (start > 0 && isCatalogLine(lines[start - 1])) {
        start--
      }

      let end = index
      while (end < lines.length - 1 && isCatalogLine(lines[end + 1])) {
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
            : line.indexOf('*')

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
          const start = Math.max(0, idx - contextLength)
          const end = Math.min(line.length, idx + match.length + contextLength)

          const prefix = (start > 0 ? '... ' : '  ') + line.slice(start, idx)
          const offendingText = line.slice(idx, idx + match.length)
          const suffix =
            line.slice(idx + match.length, end) +
            (end < line.length ? ' ...' : '')

          const highlightedMatch = color('43;30', offendingText)

          // Indented context line (+2 spaces for bullet alignment)
          console.log(
            `  ${color(90, prefix)}${highlightedMatch}${color(90, suffix)}`
          )

          // Indented Carets matching context slice (+2 spaces)
          const visualCaretIndex = prefix.length + 2
          const caret =
            ' '.repeat(visualCaretIndex) + '^'.repeat(match.length || 1)
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
