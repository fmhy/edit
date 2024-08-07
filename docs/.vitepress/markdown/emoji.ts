import { icons as twemoji } from '@iconify-json/twemoji'
import type { MarkdownRenderer } from 'vitepress'

export const defs = {
  ...Object.fromEntries(
    Object.entries(twemoji.icons).map(([key]) => {
      return [key, '']
    })
  )
}

export function emojiRender(md: MarkdownRenderer) {
  md.renderer.rules.emoji = (tokens, idx) => {
    if (tokens[idx].markup.startsWith('star')) {
      return `<span class="i-twemoji-${tokens[idx].markup} starred"></span>`
    }
    return `<span class="i-twemoji-${tokens[idx].markup}"></span>`
  }
}

export function movePlugin(
  plugins: { name: string }[],
  pluginAName: string,
  order: 'before' | 'after',
  pluginBName: string
) {
  const pluginBIndex = plugins.findIndex((p) => p.name === pluginBName)
  if (pluginBIndex === -1) return

  const pluginAIndex = plugins.findIndex((p) => p.name === pluginAName)
  if (pluginAIndex === -1) return

  if (order === 'before' && pluginAIndex > pluginBIndex) {
    const pluginA = plugins.splice(pluginAIndex, 1)[0]
    plugins.splice(pluginBIndex, 0, pluginA)
  }

  if (order === 'after' && pluginAIndex < pluginBIndex) {
    const pluginA = plugins.splice(pluginAIndex, 1)[0]
    plugins.splice(pluginBIndex, 0, pluginA)
  }
}
