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

import type { HeadConfig, TransformContext } from 'vitepress'

const SITE_NAME = 'FMHY'
const BRAND_NAME = 'freemediaheckyeah'
const DEFAULT_DESCRIPTION =
  'FMHY is a community-curated directory of free websites, apps, tools and resources for streaming, gaming, reading, privacy, learning and more.'

const ORGANIZATION_ID = '#organization'
const WEBSITE_ID = '#website'

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function origin(hostname: string): string {
  return hostname.replace(/\/$/, '')
}

function pagePath(page: string): string {
  let value = page.replace(/\\/g, '/').replace(/^\/+/, '')
  value = value.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
  value = value.replace(/\/+$/, '')
  return value ? `/${value}` : '/'
}

function absoluteUrl(hostname: string, path: string): string {
  const site = origin(hostname)
  return path === '/' ? `${site}/` : `${site}${encodeURI(path)}`
}

function pageTitle(context: TransformContext): string {
  return (
    asString(context.pageData.title) ??
    asString(context.pageData.frontmatter.title) ??
    SITE_NAME
  )
}

function pageDescription(context: TransformContext): string {
  return (
    asString(context.pageData.frontmatter.description) ??
    asString(context.pageData.description) ??
    DEFAULT_DESCRIPTION
  )
}

function socialTitle(title: string): string {
  return title === SITE_NAME
    ? `${SITE_NAME} | ${BRAND_NAME}`
    : `${title} | ${SITE_NAME}`
}

function imageUrl(context: TransformContext, hostname: string, path: string) {
  const customImage = asString(context.pageData.frontmatter.image)

  if (customImage) {
    if (/^https?:\/\//i.test(customImage)) return customImage
    return `${origin(hostname)}/${customImage.replace(/^\/+/, '')}`
  }

  const imagePath =
    path === '/' ? '/__og_image__/og.webp' : `${path}/__og_image__/og.webp`
  return absoluteUrl(hostname, imagePath)
}

function dateValue(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }

  if (typeof value !== 'string' && typeof value !== 'number') return undefined

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function isNoindex(context: TransformContext): boolean {
  const { frontmatter } = context.pageData
  const robots = asString(frontmatter.robots)?.toLowerCase()

  return (
    context.pageData.isNotFound === true ||
    frontmatter.noindex === true ||
    robots?.split(',').some((value) => value.trim() === 'noindex') === true
  )
}

function breadcrumbSchema(
  hostname: string,
  path: string,
  title: string
): Record<string, unknown> | undefined {
  if (path === '/') return undefined

  const items: Record<string, unknown>[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: SITE_NAME,
      item: absoluteUrl(hostname, '/')
    }
  ]

  if (path.startsWith('/posts/')) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: 'Posts',
      item: absoluteUrl(hostname, '/posts')
    })
  }

  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: title,
    item: absoluteUrl(hostname, path)
  })

  return {
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(hostname, path)}#breadcrumb`,
    itemListElement: items
  }
}

function structuredData(
  context: TransformContext,
  hostname: string,
  path: string,
  title: string,
  description: string,
  image: string
) {
  const site = origin(hostname)
  const url = absoluteUrl(hostname, path)
  const organizationId = `${site}/${ORGANIZATION_ID}`
  const websiteId = `${site}/${WEBSITE_ID}`
  const breadcrumb = breadcrumbSchema(hostname, path, title)
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: SITE_NAME,
      alternateName: BRAND_NAME,
      url: `${site}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${site}/pwa_icon.png`
      },
      sameAs: [
        'https://github.com/fmhy',
        'https://www.reddit.com/r/FREEMEDIAHECKYEAH/'
      ]
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: `${site}/`,
      name: SITE_NAME,
      alternateName: BRAND_NAME,
      description: DEFAULT_DESCRIPTION,
      inLanguage: 'en-US',
      publisher: { '@id': organizationId }
    }
  ]

  if (breadcrumb) graph.push(breadcrumb)

  graph.push({
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: 'en-US',
    isPartOf: { '@id': websiteId },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: image
    },
    ...(breadcrumb ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {})
  })

  if (path.startsWith('/posts/')) {
    const published = dateValue(
      context.pageData.frontmatter.date ??
        context.pageData.frontmatter.published ??
        context.pageData.frontmatter.datePublished
    )
    const modified = dateValue(
      context.pageData.frontmatter.updated ??
        context.pageData.frontmatter.dateModified ??
        (context.pageData.frontmatter.lastUpdated !== false
          ? context.pageData.lastUpdated
          : undefined)
    )

    graph.push({
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      url,
      headline: title,
      description,
      image,
      inLanguage: 'en-US',
      mainEntityOfPage: { '@id': `${url}#webpage` },
      isPartOf: { '@id': websiteId },
      publisher: { '@id': organizationId },
      ...(published ? { datePublished: published } : {}),
      ...(modified ? { dateModified: modified } : {})
    })
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  }
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export function generateMeta(
  context: TransformContext,
  hostname: string
): HeadConfig[] {
  if (isNoindex(context)) {
    return [['meta', { name: 'robots', content: 'noindex, follow' }]]
  }

  const { pageData } = context
  const path = pagePath(context.page)
  const canonical = absoluteUrl(hostname, path)
  const title = pageTitle(context)
  const description = pageDescription(context)
  const cardTitle = socialTitle(title)
  const cardImage = imageUrl(context, hostname, path)
  const isArticle = path.startsWith('/posts/')
  const imageAlt = `${title} | ${SITE_NAME}`
  const head: HeadConfig[] = [
    ['link', { rel: 'canonical', href: canonical }],
    [
      'meta',
      {
        name: 'robots',
        content:
          'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      }
    ],
    [
      'meta',
      { property: 'og:type', content: isArticle ? 'article' : 'website' }
    ],
    ['meta', { property: 'og:locale', content: 'en_US' }],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { property: 'og:title', content: cardTitle }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:url', content: canonical }],
    ['meta', { property: 'og:image', content: cardImage }],
    ['meta', { property: 'og:image:alt', content: imageAlt }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: cardTitle }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: cardImage }],
    ['meta', { name: 'twitter:image:alt', content: imageAlt }]
  ]

  if (!asString(pageData.frontmatter.image)) {
    head.push(
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { property: 'og:image:type', content: 'image/webp' }]
    )
  }

  if (pageData.frontmatter.tag) {
    head.push([
      'meta',
      { property: 'article:tag', content: String(pageData.frontmatter.tag) }
    ])
  }

  if (isArticle) {
    const published = dateValue(
      pageData.frontmatter.date ??
        pageData.frontmatter.published ??
        pageData.frontmatter.datePublished
    )
    const modified = dateValue(
      pageData.frontmatter.updated ??
        pageData.frontmatter.dateModified ??
        (pageData.frontmatter.lastUpdated !== false
          ? pageData.lastUpdated
          : undefined)
    )

    if (published) {
      head.push([
        'meta',
        { property: 'article:published_time', content: published }
      ])
    }
    if (modified) {
      head.push([
        'meta',
        { property: 'article:modified_time', content: modified }
      ])
    }
  }

  head.push([
    'script',
    { type: 'application/ld+json', 'data-seo': 'structured-data' },
    safeJson(
      structuredData(
        context,
        hostname,
        path,
        title,
        description,
        cardImage
      )
    )
  ])

  return head
}
