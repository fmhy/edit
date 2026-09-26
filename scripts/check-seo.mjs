import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const dist = resolve('docs/.vitepress/dist')
const failures = []

if (!existsSync(dist)) {
  console.error('Build output not found. Run pnpm docs:build first.')
  process.exit(1)
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const full = join(directory, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

function has(html, pattern) {
  return pattern.test(html)
}

for (const file of walk(dist).filter((file) => file.endsWith('.html'))) {
  const name = relative(dist, file)
  const html = readFileSync(file, 'utf8')
  const is404 = name === '404.html'
  const isSandbox = name === 'sandbox.html'

  if (is404 || isSandbox) {
    if (!has(html, /<meta[^>]+name=["']robots["'][^>]+noindex/i)) {
      failures.push(`${name}: missing noindex robots tag`)
    }
    continue
  }

  const checks = [
    [
      'canonical',
      /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/fmhy\.net\//i
    ],
    ['description', /<meta[^>]+name=["']description["'][^>]+content=/i],
    ['robots', /<meta[^>]+name=["']robots["'][^>]+content=/i],
    ['og:type', /<meta[^>]+property=["']og:type["'][^>]+content=/i],
    ['og:title', /<meta[^>]+property=["']og:title["'][^>]+content=/i],
    [
      'og:description',
      /<meta[^>]+property=["']og:description["'][^>]+content=/i
    ],
    ['og:url', /<meta[^>]+property=["']og:url["'][^>]+content=/i],
    ['og:image', /<meta[^>]+property=["']og:image["'][^>]+content=/i],
    [
      'twitter:card',
      /<meta[^>]+name=["']twitter:card["'][^>]+content=["']summary_large_image["']/i
    ],
    [
      'structured data',
      /<script[^>]+type=["']application\/ld\+json["'][^>]*data-seo=["']structured-data["']/i
    ]
  ]

  for (const [label, pattern] of checks) {
    if (!has(html, pattern)) failures.push(`${name}: missing ${label}`)
  }

  if (has(html, /<meta[^>]+name=["']keywords["']/i)) {
    failures.push(`${name}: obsolete meta keywords tag is still present`)
  }

  if (has(html, /<meta[^>]+name=["']og:/i)) {
    failures.push(`${name}: Open Graph tags must use property, not name`)
  }
}

const sitemap = join(dist, 'sitemap.xml')
if (!existsSync(sitemap)) {
  failures.push('sitemap.xml: missing')
} else {
  const xml = readFileSync(sitemap, 'utf8')
  if (xml.includes('https://fmhy.net/sandbox')) {
    failures.push('sitemap.xml: sandbox must not be listed')
  }
  for (const legacy of [
    '/audio-tools',
    '/miscguide',
    '/readingpiracyguide',
    '/toolsguide'
  ]) {
    if (xml.includes(`https://fmhy.net${legacy}`)) {
      failures.push(`sitemap.xml: legacy URL should not be listed: ${legacy}`)
    }
  }
}

const redirects = join(dist, '_redirects')
if (!existsSync(redirects)) {
  failures.push('_redirects: missing')
} else {
  const content = readFileSync(redirects, 'utf8')
  if (!content.includes('/audio-tools /audio#audio-tools 301')) {
    failures.push('_redirects: missing permanent /audio-tools redirect')
  }
}

const robots = join(dist, 'robots.txt')
if (!existsSync(robots)) {
  failures.push('robots.txt: missing')
} else {
  const content = readFileSync(robots, 'utf8')
  if (!content.includes('Sitemap: https://fmhy.net/sitemap.xml')) {
    failures.push('robots.txt: sitemap directive missing')
  }
  if (/Disallow:\s*\/assets\//i.test(content)) {
    failures.push('robots.txt: assets must remain crawlable')
  }
}

for (const failure of failures) console.error(`FAIL ${failure}`)

if (failures.length) {
  console.error(`SEO check failed with ${failures.length} issue(s).`)
  process.exit(1)
}

console.log('SEO check passed.')
