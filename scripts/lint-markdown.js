import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_DIR = path.resolve(__dirname, '../docs')

// Platform "icon" links: the content transformer
// (docs/.vitepress/transformer.ts -> transformLinks) converts EXACT-text links
// like [GitHub](url) or [Discord](url) into platform ICONS at build time. Those
// regexes are case-sensitive, so a near-miss label ([Github], [discord]) or a
// known synonym ([Reddit] for Subreddit, [Twitter] for X) silently fails to
// render the icon and shows as raw text instead. Check 15 below flags these.
//   - `canonical`: the exact label text the transformer requires.
//   - `aliases`: common wrong synonyms that mean the same platform.
//   - `domains`: gates the check to that platform's own host, so unrelated
//     links are never touched (precision over recall — see Check 15).
// Note: [Source Code] is intentionally omitted: it has no domain to gate on, so
// a lowercase "[source code](link)" in prose can't be distinguished from an
// intended icon link without false positives.
const ICON_LINK_RULES = [
  { canonical: 'GitHub', domains: ['github.com', 'github.io'] },
  // GitLab's transformer rule additionally requires a preceding "/ " (it only
  // appears in source-link lists); we flag any casing on gitlab.com regardless,
  // which is correct for every real occurrence in this wiki.
  { canonical: 'GitLab', domains: ['gitlab.com'] },
  {
    canonical: 'Discord',
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
    canonical: 'Telegram',
    domains: ['t.me', 'telegram.me', 'telegram.org', 'telegram.dog']
  },
  { canonical: 'Subreddit', domains: ['reddit.com'], aliases: ['reddit'] },
  {
    canonical: 'X',
    domains: ['x.com', 'twitter.com', 't.co'],
    aliases: ['twitter']
  },
  { canonical: '.onion', domains: ['.onion'], aliases: ['onion'] }
]

// Host-aware domain match. Avoids substring traps (e.g. "max.com" must NOT match
// "x.com"). A leading-dot domain (".onion") matches by TLD suffix; every other
// domain matches the host exactly or as a subdomain (reddit.com, www.reddit.com).
function matchesPlatformDomain(url, domain) {
  const host = url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split(/[/?#]/)[0]
    .replace(/^[^@]*@/, '') // strip userinfo (user:pass@host)
    .replace(/:\d+$/, '') // strip port (host:443)
  if (domain.startsWith('.')) return host.endsWith(domain)
  return host === domain || host.endsWith(`.${domain}`)
}

// Non-recursive scan of DOCS_DIR
function getDocsFiles(dir) {
  const files = fs.readdirSync(dir)
  const mdFiles = []
  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (!stat.isDirectory() && file.endsWith('.md')) {
      mdFiles.push(filePath)
    }
  })
  return mdFiles
}

const files = getDocsFiles(DOCS_DIR)
let hasErrors = false

