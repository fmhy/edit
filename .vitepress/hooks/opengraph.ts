// Import necessary modules and functions from Node.js built-in 'fs/promises', 'path', 'url', and 'vitepress'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createContentLoader } from 'vitepress'
import type { ContentData, SiteConfig } from 'vitepress'

// Import 'satoriVue' and 'renderAsync' from 'x-satori/vue' and '@resvg/resvg-js' respectively
import { type SatoriOptions, satoriVue } from 'x-satori/vue'
import { renderAsync } from '@resvg/resvg-js'

// Import 'consola' for logging
import consola from 'consola'

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url))

// Define the path to the fonts directory
const __fonts = resolve(__dirname, '../fonts')

// The main function to generate images based on the given configuration
export async function generateImages(config: SiteConfig): Promise<void> {
  // Load all the pages using 'createContentLoader'
  const pages = await createContentLoader('**/*.md', { excerpt: true }).load()

  // Read the template file
  const template = await readFile(resolve(__dirname, './Template.vue'), 'utf-8')

  // Define the fonts for the SatoriOptions
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

  // Loop through all the pages and generate images for each page
  for (const page of pages) {
    await generateImage({
      page,
      template,
      outDir: config.outDir,
      fonts
    })
  }

  // Log a success message
  consola.info('Generated opengraph images.')
}

// Define the interface for the GenerateImagesOptions
interface GenerateImagesOptions {
  page: ContentData
  template: string
  outDir: string
  fonts: SatoriOptions['fonts']
}

// The function to generate a single image for a page
async function generateImage({
  page,
  template,
  outDir,
  fonts
}: GenerateImagesOptions): Promise<void> {
  // Get the frontmatter and URL of the page
  const { frontmatter, url } = page

  // Define the options for the SatoriOptions
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

  // Render the SVG using the SatoriOptions and template
  const svg = await satoriVue(options, template)

  // Convert the SVG to PNG
  const render = await renderAsync(svg)

  // Define the output folder and file paths
  const outputFolder = resolve(outDir, url.slice(1), '__og_image__')
  const outputFile = resolve(outputFolder, 'og.png')

  // Create the output folder if it doesn't exist
  await mkdir(outputFolder, { recursive: true })

  // Write the PNG to the output file
  await writeFile(outputFile, render.asPng())
}

