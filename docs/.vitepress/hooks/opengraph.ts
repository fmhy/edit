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
import type { SatoriOptions } from 'x-satori/vue'
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
import { renderAsync } from '@resvg/resvg-js'
import consola from 'consola'
import sharp from 'sharp'
import { createContentLoader } from 'vitepress'
import { satoriVue } from 'x-satori/vue'
import { headers } from '../transformer/constants'

const __dirname = dirname(fileURLToPath(import.meta.url))
const __fonts = resolve(__dirname, '../fonts')
const __ogBase = resolve(__dirname, '../og-base.jpg')
const CACHE_DIR = resolve(__dirname, '../cache/og')

const OG_WIDTH = 1200
const OG_HEIGHT = 630

const sha = (input: string | Buffer) =>
  createHash('sha256').update(input).digest('hex')

export async function generateImages(config: SiteConfig) {
  const pages = await createContentLoader('**/*.md', { excerpt: true }).load()
  const template = await readFile(resolve(__dirname, './Template.vue'), 'utf-8')

  const fontFiles = [
    { name: 'Inter', file: 'Inter-Regular.otf', weight: 400 as const },
    { name: 'Inter', file: 'Inter-Medium.otf', weight: 500 as const },
    { name: 'Inter', file: 'Inter-SemiBold.otf', weight: 600 as const },
    { name: 'Inter', file: 'Inter-Bold.otf', weight: 700 as const }
  ]
  const fontBuffers = await Promise.all(
    fontFiles.map((f) => readFile(resolve(__fonts, f.file)))
  )
  const fonts: SatoriOptions['fonts'] = fontFiles.map((f, i) => ({
    name: f.name,
    data: fontBuffers[i],
    weight: f.weight,
    style: 'normal'
  }))

  // Background image is read once and embedded as a data URL, so satori
  // doesn't fetch (or re-decode) it per page.
  const ogBaseBuffer = await readFile(__ogBase)
  const ogBaseDataUrl = `data:image/jpeg;base64,${ogBaseBuffer.toString('base64')}`

  // Invalidate the entire cache when anything that affects every page
  // changes: the template, the fonts, the background image, or render dims.
  const globalHash = sha(
    [
      template,
      ...fontBuffers.map((b) => sha(b)),
      sha(ogBaseBuffer),
      `${OG_WIDTH}x${OG_HEIGHT}`
    ].join('\0')
  )

  await mkdir(CACHE_DIR, { recursive: true })

  let hits = 0
  let misses = 0
  const usedHashes = new Set<string>()

  // sharp + resvg-js are native and release the event loop, so running
  // several in flight at once keeps the thread pools busy. Size to CPU
  // count (min 2) — going much higher just adds memory pressure.
  const concurrency = Math.max(2, cpus().length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, pages.length) }, async () => {
      while (true) {
        const index = cursor++
        if (index >= pages.length) return
        const result = await generateImage({
          page: pages[index],
          template,
          outDir: config.outDir,
          fonts,
          globalHash,
          usedHashes,
          ogBaseDataUrl
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

interface GenerateImagesOptions {
  page: ContentData
  template: string
  outDir: string
  fonts: SatoriOptions['fonts']
  globalHash: string
  usedHashes: Set<string>
  ogBaseDataUrl: string
}

async function generateImage({
  page,
  template,
  outDir,
  fonts,
  globalHash,
  usedHashes,
  ogBaseDataUrl
}: GenerateImagesOptions): Promise<'hit' | 'miss'> {
  const { frontmatter, url } = page

  const _page = getPage(url)
  const title =
    frontmatter.layout === 'home'
      ? (frontmatter.hero?.name ?? frontmatter.title)
      : frontmatter.title
        ? frontmatter.title
        : _page?.title

  const description =
    frontmatter.layout === 'home'
      ? (frontmatter.hero?.tagline ?? frontmatter.description)
      : frontmatter.description
        ? frontmatter.description
        : _page?.description

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
    // miss — fall through to render
  }

  const options: SatoriOptions = {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
    props: { title, description, image: ogBaseDataUrl }
  }

  const svg = await satoriVue(options, template)
  const render = await renderAsync(svg)
  const compressed = await sharp(render.asPng())
    .webp({ quality: 75 })
    .toBuffer()

  await Promise.all([
    writeFile(outputFile, compressed),
    writeFile(cacheFile, compressed)
  ])
  return 'miss'
}

function getPage(page: string) {
  // Get the page name
  const pageName = `${page}.md`.slice(1).split('/').at(-1)

  // Find the header
  // TODO: This is a hacky way to find the header
  const header = Object.entries(headers).find(([key]) => key === pageName)
  if (!header) return

  const { title, description } = header[1]

  return {
    title,
    description
  }
}
