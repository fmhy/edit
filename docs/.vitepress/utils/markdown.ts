import type { MarkdownRenderer } from 'vitepress'
import { getTooltip } from './tooltips'

const NOTE_MATCH_RE = /\.vitepress\/notes\/([\w-]+)(?:\.md)?$/

export function replaceNoteLink(md: MarkdownRenderer) {
  md.core.ruler.after('inline', 'url-tooltip', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children) continue

      const children = token.children
      for (let i = 0; i < children.length; i++) {
        if (children[i].type !== 'link_open') continue

        const href = children[i].attrGet('href') || ''
        const match = href.match(NOTE_MATCH_RE)
        if (!match) continue

        const item = getTooltip(match[1])
        if (!item) continue

        // Find closing link tag
        let j = i + 1
        while (j < children.length && children[j].type !== 'link_close') j++

        const tooltip = new state.Token('html_inline', '', 0)

        let title = ''
        // Extract first header to be used as title
        const content = item.content.replace(/^#+\s+(.*)$/m, (_, t) => {
          title = t
          return ''
        })

        const rendered = md.render(content)
        const props = title ? `title="${title.replace(/"/g, '&quot;')}"` : ''
        const footer = `<div class="mt-2 text-right opacity-50 text-xs"><a href="${href}">Source</a></div>`
        tooltip.content = `<Tooltip ${props}>${rendered}${footer}</Tooltip>`

        children.splice(i, j - i + 1, tooltip)
      }
    }
  })
}