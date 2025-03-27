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

export function generateMeta(context: TransformContext, hostname: string) {
  const head: HeadConfig[] = []
  const { pageData } = context

  if (pageData.isNotFound) return head
  if (Object.keys(pageData.frontmatter).length === 0) return head

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
