import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import * as nodeModule from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { after, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  createMarkdownRenderer,
  disposeMdItInstance,
  resolveConfig
} from 'vitepress'

const baseUrl = process.env.GITHUB_ACTIONS ? '/edit' : '/'
const base = process.env.GITHUB_ACTIONS ? '/edit' : ''

async function createRenderer() {
  // Fast path: load only the markdown plugins instead of resolving the full
  // Vite/UnoCSS/PWA config (~330ms vs ~1.9s). Falls back on older Node 22.x.
  if (typeof nodeModule.registerHooks === 'function') {
    nodeModule.registerHooks({
      resolve(specifier, context, nextResolve) {
        if (
          (specifier.startsWith('./') || specifier.startsWith('../')) &&
          context.parentURL?.startsWith('file://') &&
          !context.parentURL.includes('/node_modules/')
        ) {
          const parentDir = path.dirname(fileURLToPath(context.parentURL))
          const candidate = path.resolve(parentDir, `${specifier}.ts`)
          if (existsSync(candidate)) {
            return { shortCircuit: true, url: pathToFileURL(candidate).href }
          }
        }
        return nextResolve(specifier, context)
      }
    })

    const [{ localLinksPlugin }, { replaceNoteLink }] = await Promise.all([
      import('../docs/.vitepress/markdown/localLinks.ts'),
      import('../docs/.vitepress/utils/markdown.ts')
    ])

    return createMarkdownRenderer(
      'docs',
      {
        config(md) {
          md.use(localLinksPlugin, baseUrl)
          replaceNoteLink(md)
        }
      },
      baseUrl
    )
  }

  const config = await resolveConfig('docs')
  return createMarkdownRenderer(
    config.srcDir,
    config.markdown,
    config.site.base
  )
}

const md = await createRenderer()
const render = (source, env = {}) =>
  md.render(source, { cleanUrls: true, ...env })

after(() => disposeMdItInstance())

test('wiki section links stay on the mirror without external-link attributes', () => {
  for (const [label, url, path] of [
    [
      'Recommended Browsers',
      'https://fmhy.net/beginners-guide#browsers',
      '/beginners-guide#browsers'
    ],
    ['Unsafe Sites', 'https://fmhy.net/unsafe', '/unsafe']
  ]) {
    assert.equal(
      render(`[${label}](${url})`),
      `<p><a href="${base}${path}">${label}</a></p>\n`
    )
  }
})

test('URL queries, fragments and raw Markdown exports are preserved', () => {
  for (const [url, path] of [
    ['https://fmhy.net', '/'],
    ['https://fmhy.net/?q=one+two#top', '/?q=one+two#top'],
    ['https://fmhy.net?x=1&y=2#top', '/?x=1&amp;y=2#top'],
    ['https://fmhy.net#top', '/#top']
  ]) {
    assert.equal(
      render(`[link](${url})`),
      `<p><a href="${base}${path}">link</a></p>\n`
    )
  }
})

test('raw Markdown exports use native navigation rather than the page router', () => {
  const html = render('[Raw Markdown](https://fmhy.net/single-page.md)')
  // VitePress intercepts .md URLs unless the anchor has target or download.
  assert.equal(
    html,
    `<p><a href="${base}/single-page.md" target="_self">Raw Markdown</a></p>\n`
  )
})

test('separate services and unrelated hosts keep their external URLs', () => {
  for (const url of [
    'https://searx.fmhy.net/',
    'https://api.fmhy.net/single-page',
    'https://github.com/fmhy/edit',
    'https://fmhy.net.example.org/audio',
    'https://fmhy.net@evil.example/audio',
    'https://fmhy.net//example.org/audio'
  ]) {
    const html = render(`[external](${url})`)
    assert.ok(html.includes(`href="${url}"`), html)
    assert.ok(html.includes('target="_blank"'), html)
  }
})

test('existing local links, email links, images and code are unchanged', () => {
  assert.equal(
    render('[email](mailto:hello@example.org)'),
    '<p><a href="mailto:hello@example.org" target="_blank" rel="noreferrer">email</a></p>\n'
  )
  assert.ok(
    render('![image](https://fmhy.net/fmhy.ico)').includes(
      'src="https://fmhy.net/fmhy.ico"'
    )
  )
})

test('monthly update posts use the same link handling as wiki pages', () => {
  const html = render(readFileSync('docs/posts/nov-2026.md', 'utf8'))
  assert.ok(html.includes(`href="${base}/image-tools#image-viewers"`))
  assert.doesNotMatch(html, /href="https?:\/\/fmhy\.net(?:[/?#"])/i)
})

test('links inside note tooltips stay on the mirror too', () => {
  const criticalHtml = render('[Note](.vitepress/notes/dodi-critical.md)')
  assert.ok(criticalHtml.includes('<CriticalBadge'), criticalHtml)
  assert.ok(
    criticalHtml.includes(`href="${base}/privacy#adblocking"`),
    criticalHtml
  )
  assert.doesNotMatch(criticalHtml, /href="https?:\/\/fmhy\.net(?:[/?#"])/i)

  const tooltipHtml = render('[Note](.vitepress/notes/soft98-note.md)')
  assert.ok(tooltipHtml.includes('<Tooltip'), tooltipHtml)
  assert.ok(
    tooltipHtml.includes(`href="${base}/internet-tools#userscripts"`),
    tooltipHtml
  )
  assert.doesNotMatch(tooltipHtml, /href="https?:\/\/fmhy\.net(?:[/?#"])/i)
})

test('backups.md keeps explicit fmhy.net links external while keeping other internal links on the mirror', () => {
  const html = render(readFileSync('docs/other/backups.md', 'utf8'), {
    relativePath: 'other/backups.md'
  })
  assert.ok(html.includes('href="https://fmhy.net/"'), html)
  assert.ok(html.includes('href="https://fmhy.net/other/backups"'), html)
  assert.ok(html.includes(`href="${base}/other/selfhosting"`), html)
  assert.ok(html.includes(`href="${base}/single-page.md"`), html)
})

test('search.md keeps Search Page Backups on fmhy.net while keeping search/raw links on the mirror', () => {
  const html = render(readFileSync('docs/posts/search.md', 'utf8'), {
    relativePath: 'posts/search.md'
  })
  assert.ok(html.includes('href="https://fmhy.net/posts/search"'), html)
  assert.ok(html.includes(`href="${base}/"`), html)
  assert.ok(html.includes(`href="${base}/single-page.md"`), html)
})
