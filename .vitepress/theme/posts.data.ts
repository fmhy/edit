import { createContentLoader, type ContentData } from 'vitepress'
import { groupBy } from '../utils'

interface Post {
  title: string
  url: string
  date: string
}

type Dictionary = ReturnType<typeof transformRawPosts>

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
