import path from 'node:path'
import { writeFileSync } from 'node:fs'
import { Feed } from 'feed'
import {
  createContentLoader,
  type ContentData,
  type SiteConfig
} from 'vitepress'
import consola from 'consola'
import { meta } from '../constants'

export async function generateFeed(config: SiteConfig): Promise<void> {
  const feed: Feed = new Feed({
    id: meta.hostname,
    link: meta.hostname,
    title: 'FMHY blog',
    description: meta.description,
    language: 'en-US',
    image: 'https://github.com/fmhy.png',
    favicon: `${meta.hostname}/favicon.ico`,
    copyright: 'Copyright (c) 2023-present FMHY'
  })

  const posts: ContentData[] = await createContentLoader('posts/*.md', {
    excerpt: true,
    render: true,
    transform: (rawData) => {
      return rawData.sort((a, b) => {
        return (
          Number(new Date(b.frontmatter.date)) -
          Number(new Date(a.frontmatter.date))
        )
      })
    }
  }).load()

  for (const { url, frontmatter, html } of posts) {
    feed.addItem({
      title: frontmatter.title as string,
      id: `${meta.hostname}${url.replace(/\/\d+\./, '/')}`,
      link: `${meta.hostname}${url.replace(/\/\d+\./, '/')}`,
      date: frontmatter.date,
      content: html!
    })
  }

  writeFileSync(path.join(config.outDir, 'feed.rss'), feed.rss2())
  return consola.info('Generated rss feed.')
}
