import type { HeadConfig, TransformContext } from 'vitepress'

/**
 * Generates meta tags for a given page based on the page's frontmatter and file path.
 * @param context - The transform context containing information about the current page.
 * @param hostname - The hostname to use for generating URLs.
 * @returns An array of HeadConfig objects representing the generated meta tags.
 */
export function generateMeta(context: TransformContext, hostname: string) {
  const head: HeadConfig[] = [] // Initialize an array to store the generated meta tags
  const { pageData } = context // Get the page data from the transform context

  // Generate the canonical URL for the page
  const url = `${hostname}/${pageData.relativePath.replace(/((^|\/)index)?\.md$/, '$2')}`

  head.push( // Add meta tags to the head array
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { name: 'twitter:url', content: url }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { property: 'og:title', content: pageData.frontmatter.title }],
    ['meta', { name: 'twitter:title', content: pageData.frontmatter.title }]
  )

  // If the page has a description in its frontmatter, add it to the meta tags
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

  // If the page has an image in its frontmatter, add it to the meta tags
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
    // If no image is provided, generate a default image based on the page's URL
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

  // If the page has a tag in its frontmatter, add it to the meta tags
  if (pageData.frontmatter.tag) {
    head.push([
      'meta',
      { property: 'article:tag', content: pageData.frontmatter.tag }
    ])
  }

  // If the page has a date in its frontmatter, add it to the meta tags
  if (pageData.frontmatter.date) {
    head.push([
      'meta',
      {
        property: 'article:published_time',
        content: pageData.frontmatter.date
      }
    ])
  }

  // If the page has a lastUpdated field and it's not explicitly set to false, add the
