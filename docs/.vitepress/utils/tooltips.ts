/**
 *  All Rights Reserved
 *
 *  Copyright (c) 2025 taskylizard
 *
 *  All rights reserved. This code and its associated files may not be copied, modified, distributed, sublicensed, or used in any form, in whole or in part, without prior written permission from the copyright holder.
 */
import matter from 'gray-matter'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join, resolve } from 'pathe'

export interface TooltipData {
  id: string
  frontmatter: Record<string, string>
  content: string
}

let tooltipsCache: TooltipData[] | null = null

export function loadTooltips(): TooltipData[] {
  if (tooltipsCache) return tooltipsCache

  const tooltipsDir = resolve(process.cwd(), 'docs/.vitepress/notes')
  const tooltips: TooltipData[] = []

  try {
    const files = readdirSync(tooltipsDir).filter((file) =>
      file.endsWith('.md')
    )

    for (const file of files) {
      const filePath = join(tooltipsDir, file)
      const fileContent = readFileSync(filePath, 'utf-8')
      const { data, content } = matter(fileContent)

      const id = basename(file, '.md')
      const cleanContent = content.trim()

      tooltips.push({
        id,
        frontmatter: data,
        content: cleanContent
      })
    }
  } catch (error) {
    console.warn('Failed to load tooltips:', error)
  }

  tooltipsCache = tooltips
  return tooltips
}

export function getTooltip(id: string): TooltipData | undefined {
  const tooltips = loadTooltips()
  return tooltips.find((tooltip) => tooltip.id === id)
}

export const tooltips = loadTooltips()

