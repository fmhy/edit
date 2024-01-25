import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createContentLoader } from 'vitepress'
import type { ContentData, SiteConfig } from 'vitepress'
import { type SatoriOptions, satoriVue } from 'x-satori/vue'
import { renderAsync } from '@resvg/resvg-js'
import consola from 'consola'

const __dirname = dirname(fileURLToPath(import.meta.url))
const __fonts = resolve(__dirname, '../fonts')

export async function generateImages(config: SiteConfig): Promise<void> {
  const pages = await createContentLoader('**/*.md', { excerpt: true }).load()
  const template = await readFile(resolve(__dirname, './Template.vue'), 'utf-8')

  const fonts: SatoriOptions['fonts'] = [
    {
      name: 'Inter',
      data: await readFile(resolve(__fonts, 'Inter-Regular.otf')),
      weight: 400,
      style: 'normal'
    },
    {
      name: 'Inter',
      data: await readFile(resolve(__fonts, 'Inter-Medium.otf')),
      weight: 500,
      style: 'normal'
    },
    {
      name: 'Inter',
      data: await readFile(resolve(__fonts, 'Inter-SemiBold.otf')),
      weight: 600,
      style: 'normal'
    },
    {
      name: 'Inter',
      data: await readFile(resolve(__fonts, 'Inter-Bold.otf')),
      weight: 700,
      style: 'normal'
    }
  ]

  for (const page of pages) {
    await generateImage({
      page,
      template,
      outDir: config.outDir,
      fonts
    })
  }
  return consola.info('Generated opengraph images.')
}

interface GenerateImagesOptions {
  page: ContentData
  template: string
  outDir: string
  fonts: SatoriOptions['fonts']
}

async function generateImage({
  page,
  template,
  outDir,
  fonts
}: GenerateImagesOptions): Promise<void> {
  const { frontmatter, url } = page

  const options: SatoriOptions = {
    width: 1200,
    height: 628,
    fonts,
    props: {
      title:
        frontmatter.layout === 'home'
          ? frontmatter.hero.name ?? frontmatter.title
          : frontmatter.title,
      description:
        frontmatter.layout === 'home'
          ? frontmatter.hero.tagline ?? frontmatter.description
          : frontmatter.description
    }
  }

  const svg = await satoriVue(options, template)

  const render = await renderAsync(svg)

  const outputFolder = resolve(outDir, url.slice(1), '__og_image__')
  const outputFile = resolve(outputFolder, 'og.png')

  await mkdir(outputFolder, { recursive: true })

  await writeFile(outputFile, render.asPng())
}
