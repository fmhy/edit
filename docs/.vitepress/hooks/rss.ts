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

import type { ContentData, SiteConfig } from 'vitepress'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import consola from 'consola'
import { Feed } from 'feed'
import { createContentLoader } from 'vitepress'
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
      content: html?.replaceAll('&ZeroWidthSpace;', '')
    })
  }

  writeFileSync(path.join(config.outDir, 'feed.rss'), feed.rss2())
  return consola.info('Generated rss feed.')
}
