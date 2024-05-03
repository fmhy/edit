import { icons as twemoji } from '@iconify-json/twemoji'
import type { MarkdownRenderer } from 'vitepress'

// This object contains all the emoji definitions from the twemoji library
// Each key in the object corresponds to an emoji name and its value is an empty string
export const defs = {
  ...Object.fromEntries(
    Object.entries(twemoji.icons).map(([key]) => {
      return [key, '']
    })
  )
}

// This function modifies the MarkdownRenderer to render emojis using the Twemoji library
// It sets the 'emoji' rule for the renderer to replace emoji markup with Twemoji SVG icons
export function emojiRender(md: MarkdownRenderer) {
  md.renderer.rules.emoji = (tokens, idx) => {
    // If the emoji markup starts with 'star', add a 'starred' class to the icon
    if (tokens[idx].markup.startsWith('star')) {
      return `<span class="i-twemoji-${tokens[idx].markup} starred"></span>`
    }
    // Otherwise, just add the Twemoji class to the icon
    return `<span class="i-twemoji-${tokens[idx].markup}"></span>`
  }
}

// This function moves a plugin to a specific position in the plugins array
// It takes the plugins array, the name of the plugin to move, the order (before or after), and the name of the target plugin
export function movePlugin(
  plugins: { name: string }[],
  pluginAName: string,
  order: 'before' | 'after',
  pluginBName: string
) {
  // Find the index of the target plugin
  const pluginBIndex = plugins.findIndex((p) => p.name === pluginBName)
  if (pluginBIndex === -1) return

  // Find the index of the plugin to move
  const pluginAIndex = plugins.findIndex((p) => p.name === pluginAName)
  if (pluginAIndex === -1) return

  // Move the plugin to the specified position
  if (order === 'before' && pluginAIndex > pluginBIndex) {
    const pluginA = plugins.splice(pluginAIndex, 1)[0]
    plugins.splice(pluginBIndex, 0, pluginA)
  }

  if (order === 'after' && pluginAIndex < pluginBIndex) {
    const pluginA = plugins.splice(pluginAIndex, 1)[0]
    plugins.splice(pluginBIndex + 1, 0, pluginA)
  }
}

