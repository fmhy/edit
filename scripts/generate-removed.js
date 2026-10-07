import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createMarkdownRenderer } from 'vitepress'
import headers from '../docs/.vitepress/transformer/headers.json' with { type: 'json' }

const DAYS = 30
const OUTPUT_FILE = 'docs/recently-removed.md'

const IGNORED_FILES = [
  'docs/posts.md',
  'docs/unsafe.md',
  'docs/sandbox.md',
  'docs/feedback.md',
  'docs/index.md',
  'docs/startpage.md',
  'docs/single-page.md',
  'docs/public/single-page.md',
  OUTPUT_FILE
]

const IGNORED_DIRS = ['docs/posts/', 'docs/.vitepress/']

function isIgnored(file) {
  return (
    !file ||
    !file.endsWith('.md') ||
    IGNORED_FILES.includes(file) ||
    IGNORED_DIRS.some((dir) => file.startsWith(dir))
  )
}

function getAllDocFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.some((d) => `${child}/`.startsWith(d))) continue
      results.push(...getAllDocFiles(child))
    } else if (entry.name.endsWith('.md') && !isIgnored(child)) {
      results.push(child)
    }
  }
  return results
}

function normalizeName(name) {
  return name
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function categoryForFile(file) {
  const name = file.replace(/^docs\//, '')
  return (
    headers[name]?.title ||
    name
      .replace(/\.md$/, '')
      .split('/')
      .map((part) =>
        part
          .split('-')
          .map((word) => word[0].toUpperCase() + word.slice(1))
          .join(' ')
      )
      .join(' / ')
  )
}

function normalizeUrl(value) {
  try {
    const url = new URL(value)
    if (url.pathname !== '/')
      url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    return url.href
  } catch {
    return value
  }
}

function extractUrls(text) {
  const urls = new Set()
  const withoutLinks = text
  for (const match of withoutLinks.matchAll(/https?:\/\/[^\s<>"`]+/g)) {
    let url = match[0]
    const angleWrapped =
      withoutLinks[match.index - 1] === '<' &&
      withoutLinks[match.index + url.length] === '>'
    if (!angleWrapped) {
      let parentheses = [...url].reduce(
        (balance, char) => balance + (char === '(' ? 1 : char === ')' ? -1 : 0),
        0
      )
      while (/[),.;]$/.test(url)) {
        if (url.endsWith(')')) {
          if (parentheses >= 0) break
          parentheses++
        }
        url = url.slice(0, -1)
      }
    }
    urls.add(normalizeUrl(url))
  }
  return urls
}

function resourceKey(link) {
  return `${normalizeName(link.name)}\0${link.url}`
}

function extractResources(text, links, knownResources = new Set()) {
  if (!/^\s*[*+-]\s+/.test(text) || /^\s*[*+-]\s+↪/.test(text)) {
    return { resources: [], description: '' }
  }
  if (!links.length) return { resources: [], description: '' }

  // The description separator must be outside a link's label or destination.
  let descriptionIndex = text.length
  let end = 0
  for (const link of [...links, { index: text.length, end: text.length }]) {
    const separator = text.slice(end, link.index).match(/\s+[-–—]\s+/)
    if (separator) {
      descriptionIndex = end + separator.index
      break
    }
    end = link.end
  }

  const resources = links.filter((link, index) => {
    if (
      link.index >= descriptionIndex ||
      !normalizeName(link.name) ||
      /^https?:\/\/\S+$/i.test(normalizeName(link.name))
    )
      return false
    if (index === 0 || knownResources.has(resourceKey(link))) return true
    if (/^\d+$/.test(normalizeName(link.name))) return false

    const previous = links[index - 1]
    const separator = text.slice(previous.end, link.index)
    // Slashes usually introduce supporting links, except between bold peers.
    const boldPeers =
      text.slice(previous.index - 2, previous.index) === '**' &&
      /^\*\*\s+\/\s+\*\*$/.test(separator) &&
      text.slice(link.end, link.end + 2) === '**'
    return (
      boldPeers ||
      /^[\s*_]+$/.test(separator) ||
      /^[\s*_]*(?:\([^)]*\)\s*)?(?:,\s*(?:or\s+)?|or\s+)[\s*_]*$/.test(
        separator
      )
    )
  })
  let description = text.slice(descriptionIndex).trim()
  if (descriptionIndex === text.length) {
    // Keep metadata between links as well as after the last link, while
    // excluding peer names and their separators from the shared description.
    const peers = new Set(resources.map((link) => link.index))
    let end = links[0].end
    for (const link of links.slice(1)) {
      const gap = text.slice(end, link.index)
      if (!peers.has(link.index) || !/^[\s*_,/]*(?:or)?[\s*_]*$/.test(gap)) {
        description += gap.replace(/\*\*/g, '')
      }
      if (!peers.has(link.index)) description += link.name
      end = link.end
    }
    description += text.slice(end).replace(/^\*+/, '')
    description = description.trim()
  }
  return { resources, description }
}

function extractHtmlUrls(markdown, html) {
  const urls = new Set()
  const visible = html.replace(/<!--[\s\S]*?-->/g, '')
  for (const match of visible.matchAll(
    /<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi
  )) {
    const value = markdown.utils.unescapeAll(match[1] ?? match[2] ?? match[3])
    if (/^https?:\/\//i.test(value)) urls.add(normalizeUrl(value))
  }
  return urls
}

const parsedInlines = new WeakMap()

function parseInlineLinks(markdown, children) {
  if (parsedInlines.has(children)) return parsedInlines.get(children)
  const urls = new Set()
  let text = '* '
  const links = []
  let link = null
  for (const child of children) {
    if (child.type === 'link_open') {
      link = { name: '', url: child.attrGet('href'), index: text.length }
    } else if (child.type === 'link_close') {
      if (/^https?:\/\//i.test(link.url)) {
        link.url = normalizeUrl(link.url)
        link.end = text.length
        links.push(link)
        urls.add(link.url)
      }
      link = null
    } else if (child.type === 'text' || child.type === 'code_inline') {
      text += child.content
      if (link) link.name += child.content
      else if (child.type === 'text') {
        for (const url of extractUrls(child.content)) urls.add(url)
      }
    } else if (child.type === 'image') {
      if (link) {
        const alt = child.children
          ? child.children
              .filter(
                (token) => token.type === 'text' || token.type === 'code_inline'
              )
              .map((token) => token.content)
              .join('')
          : child.content || child.attrGet('alt') || ''
        text += alt
        link.name += alt
      }
    } else if (child.type === 'html_inline') {
      for (const url of extractHtmlUrls(markdown, child.content)) urls.add(url)
    } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
      text += ' '
      if (link) link.name += ' '
    } else if (!link && /^(strong|em)_(open|close)$/.test(child.type)) {
      text += child.type.startsWith('strong') ? '**' : '_'
    }
  }
  const result = { text, links, urls }
  parsedInlines.set(children, result)
  return result
}

function parseDocument(markdown, source) {
  const urls = new Set()
  const bullets = []
  const headings = []
  const lines = source.split('\n')
  const hasAttributes =
    source.includes('{') || markdown.utils.unescapeAll(source).includes('{')
  markdown.core.ruler[hasAttributes ? 'enable' : 'disable']('curly_attributes')
  const tokens = markdown.parse(source, { cacheInline: !hasAttributes })
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.type === 'heading_open') {
      const heading = tokens[index + 1]
      const level = Number(token.tag.slice(1))
      const title = (heading?.children || [])
        .filter((child) =>
          ['text', 'code_inline', 'image'].includes(child.type)
        )
        .map((child) => child.content)
        .join('')
        .replace(/^[►▷\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim()
      headings[level - 1] = title
      headings.length = level
    }
    if (token.type === 'html_block') {
      for (const url of extractHtmlUrls(markdown, token.content)) urls.add(url)
    }
    if (token.type !== 'inline') continue
    const {
      text,
      links,
      urls: inlineUrls
    } = parseInlineLinks(markdown, token.children)
    for (const url of inlineUrls) urls.add(url)
    const [start, end] = token.map
    if (/^\s*[*+-]\s+/.test(lines[start])) {
      bullets.push({
        text,
        links,
        section: headings.filter(Boolean),
        lineNum: start + 1,
        endLine: end,
        source: token.content
      })
    }
  }
  return { urls, bullets }
}

function cacheInlineTokens(markdown) {
  const cache = new Map()
  markdown.core.ruler.before('inline', 'reuse_removed_inlines', (state) => {
    if (!state.env.cacheInline) return
    const references = JSON.stringify(state.env.references || {})
    for (let index = 0; index < state.tokens.length; index++) {
      const token = state.tokens[index]
      // Attribute processing can depend on neighboring blocks. Reuse tokens
      // only when that processing is disabled for the entire document.
      if (token.type !== 'inline') continue
      const key = `${references}\0${token.content}`
      token.removedCacheKey = key
      if (cache.has(key)) {
        token.type = 'removed_cached_inline'
        token.children = cache.get(key)
      }
    }
  })
  markdown.core.ruler.push('save_removed_inlines', (state) => {
    for (const token of state.tokens) {
      if (token.type === 'removed_cached_inline') token.type = 'inline'
      else if (token.removedCacheKey !== undefined) {
        if (cache.size >= 50000) cache.clear()
        cache.set(token.removedCacheKey, token.children)
      }
    }
  })
}

async function generateRemovedSites() {
  console.log(`Generating recently removed sites from the last ${DAYS} days...`)
  console.log(`Current working directory: ${process.cwd()}`)

  // Verify docs directory exists
  if (!fs.existsSync('docs')) {
    console.error(
      'Error: "docs" directory not found in the current working directory.'
    )
    return
  }

  let gitDirArgs = []
  let historyHead = 'HEAD'
  // Check if it's a shallow clone (common in Cloudflare/CI)
  const isShallow =
    fs.existsSync('.git/shallow') || fs.existsSync('.git-temp/shallow')

  if (isShallow) {
    console.log(
      'Shallow clone detected. Fetching history for the last 30 days...'
    )
    try {
      const head = execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8'
      }).trim()
      execFileSync('git', [
        'fetch',
        `--shallow-since=${DAYS + 1} days ago`,
        '--no-tags',
        'origin',
        head
      ])
    } catch (e) {
      console.warn(
        'Warning: Failed to fetch required history. Results may be incomplete.'
      )
    }
  }

  // Check if .git directory exists. If not, try to bootstrap it for the build
  if (!fs.existsSync('.git')) {
    console.log(
      'No .git directory found. Attempting to fetch temporary history for generation...'
    )
    try {
      const REPO_URL = 'https://github.com/fmhy/edit.git'
      const TEMP_GIT_DIR = '.git-temp'

      // Clean up any old temp dir
      if (fs.existsSync(TEMP_GIT_DIR))
        fs.rmSync(TEMP_GIT_DIR, { recursive: true, force: true })

      // Include blobs for historical document snapshots; limit the history window.
      execFileSync('git', [
        'clone',
        '--bare',
        `--shallow-since=${DAYS + 1} days ago`,
        REPO_URL,
        TEMP_GIT_DIR
      ])
      gitDirArgs = [`--git-dir=${TEMP_GIT_DIR}`]
      const pagesCommit = process.env.CF_PAGES_COMMIT_SHA
      if (pagesCommit) {
        if (!/^[a-f0-9]{40,64}$/i.test(pagesCommit))
          throw new Error('Invalid CF_PAGES_COMMIT_SHA')
        try {
          execFileSync('git', [...gitDirArgs, 'cat-file', '-e', pagesCommit], {
            stdio: 'ignore'
          })
        } catch {
          // Preview deployments can point to a commit outside the default branch.
          execFileSync('git', [
            ...gitDirArgs,
            'fetch',
            `--shallow-since=${DAYS + 1} days ago`,
            '--no-tags',
            'origin',
            pagesCommit
          ])
        }
        historyHead = pagesCommit
      }
      console.log('Temporary history fetched successfully.')
    } catch (e) {
      console.warn(
        'Warning: Failed to fetch temporary Git history. Skipping generation.'
      )
      return
    }
  }

  // Mark /app safe for git (Docker UID mismatch). Only inside the container,
  // not on every local build, to avoid polluting the global gitconfig.
  if (process.cwd() === '/app') {
    try {
      execFileSync('git', [
        ...gitDirArgs,
        'config',
        '--global',
        '--add',
        'safe.directory',
        '/app'
      ])
    } catch (e) {
      // Ignore error if it fails
    }
  }

  try {
    const shallow =
      execFileSync(
        'git',
        [...gitDirArgs, 'rev-parse', '--is-shallow-repository'],
        { encoding: 'utf8' }
      ).trim() === 'true'
    if (shallow) {
      const head = execFileSync(
        'git',
        [...gitDirArgs, 'rev-parse', historyHead],
        {
          encoding: 'utf8'
        }
      ).trim()
      let previousBoundary = ''
      let deepen = 1
      // Shallow roots hide their parents from revision traversal, even when a
      // removal falls inside the window. Inspect the original commit headers.
      for (;;) {
        const roots = execFileSync(
          'git',
          [
            ...gitDirArgs,
            'rev-list',
            '--first-parent',
            '--max-parents=0',
            `--since-as-filter=${DAYS} days ago`,
            historyHead
          ],
          { encoding: 'utf8' }
        )
          .trim()
          .split('\n')
          .filter(Boolean)
        const boundaries = roots
          .filter((root) => {
            const commit = execFileSync(
              'git',
              [...gitDirArgs, 'cat-file', '-p', root],
              { encoding: 'utf8' }
            )
            return /^parent [a-f0-9]+$/m.test(commit.split('\n\n')[0])
          })
          .join(' ')
        if (!boundaries) break
        if (boundaries === previousBoundary)
          throw new Error(
            'History deepening did not advance the shallow boundary.'
          )
        previousBoundary = boundaries
        execFileSync('git', [
          ...gitDirArgs,
          'fetch',
          `--deepen=${deepen}`,
          '--no-tags',
          'origin',
          head
        ])
        deepen *= 2
      }
    }
  } catch {
    console.warn(
      'Warning: Failed to fetch boundary parents. Results may be incomplete.'
    )
  }

  const markdown = await createMarkdownRenderer('docs')
  markdown.core.ruler.disable('anchor')
  cacheInlineTokens(markdown)
  const currentUrls = new Set()
  const knownResources = new Set()
  const removedSites = []
  const parsedBlobs = new Map()
  const historyResources = new Set()
  const emptyDocument = { urls: new Set(), bullets: [] }

  function rememberResources(document, historical = false) {
    for (const bullet of document.bullets) {
      for (const resource of extractResources(bullet.text, bullet.links)
        .resources) {
        const key = resourceKey(resource)
        knownResources.add(key)
        if (historical) historyResources.add(key)
      }
    }
    return document
  }

  for (const file of getAllDocFiles('docs')) {
    const document = rememberResources(
      parseDocument(markdown, fs.readFileSync(file, 'utf8'))
    )
    for (const url of document.urls) currentUrls.add(url)
  }

  function readDocument(blob, file) {
    if (!blob || /^0+$/.test(blob) || isIgnored(file)) return emptyDocument
    if (!parsedBlobs.has(blob)) {
      if (parsedBlobs.size >= 128) parsedBlobs.clear()
      const source = execFileSync(
        'git',
        [...gitDirArgs, 'cat-file', 'blob', blob],
        {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        }
      )
      parsedBlobs.set(
        blob,
        rememberResources(parseDocument(markdown, source), true)
      )
    }
    return parsedBlobs.get(blob)
  }

  const logOutput = execFileSync('git', [
    ...gitDirArgs,
    'log',
    '-z',
    '--first-parent',
    `--since-as-filter=${DAYS} days ago`,
    '--format=%H%x00%P%x00%s%x00%ct',
    historyHead,
    '--',
    'docs/'
  ]).toString()
  const cacheFile = 'docs/.vitepress/cache/removed-sites.json'
  const cacheKey = crypto
    .createHash('sha256')
    .update(fs.readFileSync(new URL(import.meta.url)))
    .update(
      fs.readFileSync(new URL(import.meta.resolve('vitepress/package.json')))
    )
    .update(logOutput)
    .digest('hex')
  let commits
  try {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    if (cached.key === cacheKey) {
      commits = cached.commits.map((commit) => ({
        ...commit,
        changes: commit.changes.map((change) => ({
          ...change,
          removedUrls: new Set(change.removedUrls),
          addedUrls: new Set(change.addedUrls)
        }))
      }))
      for (const key of cached.resources) knownResources.add(key)
    }
  } catch {
    // A missing or obsolete cache only costs a history scan.
  }

  if (!commits) {
    commits = []
    const fields = logOutput.split('\0')
    for (let index = 0; index + 3 < fields.length; index += 4) {
      const hash = fields[index]
      const parent = fields[index + 1].split(' ')[0]
      const msg = fields[index + 2]
      const date = new Date(Number(fields[index + 3]) * 1000)
        .toISOString()
        .slice(0, 10)
      if (!hash) continue
      const diff = execFileSync(
        'git',
        [
          ...gitDirArgs,
          'diff-tree',
          '--no-commit-id',
          '--raw',
          '-z',
          '-r',
          '--root',
          '--no-renames',
          '--no-abbrev',
          '--no-ext-diff',
          '--no-textconv',
          ...(parent ? [parent, hash] : [hash]),
          '--',
          'docs/'
        ],
        { maxBuffer: 10 * 1024 * 1024 }
      ).toString('utf8')
      const changes = []
      const records = diff.split('\0')
      for (let offset = 0; offset + 1 < records.length; offset += 2) {
        const match = records[offset].match(
          /^:[0-7]{6} [0-7]{6} ([a-f0-9]+) ([a-f0-9]+) [A-Z]$/
        )
        if (!match)
          throw new Error(`Unexpected Git diff record: ${records[offset]}`)
        const file = records[offset + 1]
        if (isIgnored(file)) continue
        const before = readDocument(match[1], file)
        const after = readDocument(match[2], file)
        const removedUrls = new Set(
          [...before.urls].filter((url) => !after.urls.has(url))
        )
        const addedUrls = new Set(
          [...after.urls].filter((url) => !before.urls.has(url))
        )
        changes.push({
          file,
          removedUrls,
          addedUrls,
          removedBullets: before.bullets.filter((bullet) =>
            bullet.links.some((link) => removedUrls.has(link.url))
          ),
          addedBullets: after.bullets.filter((bullet) =>
            bullet.links.some((link) => addedUrls.has(link.url))
          )
        })
      }
      commits.push({ hash, msg, date, changes })
    }
    try {
      fs.mkdirSync('docs/.vitepress/cache', { recursive: true })
      const temporary = `${cacheFile}.${process.pid}.tmp`
      fs.writeFileSync(
        temporary,
        JSON.stringify(
          { key: cacheKey, resources: [...historyResources], commits },
          (_key, value) => (value instanceof Set ? [...value] : value)
        )
      )
      fs.renameSync(temporary, cacheFile)
    } catch {
      console.warn('Warning: Unable to save removed-sites history cache.')
    }
  }

  // Historical primary occurrences can establish ambiguous grouped peers.
  for (const { hash, msg, date, changes } of commits) {
    const addedUrls = new Set(
      changes.flatMap(({ addedUrls }) => [...addedUrls])
    )
    const removed = []
    const added = []
    for (const change of changes) {
      for (const bullet of change.removedBullets) {
        const { resources, description } = extractResources(
          bullet.text,
          bullet.links,
          knownResources
        )
        for (const resource of resources) {
          if (change.removedUrls.has(resource.url))
            removed.push({
              ...resource,
              description,
              file: change.file,
              section: bullet.section,
              lineNum: bullet.lineNum
            })
        }
      }
      for (const bullet of change.addedBullets) {
        const { resources, description } = extractResources(
          bullet.text,
          bullet.links,
          knownResources
        )
        for (const resource of resources) {
          if (change.addedUrls.has(resource.url))
            added.push({ ...resource, description })
        }
      }
    }

    const oldByName = new Map()
    const newByName = new Map()
    for (const item of removed) {
      if (addedUrls.has(item.url) || currentUrls.has(item.url)) continue
      const name = normalizeName(item.name)
      if (!oldByName.has(name)) oldByName.set(name, new Map())
      oldByName.get(name).set(resourceKey(item), item)
    }
    for (const item of added) {
      const name = normalizeName(item.name)
      if (!newByName.has(name)) newByName.set(name, new Map())
      newByName.get(name).set(resourceKey(item), item)
    }
    const updated = new Set()
    for (const [name, oldItems] of oldByName) {
      const newItems = newByName.get(name)
      if (!newItems) continue
      const usedNew = new Set()
      const oldValues = [...oldItems.values()]
      const newValues = [...newItems.values()]
      // Distinct descriptions can identify several URL changes with one name.
      for (const oldItem of oldValues) {
        const oldDescription = normalizeName(oldItem.description)
        const oldPeers = oldValues.filter(
          (item) => normalizeName(item.description) === oldDescription
        )
        const newPeers = newValues.filter(
          (item) => normalizeName(item.description) === oldDescription
        )
        if (oldPeers.length !== 1 || newPeers.length !== 1) continue
        updated.add(resourceKey(oldItem))
        usedNew.add(resourceKey(newPeers[0]))
      }
      const remainingOld = oldValues.filter(
        (item) => !updated.has(resourceKey(item))
      )
      const remainingNew = newValues.filter(
        (item) => !usedNew.has(resourceKey(item))
      )
      if (remainingOld.length !== 1 || remainingNew.length !== 1) continue
      const [oldItem] = remainingOld
      const [newItem] = remainingNew
      const oldDescription = normalizeName(oldItem.description)
      const newDescription = normalizeName(newItem.description)
      const sharedPrefix =
        oldDescription &&
        newDescription &&
        [',', ' /', ' -'].some(
          (separator) =>
            oldDescription.startsWith(newDescription + separator) ||
            newDescription.startsWith(oldDescription + separator)
        )
      if (
        sharedPrefix ||
        (oldItem.file === newItem.file && oldItem.lineNum === newItem.lineNum)
      )
        updated.add(resourceKey(oldItem))
    }
    for (const item of removed) {
      if (
        updated.has(resourceKey(item)) ||
        addedUrls.has(item.url) ||
        currentUrls.has(item.url)
      )
        continue
      const prMatch =
        msg.match(/\(#(\d+)\)/) || msg.match(/Merge pull request #(\d+)/)
      removedSites.push({
        name: item.name,
        description: item.description,
        url: item.url,
        file: item.file,
        section: item.section,
        lineNum: item.lineNum,
        hash,
        date,
        pr: prMatch ? prMatch[1] : null
      })
    }
  }

  // Deduplicate by resource URL (keep most recent)
  const uniqueRemoved = new Map()
  for (const site of removedSites) {
    if (!uniqueRemoved.has(site.url)) {
      uniqueRemoved.set(site.url, site)
    }
  }

  const sortedRemoved = Array.from(uniqueRemoved.values()).sort((a, b) =>
    b.date.localeCompare(a.date)
  )
  const byPage = new Map()
  for (const site of sortedRemoved) {
    const page = categoryForFile(site.file)
    if (!byPage.has(page)) byPage.set(page, new Map())
    const sections = byPage.get(page)
    const major = site.section[0] || 'Unsectioned'
    const minor = site.section.slice(1).join(' › ')
    if (!sections.has(major)) sections.set(major, new Map())
    const subsections = sections.get(major)
    if (!subsections.has(minor)) subsections.set(minor, [])
    subsections.get(minor).push(site)
  }

  const stripLinks = (text) =>
    text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/https?:\/\/[^\s)]+/g, '')
      .replace(/\s+/g, ' ')

  const escapeText = (text) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/[\\`*_[\]]/g, '\\$&')

  // Generate Markdown
  let output = ''
  output += `<!-- search-exclude -->\n`
  output += `This page lists sites that were removed from the wiki in the last ${DAYS} days. This helps you find sites that may have gone down or were moved.\n\n`
  output += `> [!TIP]\n`
  output += `> For more information about why a site was removed, feel free to join our [Discord](https://github.com/fmhy/FMHY/wiki/FMHY-Discord).\n`
  output += `<!-- /search-exclude -->\n\n`

  if (sortedRemoved.length === 0) {
    output += `No sites were removed in the last ${DAYS} days.\n`
  } else {
    for (const [page, sections] of [...byPage].sort(([a], [b]) =>
      a.localeCompare(b)
    )) {
      output += `## ${escapeText(page)}\n\n`
      for (const [section, subsections] of [...sections].sort(([a], [b]) =>
        a.localeCompare(b)
      )) {
        output += `### ${escapeText(section)}\n\n`
        for (const [subsection, sites] of [...subsections].sort(([a], [b]) =>
          a.localeCompare(b)
        )) {
          if (subsection) output += `#### ${escapeText(subsection)}\n\n`
          for (const site of sites) {
            const fileHash = crypto
              .createHash('sha256')
              .update(site.file)
              .digest('hex')
            const lineAnchor = site.lineNum ? `L${site.lineNum}` : ''
            const commitLink = `https://github.com/fmhy/edit/commit/${site.hash}#diff-${fileHash}${lineAnchor}`
            const prLink = site.pr
              ? `[PR #${site.pr}](https://github.com/fmhy/edit/pull/${site.pr}) · `
              : ''

            const cleanSearchable = escapeText(stripLinks(site.name).trim())
            const description = stripLinks(site.description || '')
              .trim()
              .replace(/^[-–—]\s*/, '')
            const cleanHidden = description
              ? `<span class="removed-site-description">- ${escapeText(description)}</span>`
              : ''

            output += `- <button type="button" class="removed-site-name" v-tooltip="{ content: () => $removedDateTooltip('${site.date}'), html: true, triggers: $removedDateTriggers, autoHide: true }">${cleanSearchable}</button><!-- search-exclude -->${cleanHidden}<span class="removed-site-meta">· ${prLink}[${site.hash.slice(0, 7)}](${commitLink})</span><!-- /search-exclude -->\n`
          }
          output += '\n'
        }
      }
    }
  }

  fs.writeFileSync(OUTPUT_FILE, output)
  console.log(
    `Successfully generated ${OUTPUT_FILE} with ${sortedRemoved.length} entries.`
  )

  // Cleanup temporary git dir
  if (gitDirArgs.length > 0) {
    try {
      const tempDir = gitDirArgs[0].split('=')[1]
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

try {
  await generateRemovedSites()
} catch (error) {
  console.error('Error generating removed sites:', error)
  process.exit(1)
}
