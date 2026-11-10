import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export interface TooltipData {
  id: string
  content: string
  critical: boolean
  contentHash: string
}

const notesDir = resolve(process.cwd(), 'docs/.vitepress/notes')

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 12)
}

export function getTooltip(id: string): TooltipData | undefined {
  const filePath = join(notesDir, `${id}.md`)
  if (!existsSync(filePath)) return undefined

  try {
    let content = readFileSync(filePath, 'utf-8').trim()
    let critical = id.endsWith('-critical')
    // Explicit frontmatter overrides the filename convention.
    const fm = content.match(/^---\n([\s\S]*?)\n---\n?/)
    if (fm) {
      if (/^critical:\s*true\s*$/m.test(fm[1])) critical = true
      else if (/^critical:\s*false\s*$/m.test(fm[1])) critical = false
      content = content.slice(fm[0].length).trim()
    }
    return { id, content, critical, contentHash: hashContent(content) }
  } catch (e) {
    console.warn(`Error reading tooltip ${id}:`, e)
    return undefined
  }
}
