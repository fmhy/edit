import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const DAYS = 30
const OUTPUT_FILE = 'docs/recently-removed.md'

const IGNORED_FILES = [
  'docs/posts.md',
  'docs/unsafe.md',
  'docs/sandbox.md',
  'docs/feedback.md',
  'docs/index.md',
  'docs/startpage.md',
  OUTPUT_FILE
]

const IGNORED_DIRS = ['docs/posts/', 'docs/.vitepress/']

function isIgnored(file) {
  return (
    !file ||
    IGNORED_FILES.includes(file) ||
    IGNORED_DIRS.some((dir) => file.startsWith(dir))
  )
}

function generateRemovedSites() {
  console.log(`Generating recently removed sites from the last ${DAYS} days...`)
  console.log(`Current working directory: ${process.cwd()}`)

  // Verify docs directory exists
  if (!fs.existsSync('docs')) {
    console.error(
      'Error: "docs" directory not found in the current working directory.'
    )
    return
  }

  let gitDir = ''
  // Check if it's a shallow clone (common in Cloudflare/CI)
  const isShallow =
    fs.existsSync('.git/shallow') || fs.existsSync('.git-temp/shallow')

  if (isShallow) {
    console.log(
      'Shallow clone detected. Fetching history for the last 30 days...'
    )
    try {
      execSync(`git fetch --shallow-since="${DAYS + 1} days ago" --tags`)
    } catch (e) {
      console.warn(
        'Warning: Failed to unshallow repository. Results may be incomplete.'
      )
    }
  }

  // Check if .git directory exists. If not, try to bootstrap it for the build
  if (!fs.existsSync('.git')) {
    console.log(
      'No .git directory found. Attempting to fetch temporary history for generation...'
    )
    try {
      const REPO_URL = 'https://github.com/fmhy/edit.git'
      const TEMP_GIT_DIR = '.git-temp'

      // Clean up any old temp dir
      if (fs.existsSync(TEMP_GIT_DIR))
        fs.rmSync(TEMP_GIT_DIR, { recursive: true, force: true })

      // Perform a blobless, shallow clone of just the metadata to save time/space
      // We only need the commits since 30 days ago
      execSync(
        `git clone --bare --filter=blob:none --shallow-since="${DAYS + 1} days ago" ${REPO_URL} ${TEMP_GIT_DIR}`
      )
      gitDir = `--git-dir=${TEMP_GIT_DIR}`
      console.log('Temporary history fetched successfully.')
    } catch (e) {
      console.warn(
        'Warning: Failed to fetch temporary Git history. Skipping generation.'
      )
      return
    }
  }

  // Ensure the directory is marked as safe for git (common issue in Docker)
  try {
    execSync(`git ${gitDir} config --global --add safe.directory /app`)
  } catch (e) {
    // Ignore error if it fails
  }

  // Get git log with diffs
  // We use a custom separator to make parsing easier
  const logOutput = execSync(
    `git ${gitDir} log --since="${DAYS} days ago" --pretty=format:"---COMMIT---%H---MSG---%s" -p --unified=0 docs/`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString()

  const commits = logOutput.split('---COMMIT---').filter(Boolean)
  const removedSites = []

  // Get current state of all valid wiki docs to check if a URL still exists somewhere
  const findCommand = `find docs -name "*.md" ${IGNORED_DIRS.map((d) => `! -path "${d}*"`).join(' ')} ${IGNORED_FILES.map((f) => `! -path "${f}"`).join(' ')}`
  const allCurrentDocs = execSync(`${findCommand} | xargs cat`, {
    maxBuffer: 100 * 1024 * 1024
  }).toString()

  for (const commit of commits) {
    const lines = commit.split('\n')
    const header = lines[0]
    const [hash, ...msgParts] = header.split('---MSG---')
    const msg = msgParts.join('---MSG---')

    let currentFile = ''
    const deletions = []
    const additions = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('diff --git')) {
        currentFile = line.split(' b/')[1]
      }

      if (isIgnored(currentFile)) {
        continue
      }

      if (line.startsWith('-') && line.includes('](')) {
        deletions.push({ text: line.substring(1), file: currentFile })
      } else if (line.startsWith('+') && line.includes('](')) {
        additions.push(line.substring(1))
      }
    }

    // Filter out deletions that are just updates or still exist elsewhere
    for (const del of deletions) {
      const urls = [...del.text.matchAll(/\[.*?\]\((.*?)\)/g)].map((m) => m[1])
      const names = [...del.text.matchAll(/\[(.*?)\]/g)].map((m) => m[1])

      if (urls.length > 0) {
        // A site is only "removed" if:
        // 1. Its URL is not in the additions of the SAME commit (not an update in the same file)
        // 2. Its URL is not present ANYWHERE in the current docs (not moved or still exists elsewhere)
        // 3. Its NAME is not in the additions of the SAME commit (not a URL change for the same site)
        const isStillPresent =
          urls.some(
            (url) =>
              additions.some((add) => add.includes(url)) ||
              allCurrentDocs.includes(url)
          ) ||
          names.some(
            (name) =>
              name.length > 3 &&
              additions.some((add) => add.includes(`[${name}]`))
          )

        if (!isStillPresent) {
          // Extract PR number if present
          const prMatch =
            msg.match(/\(#(\d+)\)/) || msg.match(/Merge pull request #(\d+)/)
          const pr = prMatch ? prMatch[1] : null

          // Clean text
          let cleanText = del.text.trim()
          cleanText = cleanText.replace(/^\*+\s*/, '') // Remove leading *
          cleanText = cleanText.replace(/^⭐\s*/, '') // Remove leading ⭐

          // Remove automated suffix from commit message
          let cleanMsg = msg.trim()
          cleanMsg = cleanMsg.replace(/:?\s*updated \d+ pages/i, '').trim()

          removedSites.push({
            text: cleanText,
            urls,
            file: del.file,
            hash,
            msg: cleanMsg,
            pr,
            date: new Date().toISOString()
          })
        }
      }
    }
  }

  // Deduplicate by first URL (keep most recent)
  const uniqueRemoved = new Map()
  for (const site of removedSites) {
    const firstUrl = site.urls[0]
    if (!uniqueRemoved.has(firstUrl)) {
      uniqueRemoved.set(firstUrl, site)
    }
  }

  const sortedRemoved = Array.from(uniqueRemoved.values())

  // Generate Markdown
  let markdown = `# ► Recently Removed Sites\n\n`
  markdown += `<!-- search-exclude -->\n`
  markdown += `This page lists sites that were removed from the wiki in the last ${DAYS} days. This helps you find sites that may have gone down or were moved.\n\n`
  markdown += `> [!TIP]\n`
  markdown += `> For more information about why a site was removed, feel free to join our [Discord](https://github.com/fmhy/FMHY/wiki/FMHY-Discord).\n`
  markdown += `<!-- /search-exclude -->\n\n`

  if (sortedRemoved.length === 0) {
    markdown += `No sites were removed in the last ${DAYS} days.\n`
  } else {
    for (const site of sortedRemoved) {
      const commitLink = `https://github.com/fmhy/edit/commit/${site.hash}`
      const prLink = site.pr
        ? `, [PR #${site.pr}](https://github.com/fmhy/edit/pull/${site.pr})`
        : ''

      // Separate the link part from the description
      // Pattern: "[Name](URL) - Description" or just "[Name](URL)"
      const linkMatch = site.text.match(/^(.*\[.*?\]\(.*?\)(?:\*\*)?)(.*)/)
      let searchablePart = site.text
      let hiddenPart = ''

      if (linkMatch) {
        searchablePart = linkMatch[1]
        hiddenPart = linkMatch[2] // This includes the " - Description" part
      }

      // Strip all hyperlinks from the searchable and hidden parts
      // We keep the PR and commit links separate
      const stripLinks = (t) =>
        t
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links: [text](url) -> text
          .replace(/https?:\/\/[^\s)]+/g, '') // Remove raw URLs
          .replace(/\s+/g, ' ') // Collapse multiple spaces

      const cleanSearchable = stripLinks(searchablePart).trim()
      let cleanHidden = stripLinks(hiddenPart)
      // Preserve the leading " - " for the hidden part if it existed
      if (hiddenPart.trim().startsWith('-') && !cleanHidden.trim().startsWith('-')) {
        cleanHidden = ` - ${cleanHidden.trim()}`
      }
      
      const cleanMsg = site.msg ? `: ${stripLinks(site.msg).trim()}` : ''

      markdown += `- ${cleanSearchable} <!-- search-exclude -->${cleanHidden} (Removed in [\`${site.hash.slice(0, 7)}\`](${commitLink})${prLink}${cleanMsg})<!-- /search-exclude -->\n`
    }
  }

  fs.writeFileSync(OUTPUT_FILE, markdown)
  console.log(
    `Successfully generated ${OUTPUT_FILE} with ${sortedRemoved.length} entries.`
  )

  // Cleanup temporary git dir
  if (gitDir.includes('.git-temp')) {
    try {
      const tempDir = gitDir.split('=')[1]
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

try {
  generateRemovedSites()
} catch (error) {
  console.error('Error generating removed sites:', error)
  process.exit(1)
}
