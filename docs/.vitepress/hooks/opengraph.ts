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
import { createHash } from 'node:crypto'
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  unlink,
  writeFile
} from 'node:fs/promises'
import { cpus } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import consola from 'consola'
import sharp from 'sharp'
import { createContentLoader } from 'vitepress'
import { headers } from '../transformer/constants'

const __dirname = dirname(fileURLToPath(import.meta.url))
const __fonts = resolve(__dirname, '../fonts')
const __ogBase = resolve(__dirname, '../og-base.jpg')
const CACHE_DIR = resolve(__dirname, '../cache/og')

const layout = {
  width: 1200,
  height: 630,
  contentWidth: 936,
  bottom: 40,
  gap: 8,
  brand: { left: 48, top: 40, font: 'Inter 48', color: '#f3f4f6' },
  title: { left: 40, font: 'Inter Bold 60', color: '#f3f4f6' },
  description: { left: 40, font: 'Inter 36', color: '#c0caf5' }
} as const

interface Assets {
  background: Buffer
  brand: Buffer
  fonts: {
    regular: string
    bold: string
  }
}

interface TextLayer {
  data: Buffer
  height: number
}

const sha = (input: string | Buffer) =>
  createHash('sha256').update(input).digest('hex')

export async function generateImages(config: SiteConfig) {
  const pages = await createContentLoader('**/*.md', { excerpt: true }).load()
  const fontPaths = {
    regular: resolve(__fonts, 'Inter-Regular.otf'),
    semibold: resolve(__fonts, 'Inter-SemiBold.otf'),
    bold: resolve(__fonts, 'Inter-Bold.otf')
  }
  const [background, regularFont, semiboldFont, boldFont] = await Promise.all([
    readFile(__ogBase),
    readFile(fontPaths.regular),
    readFile(fontPaths.semibold),
    readFile(fontPaths.bold)
  ])
  const brand = await renderText({
    text: 'freemediaheckyeah',
    fontfile: fontPaths.semibold,
    font: layout.brand.font,
    width: 700,
    color: layout.brand.color
  })
  const assets: Assets = {
    background,
    brand: brand.data,
    fonts: { regular: fontPaths.regular, bold: fontPaths.bold }
  }
  const globalHash = sha(
    [
      JSON.stringify(layout),
      sha(background),
      sha(regularFont),
      sha(semiboldFont),
      sha(boldFont)
    ].join('\0')
  )

  await mkdir(CACHE_DIR, { recursive: true })

  let hits = 0
  let misses = 0
  const usedHashes = new Set<string>()
  const concurrency = Math.max(2, cpus().length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, pages.length) }, async () => {
      while (true) {
        const index = cursor++
        if (index >= pages.length) return
        const result = await generateImage({
          page: pages[index],
          outDir: config.outDir,
          globalHash,
          usedHashes,
          assets
        })
        if (result === 'hit') hits++
        else misses++
      }
    })
  )

  const pruned = await pruneCache(usedHashes)

  return consola.info(
    `Generated ${pages.length} opengraph images (concurrency ${concurrency}, ${hits} cached, ${misses} rendered, ${pruned} pruned).`
  )
}

async function pruneCache(usedHashes: Set<string>): Promise<number> {
  const entries = await readdir(CACHE_DIR)
  const stale = entries.filter(
    (name) => name.endsWith('.webp') && !usedHashes.has(name.slice(0, -5))
  )
  await Promise.all(stale.map((name) => unlink(resolve(CACHE_DIR, name))))
  return stale.length
}

interface GenerateImageOptions {
  page: ContentData
  outDir: string
  globalHash: string
  usedHashes: Set<string>
  assets: Assets
}

async function generateImage({
  page,
  outDir,
  globalHash,
  usedHashes,
  assets
}: GenerateImageOptions): Promise<'hit' | 'miss'> {
  const { frontmatter, url } = page
  const fallback = getPage(url)
  const title =
    frontmatter.layout === 'home'
      ? (frontmatter.hero?.name ?? frontmatter.title)
      : (frontmatter.title ?? fallback?.title)
  const description =
    frontmatter.layout === 'home'
      ? (frontmatter.hero?.tagline ?? frontmatter.description)
      : (frontmatter.description ?? fallback?.description)

  const pageHash = sha(
    `${globalHash}\0${title ?? ''}\0${description ?? ''}`
  ).slice(0, 32)
  usedHashes.add(pageHash)
  const cacheFile = resolve(CACHE_DIR, `${pageHash}.webp`)
  const outputFolder = resolve(outDir, url.slice(1), '__og_image__')
  const outputFile = resolve(outputFolder, 'og.webp')
  await mkdir(outputFolder, { recursive: true })

  try {
    await copyFile(cacheFile, outputFile)
    return 'hit'
  } catch {
    // Render cache miss.
  }

  const image = await renderImage(
    String(title ?? ''),
    String(description ?? ''),
    assets
  )
  await Promise.all([writeFile(outputFile, image), writeFile(cacheFile, image)])
  return 'miss'
}

interface RenderTextOptions {
  text: string
  font: string
  fontfile: string
  width: number
  color: string
}

async function renderText({
  text,
  font,
  fontfile,
  width,
  color
}: RenderTextOptions): Promise<TextLayer> {
  const input = text
    ? {
        text: {
          text: `<span foreground="${color}">${escapePango(text)}</span>`,
          font,
          fontfile,
          width,
          align: 'left' as const,
          rgba: true,
          wrap: 'word-char' as const
        }
      }
    : {
        create: {
          width: 1,
          height: 1,
          channels: 4 as const,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      }
  const { data, info } = await sharp(input).png().toBuffer({
    resolveWithObject: true
  })
  return { data, height: info.height }
}

async function renderImage(
  title: string,
  description: string,
  assets: Assets
): Promise<Buffer> {
  const [titleLayer, descriptionLayer] = await Promise.all([
    renderText({
      text: title,
      font: layout.title.font,
      fontfile: assets.fonts.bold,
      width: layout.contentWidth,
      color: layout.title.color
    }),
    renderText({
      text: description,
      font: layout.description.font,
      fontfile: assets.fonts.regular,
      width: layout.contentWidth,
      color: layout.description.color
    })
  ])
  const descriptionTop = layout.height - layout.bottom - descriptionLayer.height
  const titleTop = descriptionTop - layout.gap - titleLayer.height

  return sharp(assets.background)
    .composite([
      { input: assets.brand, left: layout.brand.left, top: layout.brand.top },
      { input: titleLayer.data, left: layout.title.left, top: titleTop },
      {
        input: descriptionLayer.data,
        left: layout.description.left,
        top: descriptionTop
      }
    ])
    .webp({ quality: 75 })
    .toBuffer()
}

function escapePango(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function getPage(page: string) {
  const pageName = `${page}.md`.slice(1).split('/').at(-1)
  const header = Object.entries(headers).find(([key]) => key === pageName)
  if (!header) return

  const { title, description } = header[1]
  return { title, description }
}
