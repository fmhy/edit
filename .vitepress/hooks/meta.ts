import type { HeadConfig, TransformContext } from 'vitepress'

export function generateMeta(context: TransformContext, hostname: string) {
  const head: HeadConfig[] = []
  const { pageData } = context

  const url = `${hostname}/${pageData.relativePath.replace(/((^|\/)index)?\.md$/, '$2')}`

  head.push(
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { name: 'twitter:url', content: url }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { property: 'og:title', content: pageData.frontmatter.title }],
    ['meta', { name: 'twitter:title', content: pageData.frontmatter.title }]
  )
  if (pageData.frontmatter.description) {
    head.push(
      [
        'meta',
        {
          property: 'og:description',
          content: pageData.frontmatter.description
        }
      ],
      [
        'meta',
        {
          name: 'twitter:description',
          content: pageData.frontmatter.description
        }
      ]
    )
  }
  if (pageData.frontmatter.image) {
    head.push([
      'meta',
      {
        property: 'og:image',
        content: `${hostname}/${pageData.frontmatter.image.replace(/^\//, '')}`
      }
    ])
    head.push([
      'meta',
      {
        name: 'twitter:image',
        content: `${hostname}/${pageData.frontmatter.image.replace(/^\//, '')}`
      }
    ])
  } else {
    const url = pageData.filePath.replace('index.md', '').replace('.md', '')
    const imageUrl = `${url}/__og_image__/og.png`
      .replaceAll('//', '/')
      .replace(/^\//, '')

    head.push(
      ['meta', { property: 'og:image', content: `${hostname}/${imageUrl}` }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '628' }],
      ['meta', { property: 'og:image:type', content: 'image/png' }],
      [
        'meta',
        { property: 'og:image:alt', content: pageData.frontmatter.title }
      ],
      ['meta', { name: 'twitter:image', content: `${hostname}/${imageUrl}` }],
      ['meta', { name: 'twitter:image:width', content: '1200' }],
      ['meta', { name: 'twitter:image:height', content: '628' }],
      [
        'meta',
        { name: 'twitter:image:alt', content: pageData.frontmatter.title }
      ]
    )
  }
  if (pageData.frontmatter.tag) {
    head.push([
      'meta',
      { property: 'article:tag', content: pageData.frontmatter.tag }
    ])
  }
  if (pageData.frontmatter.date) {
    head.push([
      'meta',
      {
        property: 'article:published_time',
        content: pageData.frontmatter.date
      }
    ])
  }
  if (pageData.lastUpdated && pageData.frontmatter.lastUpdated !== false) {
    head.push([
      'meta',
      {
        property: 'article:modified_time',
        content: new Date(pageData.lastUpdated).toISOString()
      }
    ])
  }

  return head
}
