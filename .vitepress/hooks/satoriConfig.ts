import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SatoriOptions } from 'x-satori/vue'
import { defineSatoriConfig } from 'x-satori/vue'

const __dirname = dirname(fileURLToPath(import.meta.url))
const __fonts = resolve(__dirname, '../fonts')

const loadFont = async (fontName: string, weight: number, style: string) => {
  try {
    const fontFile = resolve(__fonts, `${fontName}-${weight}.otf`)
    const fontData = await readFile(fontFile)
    return { name: fontName, data: fontData, weight, style }
  } catch (error) {
    console.error(`Error loading font ${fontName} with weight ${weight}:`, error)
    return null
  }
}

const fonts: SatoriOptions['fonts'] = [
  await loadFont('Inter', 400, 'normal'),
  await loadFont('Inter', 500, 'normal'),
  await loadFont('Inter', 600, 'normal'),
  await loadFont('Inter', 700, 'normal'),
].filter(font => font !== null)

export default defineSatoriConfig({
  width: 1200,
  height: 628,
  fonts,
  props: {
    title: 'Title',
    description: `Lorem ipsum dolor sit amet, qui minim labore adipisicing minim sint cillum sint consectetur cupidatat.`,
    dir: '/j'
  }
})
