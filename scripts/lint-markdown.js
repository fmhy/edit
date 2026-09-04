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

// Parse CLI arguments & support --fix flag
const rawArgs = process.argv.slice(2)
const isFixMode = rawArgs.includes('--fix')
const args = rawArgs.filter((arg) => arg !== '--fix')

const files =
  args.length > 0
    ? args.flatMap((target) => getMarkdownFiles(path.resolve(target)))
    : [
        ...getMarkdownFiles(DOCS_DIR),
        path.join(PROJECT_ROOT, '.github/CONTRIBUTING.md')
      ]

let hasErrors = false
let totalErrorCount = 0
let affectedFilesCount = 0

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

console.log('🔍 Scanning markdown files for formatting issues...\n')

files.forEach((file) => {
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

  // Folders to completely ignore from all checks
  const FOLDERS_TO_IGNORE = [
    'docs/.vitepress/dist/',
    'docs/posts/',
    'docs/other/',
    'docs/public/'
  ]

  if (FILES_TO_IGNORE.includes(normalizedPath)) return
  if (FOLDERS_TO_IGNORE.some((folder) => normalizedPath.includes(folder)))
    return

  const FILES_TO_IGNORE_ENGLISH_CHECKS = ['docs/non-english.md']
  const isSeparatedEnglishCheck =
    FILES_TO_IGNORE_ENGLISH_CHECKS.includes(normalizedPath)

  let currentHeader = ''
  let fenceCharacter = ''
  let inFrontmatter = false
  let fileModified = false
  let fileHasErrors = false

  const headingStack = []
  const seenHeadings = new Map()
  const primaryUrlsBySection = new Map()

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

    line = stripInvisibleCharacters(line)

    let errors = []
    const addError = (message, match) => errors.push({ message, match })

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

    // Check 1: Starred links must be bolded
    if (/^\s*[*+-]\s+⭐/.test(line)) {
      if (!/⭐\s*\*\*/.test(line)) {
        addError('Starred item not bolded (expected * ⭐ **Link**)', '⭐')
      }
    }

    // Check 2: Space between ] (
    const bracketParenMatch = line.match(/\]\s+\(http/)
    if (bracketParenMatch) {
      addError(
        'Space between bracket and parenthesis in link',
        bracketParenMatch[0]
      )
    }

    // Check 3: Missing closing bracket ]
    const missingBracketMatch = line.match(/\[[^\]]*\(http/)
    if (missingBracketMatch) {
      addError('Possible missing closing bracket "]"', missingBracketMatch[0])
    }

    // Check 4: Missing closing parenthesis )
    const missingParenMatch = line.match(/\]\((http[^)]+?)($|\s)/)
    if (missingParenMatch) {
      addError(
        `Possible broken link (missing closing parenthesis or trailing space): ${missingParenMatch[1]}`,
        missingParenMatch[1]
      )
    }

    // Check 5: Double parenthesis in link
    const doubleParenMatch = line.match(/\]\([^)]+\)\)/)
    if (doubleParenMatch) {
      const openParens = (line.match(/\(/g) || []).length
      const closeParens = (line.match(/\)/g) || []).length
      if (closeParens > openParens) {
        addError(
          'Double closing parenthesis in link (Unbalanced)',
          doubleParenMatch[0]
        )
      }
    }

    // Check 6: Double spaces (Skipping Markdown tables)
    const trimmedLine = line.trimStart()
    const isTableLine = trimmedLine.startsWith('|')
    if (!isTableLine) {
      const doubleSpaceMatch = trimmedLine.match(/ {2,}/)
      if (doubleSpaceMatch) {
        addError('Double space detected', doubleSpaceMatch[0])
        if (isFixMode) {
          const indent = line.substring(0, line.length - trimmedLine.length)
          line = indent + trimmedLine.replace(/ {2,}/g, ' ')
          lines[index] = line
          fileModified = true
        }
      }
    }

    // Check 7: Broken Bold Syntax
    const boldLine = line.replace(/`[^`]+`/g, 'PLACEHOLDER')
    if (boldLine.includes('**')) {
      const parts = boldLine.split('**')
      for (let i = 1; i < parts.length; i += 2) {
        if (i + 1 < parts.length) {
          const text = parts[i]
          if (text.length > 0 && (/^\s/.test(text) || /\s$/.test(text))) {
            addError(
              `Broken bold syntax (leading/trailing space) in "**${text}**"`,
              `**${text}**`
            )
          }
        }
      }
    }

    // Check 8: Asymmetric spaces around slash
    const lineForChecks = line
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/https?:\/\/[^\s)]+/g, ' ')

    if (!/^\s*link:/i.test(line)) {
      const missingSpaceAfter = lineForChecks.matchAll(/\s\/(\S+)/g)
      for (const match of missingSpaceAfter) {
        const wordAfter = match[1]
        if (wordAfter.startsWith('>')) continue
        if (wordAfter.includes('/')) continue

        addError(
          `Missing space after slash (e.g. "Word /Word"): "${match[0]}"`,
          `/${wordAfter}`
        )
        break
      }

      const missingSpaceBefore = lineForChecks.matchAll(
        /(?:^|[^\w/])([\w.+-]+)\/\s/g
      )
      for (const match of missingSpaceBefore) {
        const wordBefore = match[1]
        if (/^(w|r|u|c)$/i.test(wordBefore)) continue

        addError(
          `Missing space before slash (e.g. "Word/ Word"): "${match[0]}"`,
          `${wordBefore}/`
        )
        break
      }

      const doubleSlashMatch = lineForChecks.match(/\/\s+\//)
      if (doubleSlashMatch) {
        addError(
          'Double slash with spaces detected (e.g. "/ /")',
          doubleSlashMatch[0]
        )
      }
    }

    // Check 9: Adjacent links without separator
    const FILES_TO_IGNORE_LINK_SEPARATOR_CHECK = [
      'docs/beginners-guide.md',
      'docs/unsafe.md'
    ]

    const isCatalogEntry =
      /^\s*[*+-]\s+(?:(?:⭐|🌐|↪️)\s+)?(?:\*\*)?\[[^\]]+\]\(/u.test(line)

    if (isCatalogEntry) {
      const primaryLinkMatch = line.match(
        /^\s*[*+-]\s+(?:(?:⭐|🌐|↪️)\s+)?(?:\*\*)?\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/u
      )
      if (primaryLinkMatch) {
        const normalizedName = normalizeText(primaryLinkMatch[1])
        const normalizedUrl = normalizePrimaryUrl(primaryLinkMatch[2])
        const sectionPath = headingStack.filter(Boolean).join(' > ')
        const duplicateKey = `${sectionPath}\u0000${normalizedName}\u0000${normalizedUrl}`
        const firstLine = primaryUrlsBySection.get(duplicateKey)
        if (firstLine) {
          addError(
            `Duplicate primary resource URL in the same section (first seen on line ${firstLine})`,
            primaryLinkMatch[2]
          )
        } else {
          primaryUrlsBySection.set(duplicateKey, lineNum)
        }
      }
    }

    if (
      isCatalogEntry &&
      !FILES_TO_IGNORE_LINK_SEPARATOR_CHECK.some((ignoredFile) =>
        path.normalize(file).endsWith(path.normalize(ignoredFile))
      )
    ) {
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      let match
      while ((match = linkRegex.exec(line)) !== null) {
        const index = match.index
        if (index === 0) continue

        const preceding = line.slice(0, index)

        if (/^\s*([*+-]|\d+\.)\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+⭐\s*$/.test(preceding)) continue
        if (/^\s*[*+-]\s+[*_]+\s*$/.test(preceding)) continue

        const trimmedPreceding = preceding.trimEnd()
        if (trimmedPreceding.length === 0) continue

        const lastChar = trimmedPreceding.slice(-1)
        const allowedChars = [
          '/', '-', ',', '(', '&', '>', ':', '|', '*', '!', '.', '?', ';', '_', '⭐', '+', '#', '►', '▷'
        ]
        if (allowedChars.includes(lastChar)) continue

        const allowedWords = [
          'or', 'and', 'a', 'an', 'the', 'use', 'using', 'via', 'with', 'in', 'on', 'at', 'by', 'to', 'for',
          'from', 'check', 'see', 'try', 'requires', 'including', 'includes', 'that', 'this', 'here', 'your',
          'our', 'of', 'about', 'their', 'join', 'getting', 'most', 'like', 'every', 'being', 'mostly',
          'highly', 'up', 'we', 'optionally', 'linux', 'mac', 'macos', 'windows', 'android', 'ios',
          'web', 'desktop', 'mobile', 'firefox', 'chrome'
        ]
        const wordRegex = new RegExp(
          `(^|[^a-zA-Z0-9])(${allowedWords.join('|')})$`,
          'i'
        )
        if (wordRegex.test(trimmedPreceding)) continue

        addError(
          `Missing separator before link (expected "/", "or", ",", etc): "...${preceding.slice(-10)}[${match[1]}]..."`,
          match[0]
        )
      }
    }

    // Check 13: Duplicate Descriptions
    const isTempMailSection =
      normalizedPath === 'docs/internet-tools.md' &&
      currentHeader.includes('Temp Mail')
    const isStaticHostingSection =
      normalizedPath === 'docs/developer-tools.md' &&
      currentHeader.includes('Static Page Hosting')
    if (line.includes('/') && !isTempMailSection && !isStaticHostingSection) {
      const BLOCK_SPLIT = '___BLOCK_SPLIT___'
      const lineCleanedLinks = line
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/`[^`]+`/g, '')
        .replace(/(\*\*|__)?\[[^\]]+\]\([^)]+\)(\*\*|__)?/g, BLOCK_SPLIT)
      const blocks = lineCleanedLinks.split(BLOCK_SPLIT)

      blocks.forEach((block) => {
        if (!block || !block.includes('/')) return

        const parts = block.split(/\s+\/\s+/)
        if (parts.length < 2) return

        const seenDescriptions = new Set()
        parts.forEach((part) => {
          let desc = part.trim()
          desc = desc.replace(/^[\s\-\*⭐]+/, '').replace(/[\s\-\*⭐]+$/, '')

          if (!desc) return

          const checkDesc = desc.toLowerCase()
          if (seenDescriptions.has(checkDesc)) {
            addError(`Duplicate description detected: "${desc}"`, desc)
          } else {
            seenDescriptions.add(checkDesc)
          }
        })
      })
    }

    // Check 14: Link Label Mismatch
    const linkMatchRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
    let lm
    while ((lm = linkMatchRegex.exec(line)) !== null) {
      let parsedUrl
      try {
        parsedUrl = new URL(lm[2])
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
        if (LABEL_REDIRECT_EXCEPTIONS[label]?.has(parsedUrl.href)) return true
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

      const trimmedLabel = normalizeText(lm[1])

      for (const check of checks) {
        if (trimmedLabel === check.key) {
          if (
            !isFmhyInternalReference &&
            !isKnownLabelRedirect(check.key) &&
            !check.domains.some(hostnameMatches)
          ) {
            addError(
              `Link label mismatch: Label "${lm[1]}" points to non-${check.key} domain: ${lm[2]}`,
              lm[0]
            )
          }
        }
      }

      if (/^r\/[a-zA-Z0-9_]+$/.test(trimmedLabel)) {
        if (!isFmhyInternalReference && !hostnameMatches('reddit.com')) {
          addError(
            `Link label mismatch: Subreddit label "${lm[1]}" points to non-reddit domain: ${lm[2]}`,
            lm[0]
          )
        }
      }

      if (
        trimmedLabel === 'x' &&
        !isFmhyInternalReference &&
        !hostnameMatches('x.com') &&
        !hostnameMatches('twitter.com') &&
        !hostnameMatches('t.co')
      ) {
        addError(
          `Link label mismatch: Label "X" points to non-X/Twitter domain: ${lm[2]}`,
          lm[0]
        )
      }
    }

    // Checks 10, 11, 12: English-specific checks
    if (!isSeparatedEnglishCheck) {
      const lineCleaned = line
        .replace(/https?:\/\/[^\s)]+/g, '')
        .replace(/\[[^\]]+\]\([^)]*\)/g, '__LINK__')

      // Check 10: Repeated words
      const repeatedWordMatch = lineCleaned.match(/\b([a-zA-Z]+)\s+\1\b/i)
      if (repeatedWordMatch) {
        const word = repeatedWordMatch[1].toLowerCase()
        if (!['puyo', 'duran', 'agar', 'hocus'].includes(word)) {
          addError(
            `Repeated word detected: "${repeatedWordMatch[0]}"`,
            repeatedWordMatch[0]
          )
        }
      }

      // Check 11: Common Typos (with auto-fix support)
      const commonTypos = {
        teh: 'the', adn: 'and', thier: 'their', dont: "don't", cant: "can't",
        wont: "won't", occured: 'occurred', seperate: 'separate',
        independant: 'independent', reccomend: 'recommend', recieve: 'receive',
        adress: 'address', neccessary: 'necessary', tring: 'trying',
        availalbe: 'available', availabe: 'available', definately: 'definitely',
        maintainance: 'maintenance', accomodate: 'accommodate',
        begining: 'beginning', enviroment: 'environment',
        goverment: 'government', relevent: 'relevant',
        sucessful: 'successful', untill: 'until', wierd: 'weird'
      }
      for (const [typo, correction] of Object.entries(commonTypos)) {
        const typoRegex = new RegExp(`\\b${typo}\\b`, 'i')
        const typoMatch = lineCleaned.match(typoRegex)
        if (typoMatch) {
          addError(
            `Possible typo: "${typo}" (should be "${correction}")`,
            typoMatch[0]
          )
          if (isFixMode) {
            line = line.replace(new RegExp(`\\b${typo}\\b`, 'gi'), (m) =>
              m[0] === m[0].toUpperCase()
                ? correction.charAt(0).toUpperCase() + correction.slice(1)
                : correction
            )
            lines[index] = line
            fileModified = true
          }
        }
      }

      // Check 12: Fixed A/An Grammar
      const aAnMatch = line.match(/\b(a)\s+([aeio]\w+)/i)
      if (aAnMatch) {
        const word = aAnMatch[2].toLowerCase()
        // Added exemptions for consonant-sound 'u' & 'eu' words
        const startsWithConsonantSound =
          word === 'one' ||
          word === 'once' ||
          word.startsWith('eu') ||
          /^(user|use|util|uni|url|ubuntu|unicode|ubiquitous|useful|usual)/i.test(word)

        if (!startsWithConsonantSound) {
          addError(
            `Incorrect article "a" usage: "${aAnMatch[0]}" (should be "an")`,
            aAnMatch[0]
          )
        }
      }

      // Catch 'a' before silent 'h' words
      const aSilentHMatch = line.match(/\b(a)\s+(hour|honest|hono[u]?r|heir|homage)\b/i)
      if (aSilentHMatch) {
        addError(
          `Incorrect article "a" usage: "${aSilentHMatch[0]}" (should be "an")`,
          aSilentHMatch[0]
        )
      }

      const anAMatch = line.match(/\b(an)\s+([bcdfghjklmnpqrstvwxyz]\w+)/i)
      if (anAMatch) {
        const word = anAMatch[2]
        const isAcronym = /^[A-Z0-9]+$/.test(word)
        const isSilentH = /^(hour|honest|hono[u]?r|heir|homage)/i.test(word)
        const isLetterName = /^[fhlmnrsx]\d/i.test(word)
        if (!isAcronym && !isSilentH && !isLetterName) {
          addError(
            `Incorrect article "an" usage: "${anAMatch[0]}" (should be "a")`,
            anAMatch[0]
          )
        }
      }
    }

    if (errors.length > 0) {
      hasErrors = true
      fileHasErrors = true
      totalErrorCount += errors.length
      const trimmed = line.trim()
      errors.forEach(({ message, match }) => {
        console.log(
          `${color(36, `${relativePath}:${lineNum}`)} - ${color(31, message)}`
        )
        console.log(`  ${color(90, trimmed)}`)
        const idx = match ? trimmed.indexOf(match) : -1
        if (idx !== -1) {
          const caret = ' '.repeat(2 + idx) + '^'.repeat(match.length || 1)
          console.log(color(31, caret))
        }
      })
    }
  })

  if (fileHasErrors) {
    affectedFilesCount++
  }

  // Save auto-fixes back to file if --fix was requested
  if (isFixMode && fileModified) {
    fs.writeFileSync(file, lines.join('\n'), 'utf-8')
  }
})

if (!hasErrors) {
  console.log('✅ No formatting issues found.')
} else {
  console.log(
    `\n❌ Found ${totalErrorCount} issue(s) across ${affectedFilesCount} file(s).`
  )
  if (isFixMode) {
    console.log(
      '🛠️ Auto-fixes applied where possible. Please review manual issues.'
    )
  }
  process.exit(1)
}
