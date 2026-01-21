import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'pathe'

export interface TooltipData {
  id: string
  content: string
}

const notesDir = resolve(process.cwd(), 'docs/.vitepress/notes')

export function getTooltip(id: string): TooltipData | undefined {
  const filePath = join(notesDir, `${id}.md`)
  if (!existsSync(filePath)) return undefined

  try {
    const content = readFileSync(filePath, 'utf-8').trim()
    return { id, content }
  } catch (e) {
    console.warn(`Error reading tooltip ${id}:`, e)
    return undefined
  }
}