console.log('🔍 Scanning markdown files for formatting issues...\n')

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8')
  const lines = content.split('\n')
  const relativePath = path.relative(process.cwd(), file)
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

  if (FILES_TO_IGNORE.includes(normalizedPath)) return

  // Files to ignore for english-specific checks (Typos, A/An, Repeated Words)
  const FILES_TO_IGNORE_ENGLISH_CHECKS = ['docs/non-english.md']
  const isSeparatedEnglishCheck =
    FILES_TO_IGNORE_ENGLISH_CHECKS.includes(normalizedPath)

  let currentHeader = ''
  let inCodeBlock = false

  lines.forEach((line, index) => {
    const lineNum = index + 1
    // Strip zero-width and invisible joiner characters to avoid false positives in spacing checks
    line = line.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')

    // Toggle fenced code block state on lines starting with ``` (optionally indented)
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock
      return
    }
    if (inCodeBlock) return

    if (/^#+\s/.test(line)) {
      currentHeader = line
    }
    let errors = []

    // Check 1: Starred links must be bolded
    // Pattern: * ⭐ [Link] -> Bad
    // Pattern: * ⭐ **[Link] -> Good
    // Only applies to list items starting with * or -
    if (/^\s*[*+-]\s+⭐/.test(line)) {
      // It's a starred list item.
      // Check if the text immediately following "⭐ " starts with "**"
      // We look for the star, then optional spaces, then ensure "**" follows.
      if (!/⭐\s*\*\*/.test(line)) {
        errors.push('Starred item not bolded (expected * ⭐ **Link**)')
      }
    }

    // Check 2: Space between ] (
    if (/\]\s+\(http/.test(line)) {
      errors.push('Space between bracket and parenthesis in link')
    }

    // Check 3: Missing closing bracket ]
    // Pattern: [Text(http...
    // We look for [ followed by (http without ] in between.
    if (/\[[^\]]*\(http/.test(line)) {
      errors.push('Possible missing closing bracket "]"')
    }

    // Check 4: Missing closing parenthesis )
    // Pattern: [Text](http...  where it ends without )
    // We look for "](http..." followed by space or end of line, but NOT ending with )
    // regex: \]\(http[^)]*($|\s) matches "](http://url" at EOL or "](http://url "
    const missingParenMatch = line.match(/\]\((http[^)]+?)($|\s)/)
    if (missingParenMatch) {
      errors.push(
        `Possible broken link (missing closing parenthesis or trailing space): ${missingParenMatch[1]}`
      )
    }

    // Check 5: Double parenthesis in link
    // specific pattern: ](url))
    // This is often valid if inside parenthesis: (See [Link](url))
    // We only flag if parentheses are UNBALANCED in the line.
    if (/\]\([^)]+\)\)/.test(line)) {
      const openParens = (line.match(/\(/g) || []).length
      const closeParens = (line.match(/\)/g) || []).length
      if (closeParens > openParens) {
        errors.push('Double closing parenthesis in link (Unbalanced)')
      }
    }

    // Check 6: Double spaces
    // We want to avoid double spaces in the text, but ignore leading indentation.
    // We trim start of line to ignore indentation, then check for "  ".
    const trimmedLine = line.trimStart()
    if (trimmedLine.includes('  ')) {
      errors.push('Double space detected')
    }

    // Check 7: Broken Bold Syntax
    // Pattern: ** Text**, **Text **, or ** Text **
    // We temporarily replace inline code to avoid false positives
    const boldLine = line.replace(/`[^`]+`/g, 'PLACEHOLDER')
    if (boldLine.includes('**')) {
      const parts = boldLine.split('**')
      // Check odd segments (inside the stars)
      for (let i = 1; i < parts.length; i += 2) {
        // Ensure we have a closing pair on this line
        if (i + 1 < parts.length) {
          const text = parts[i]
          if (text.length > 0 && (/^\s/.test(text) || /\s$/.test(text))) {
            errors.push(
              `Broken bold syntax (leading/trailing space) in "**${text}**"`
            )
          }
        }
      }
    }
    // Check 8: Asymmetric spaces around slash
    // Strip tokens that legitimately contain slashes / comments so they don't
    // generate false positives. Replacements are blanked (not placeholders)
    // because any word-shaped placeholder would itself be matched by the
    // slash regex below and re-flagged.
    //   - URLs (http://...)
    //   - HTML comments (<!-- /search-exclude -->)
    //   - Inline code (`elenemigos.com`, `w/ account`)
    const lineForChecks = line
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/https?:\/\/[^\s)]+/g, ' ')

    // Ignore VitePress sidebar links (e.g. "link: /foo")
    if (!/^\s*link:/i.test(line)) {
      // A. Missing space after slash: " /Word"
      // Exception: /> (HTML close tag)
      // Exception: /Word/ (Path/Board e.g. /co/)
      const missingSpaceAfter = lineForChecks.matchAll(/\s\/(\S+)/g)
      for (const match of missingSpaceAfter) {
        const wordAfter = match[1]
        if (wordAfter.startsWith('>')) continue // Ignore />
        // Ignore paths (e.g. /bin), subreddits (/r/foo), or compound words (Word/Word)
        if (wordAfter.includes('/')) continue

        errors.push(
          `Missing space after slash (e.g. "Word /Word"): "${match[0]}"`
        )
        break
      }

      // B. Missing space before slash: "Word/ "
      // Exceptions: w/ (with), r/ (reddit), u/ (user), c/ (community)
      // The leading non-word anchor keeps "(w/" from sticking "(" onto the
      // captured abbreviation and breaking the allow-list match.
      const missingSpaceBefore = lineForChecks.matchAll(
        /(?:^|[^\w/])([\w.+-]+)\/\s/g
      )
      for (const match of missingSpaceBefore) {
        const wordBefore = match[1]
        // Allow common abbreviations: w/, r/, u/, c/
        if (/^(w|r|u|c)$/i.test(wordBefore)) continue

        errors.push(
          `Missing space before slash (e.g. "Word/ Word"): "${match[0]}"`
        )
        break
      }

      // C. Double slash separated by spaces: "/ /"
      if (/\/\s+\//.test(lineForChecks)) {
        errors.push('Double slash with spaces detected (e.g. "/ /")')
      }
    }

    // Check 9: Adjacent links without separator (e.g. "Text [Link]" instead of "Text / [Link]")
    const FILES_TO_IGNORE_LINK_SEPARATOR_CHECK = [
      'docs/beginners-guide.md',
      'docs/unsafe.md'
    ]

    if (
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

        // Ignore if line starts with valid list marker followed immediately by this link
        // e.g. "* [Link]" or "- [Link]" or "1. [Link]"
        if (/^\s*([*+-]|\d+\.)\s*$/.test(preceding)) continue
        // Ignore if Starred item "* ⭐ [Link]"
        if (/^\s*[*+-]\s+⭐\s*$/.test(preceding)) continue
        // Ignore if link is preceded by bold/italic markers only (start of line)
        if (/^\s*[*+-]\s+[*_]+\s*$/.test(preceding)) continue

        const trimmedPreceding = preceding.trimEnd()
        if (trimmedPreceding.length === 0) continue

        // Check last character
        const lastChar = trimmedPreceding.slice(-1)
        // Allowed: separators, openers, end of sentences
        // ! for images (![Alt]), * for bold, ( for parens, etc.
        const allowedChars = [
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
          '+',
          '#',
          '►',
          '▷'
        ]
        if (allowedChars.includes(lastChar)) continue

        // Check for allowed functional words (prepositions, conjunctions, determiners, etc.)
        // to avoid flagging sentences like "Try a [VPN]" or "Use [Adblock]"
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
          // OS / platform / browser qualifiers that commonly precede [Guide], [GitHub], etc.
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
        const wordRegex = new RegExp(
          `(^|[^a-zA-Z0-9])(${allowedWords.join('|')})$`,
          'i'
        )
        if (wordRegex.test(trimmedPreceding)) continue

        errors.push(
          `Missing separator before link (expected "/", "or", ",", etc): "...${preceding.slice(-10)}[${match[1]}]..."`
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

        // Split by " / " (slash surrounded by spaces) to avoid matching paths (/bin), w/ (w/ acc), TCP/IP
        // This assumes standard formatting (Check 8 enforces spaces)
        const parts = block.split(/\s+\/\s+/)
        if (parts.length < 2) return

        const seenDescriptions = new Set()
        parts.forEach((part) => {
          let desc = part.trim()
          desc = desc.replace(/^[\s\-\*⭐]+/, '').replace(/[\s\-\*⭐]+$/, '')

          if (!desc) return

          const checkDesc = desc.toLowerCase()
          if (seenDescriptions.has(checkDesc)) {
            errors.push(`Duplicate description detected: "${desc}"`)
          } else {
            seenDescriptions.add(checkDesc)
          }
        })
      })
    }

    // Check 14: Link Label Mismatch
    // Ensures that labels like "Subreddit", "GitHub", "Discord", etc. point to the correct domain
    const linkMatchRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
    let lm
    while ((lm = linkMatchRegex.exec(line)) !== null) {
      const label = lm[1].toLowerCase()
      const url = lm[2].toLowerCase()

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
        { key: 'lemmy', domains: ['lemmy.', 'fediverse.', 'sh.itjust.works'] },
        { key: 'instagram', domains: ['instagram.com'] },
        { key: 'facebook', domains: ['facebook.com'] },
        { key: 'bluesky', domains: ['bsky.app'] },
        { key: 'mastodon', domains: ['mastodon.social', 'apps.apple.com'] }
      ]

      const trimmedLabel = lm[1].trim().toLowerCase()

      for (const check of checks) {
        // Exact match check for keywords to avoid flagging descriptive names like "GitHub Dorks"
        // Also allow "r/" prefix check separately
        if (trimmedLabel === check.key) {
          if (!check.domains.some((d) => url.includes(d))) {
            // Allow some custom domains/redirects if they contain the keyword in the URL path
            if (!url.includes(check.key)) {
              errors.push(
                `Link label mismatch: Label "${lm[1]}" points to non-${check.key} domain: ${lm[2]}`
              )
            }
          }
        }
      }

      // Special check for "r/" prefix (e.g. [r/OpenAI]) - ONLY if it's the full label
      if (/^r\/[a-zA-Z0-9_]+$/.test(trimmedLabel)) {
        if (!url.includes('reddit.com')) {
          errors.push(
            `Link label mismatch: Subreddit label "${lm[1]}" points to non-reddit domain: ${lm[2]}`
          )
        }
      }

      // Special check for "X" label (social media)
      if (
        trimmedLabel === 'x' &&
        !url.includes('x.com') &&
        !url.includes('twitter.com') &&
        !url.includes('t.co')
      ) {
        errors.push(
          `Link label mismatch: Label "X" points to non-X/Twitter domain: ${lm[2]}`
        )
      }
    }

    // Check 10, 11, 12: English-specific checks (Repeated words, Typos, Grammar)
    if (!isSeparatedEnglishCheck) {
      // Prepare clean line for text-based checks (remove URLs and Markdown links)
      // Remove entire link block: [Text](Url) -> "__LINK__" to avoid merging adjacent words
      const lineCleaned = line
        .replace(/https?:\/\/[^\s)]+/g, '')
        .replace(/\[[^\]]+\]\([^)]*\)/g, '__LINK__')

      // Check 10: Repeated words (e.g. "the the")
      const repeatedWordMatch = lineCleaned.match(/\b([a-zA-Z]+)\s+\1\b/i)
      if (repeatedWordMatch) {
        const word = repeatedWordMatch[1].toLowerCase()
        // Allow specific repeated words
        if (!['puyo', 'duran', 'agar', 'hocus'].includes(word)) {
          errors.push(`Repeated word detected: "${repeatedWordMatch[0]}"`)
        }
      }

      // Check 11: Common Typos (curated hardcoded list)
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
        availalbe: 'available'
      }
      for (const [typo, correction] of Object.entries(commonTypos)) {
        const typoRegex = new RegExp(`\\b${typo}\\b`, 'i')
        if (typoRegex.test(lineCleaned)) {
          errors.push(`Possible typo: "${typo}" (should be "${correction}")`)
        }
      }

      // Check 12: Basic A/An Grammar
      const aAnMatch = line.match(/\b(a)\s+([aeio]\w+)/i)
      if (aAnMatch) {
        const word = aAnMatch[2].toLowerCase()
        if (word !== 'one') {
          errors.push(
            `Incorrect article "a" usage: "${aAnMatch[0]}" (should be "an")`
          )
        }
      }

      const anAMatch = line.match(
        /\b(an)\s+([bcdfVkLmMnNpPqQrRsStTvVwWxXyYzZ]\w+)/i
      )
      if (anAMatch) {
        const word = anAMatch[2]
        const isAcronym = /^[A-Z0-9]+$/.test(word)
        if (!isAcronym) {
          errors.push(
            `Incorrect article "an" usage: "${anAMatch[0]}" (should be "a")`
          )
        }
      }
    }

    if (errors.length > 0) {
      hasErrors = true
      errors.forEach((err) => {
        // file:line - Error (in red/cyan)
        console.log(
          `\x1b[36m${relativePath}:${lineNum}\x1b[0m - \x1b[31m${err}\x1b[0m`
        )
        // Source line (dimmed)
        console.log(`  \x1b[90m${line.trim()}\x1b[0m`)
      })
    }
  })
})

// Check 15: Platform icon link with the wrong text (casing / synonym)
// Run as a dedicated pass because its scope is the set of files where the
// build-time icon transform actually runs (docs/.vitepress/transformer.ts ->
// transformsPlugin / transformLinks) — a wrong label is only a silent failure
// where an icon would otherwise render. That set is deliberately DIFFERENT
// from FILES_TO_IGNORE (which governs the text/English checks above):
//   • beginners-guide.md and storage.md are NOT checked: the transformer
//     early-returns for them (transformGuide / raw contents) before
//     transformLinks, so no platform icon ever renders there.
//   • recently-removed.md is NOT checked: it is a generated, gitignored
//     artifact (see .gitignore). Its entries are copied from real content
//     pages that this check already lints while they are live, so linting the
//     generated copy is redundant, non-actionable (regenerated on build), and
//     would make results depend on whether the file has been generated yet.
// Scope mirrors transformsPlugin's filter: a depth-1 docs/*.md (the routed,
// authored content pages — no content pages live in subdirectories), whose
// basename is not in the transformer's `excluded` list and whose path is not
// under posts/ or other/. ICON_LINK_RULES and matchesPlatformDomain are
// defined at the top of this file.
const ICON_TRANSFORM_SKIP = new Set([
  'readme.md',
  'feedback.md',
  'index.md',
  'sandbox.md',
  'startpage.md',
  'beginners-guide.md',
  'storage.md',
  'recently-removed.md'
])

function iconTransformApplies(normalizedPath) {
  const base = normalizedPath.split('/').pop()
  if (!base.endsWith('.md')) return false
  if (normalizedPath.includes('posts') || normalizedPath.includes('other'))
    return false
  return !ICON_TRANSFORM_SKIP.has(base)
}

files.forEach((file) => {
  const relativePath = path.relative(process.cwd(), file)
  const normalizedPath = relativePath.replace(/\\/g, '/')
  if (!iconTransformApplies(normalizedPath)) return

  const iconLines = fs.readFileSync(file, 'utf-8').split('\n')
  let inIconCodeBlock = false

  iconLines.forEach((rawLine, index) => {
    const lineNum = index + 1
    // Strip zero-width / invisible joiner chars (same as the main loop)
    const line = rawLine.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')

    // Skip fenced code blocks so a link inside ``` is never flagged
    if (/^\s*```/.test(line)) {
      inIconCodeBlock = !inIconCodeBlock
      return
    }
    if (inIconCodeBlock) return

    // Strip inline code so a link inside backticks (e.g. `[Github](url)`) is
    // never flagged. Precision over recall: a bad-casing label on a custom or
    // redirect domain (e.g. [Github](https://my-mirror.io)) is a real but rare
    // failure we intentionally skip to guarantee zero false positives — only
    // links pointing at the platform's own host are checked.
    const iconCleanLine = line.replace(/`[^`]+`/g, ' ')
    const iconLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
    let iconMatch
    while ((iconMatch = iconLinkRegex.exec(iconCleanLine)) !== null) {
      const iconLabel = iconMatch[1].trim()
      const iconLabelLower = iconLabel.toLowerCase()
      const iconUrl = iconMatch[2]
      for (const rule of ICON_LINK_RULES) {
        const triggers = [rule.canonical.toLowerCase(), ...(rule.aliases || [])]
        if (!triggers.includes(iconLabelLower)) continue
        if (iconLabel === rule.canonical) continue // already correct, renders fine
        if (!rule.domains.some((d) => matchesPlatformDomain(iconUrl, d)))
          continue
        hasErrors = true
        console.log(
          `\x1b[36m${relativePath}:${lineNum}\x1b[0m - \x1b[31mPlatform icon won't render: label "${iconLabel}" should be exactly "${rule.canonical}": ${iconUrl}\x1b[0m`
        )
        console.log(`  \x1b[90m${line.trim()}\x1b[0m`)
        break
      }
    }
  })
})

if (!hasErrors) {
  console.log('✅ No formatting issues found.')
} else {
  // console.log('\n❌ Issues found. Please review.');
  process.exit(1)
}
