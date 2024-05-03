// Import the 'createContentLoader' function from VitePress and the 'groupBy' function from a local '../utils' module.
import { createContentLoader, type ContentData } from 'vitepress'
import { groupBy } from '../utils'

// Define an interface 'Post' that represents a blog post with a title, URL, and date.
interface Post {
  title: string
  url: string
  date: string
}

// Export the 'transformRawPosts' function that takes an array of 'ContentData' objects and returns a dictionary of posts grouped by year.
export function transformRawPosts(rawPosts: ContentData[]): Record<string, Post[]> {
  // Map each 'ContentData' object to a 'Post' object, extracting the title, URL, and formatted date.
  const posts: Post[] = rawPosts
    .map(({ url, frontmatter }) => ({
      title: frontmatter.title,
      url,
      date: new Date(frontmatter.date).toISOString().slice(0, 10)
    }))

  // Sort the posts in descending order by date.
  .sort((a, b) => b.date.localeCompare(a.date))

  // Group the posts by year using the 'groupBy' function from '../utils'.
  return groupBy(posts, (post) => post.date.slice(0, 4))
}

// Export the default 'createContentLoader' function, which is responsible for loading and processing the markdown files for blog posts.
export default createContentLoader('posts/*.md', {
  // Include the source code when loading the markdown files.
  includeSrc: true,

  // Transform the loaded raw markdown data using the 'transformRawPosts' function.
  transform: (raw) => transformRawPosts(raw)
})

// Declare a type 'Dictionary' as the return type of the 'transformRawPosts' function.
type Dictionary = ReturnType<typeof transformRawPosts>

// Declare a constant 'data' of type 'Dictionary'.
declare const data: Dictionary

// Export the 'data' constant for use in other modules.
export { data }
