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

import type { ContentData } from 'vitepress'
import { createContentLoader } from 'vitepress'
import { groupBy } from '../utils'

interface Post {
  title: string
  url: string
  date: string
}

type Dictionary = ReturnType<typeof createContentLoader>

declare const data: Dictionary
export { data }

function transformRawPosts(rawPosts: ContentData[]): Record<string, Post[]> {
  const posts: Post[] = rawPosts
    .map(({ url, frontmatter }) => ({
      title: frontmatter.title,
      url,
      date: (frontmatter.date as Date).toISOString().slice(0, 10)
    }))
    .sort((a, b) => b.date.localeCompare(a.date))

  return groupBy(posts, (post) => post.date.slice(0, 4))
}

export default createContentLoader('posts/*.md', {
  includeSrc: true,
  transform: (raw) => transformRawPosts(raw)
})
