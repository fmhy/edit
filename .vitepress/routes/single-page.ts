import { fetcher } from 'itty-fetcher'

const GITHUB_REPO = 'https://api.github.com/repos/fmhy/FMHYEdit/contents/'
const EXCLUDE_FILES = ['README.md', 'index.md', 'feedback.md', 'posts.md']
const EXCLUDE_DIRECTORIES = ['posts/']

interface File {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string | null
  type: string
  _links: {
    self: string
    git: string
    html: string
  }
}

export default defineEventHandler(async () => {
  let body = ''
  const f = fetcher({
    headers: {
      'User-Agent': 'taskylizard'
    }
  })

  try {
    // event.waitUntil(async () => {

    // Fetch the list of files in the repository
    const files = await f.get<File[]>(GITHUB_REPO)

    // Filter out the excluded files and non-markdown files
    const markdownFiles = files.filter((file: File) => {
      const isExcludedFile = EXCLUDE_FILES.includes(file.name)
      const isInExcludedDirectory = EXCLUDE_DIRECTORIES.some((dir) =>
        file.path.startsWith(dir)
      )
      const isMarkdownFile = file.name.endsWith('.md')

      return isMarkdownFile && !isExcludedFile && !isInExcludedDirectory
    })

    // console.info(markdownFiles.map((f) => f.name))

    // Fetch and concatenate the contents of the markdown files
    const contents = await Promise.all(
      markdownFiles.map(async (file: File) => {
        const content = await f.get<string>(file.download_url)
        return content
      })
    )

    body += contents.join('\n\n')
    // })
  } catch (error) {
    return {
      status: 500,
      body: `Error fetching markdown files: ${error.message}`
    }
  }

  return {
    status: 200,
    body
  }
})
