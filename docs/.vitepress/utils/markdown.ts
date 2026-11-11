import type { MarkdownRenderer } from 'vitepress'
import { getTooltip } from './tooltips'

const NOTE_MATCH_RE = /\.vitepress\/notes\/([\w-]+)(?:\.md)?$/

// Pages where ` / ` separates different sites on one line, e.g.
// `Audiobooks: [Mobilism] / [AudiobookBay] / [Warning]`.
const SLASH_LIST_PAGES = new Set(['beginners-guide.md'])

interface Token {
  type: string
  content: string
}

interface LinkInfo {
  open: number
  separator: string
}

const DESCRIPTION_RE = /\s+[-–—]\s+/
const PEER_SEPARATOR_RE =
  /^[\s*_]*(?:\([^)]*\)\s*)?(?:(?:,\s*(?:or\s+)?|or\s+)[\s*_]*)?$/
const BOLD_PEER_RE = /^\*\*\s+\/\s+\*\*$/

/**
 * Work out which links in a list item a critical note guards, so the
 * warning dialog opens for those links and not for unrelated ones.
 *
 * - Normal entries: every primary peer before the ` - ` description: the
 *   first link, links joined by `, ` or ` or `, bold ` / ` peers and
 *   numbered mirrors like `[2]`. Supporting links (`/ GitHub`) are left out.
 * - Slash-list pages: only the link right before the warning, plus any
 *   mirrors joined to it by `, ` or ` or `.
 */
export function findGuardedLinks(
  children: Token[],
  noteIndex: number,
  slashList: boolean
): number[] {
  const links: LinkInfo[] = []
  let buffer = ''
  let inLink = false
  let descriptionAt = -1

  for (let k = 0; k < noteIndex; k++) {
    const t = children[k]
    if (t.type === 'link_open') {
      if (descriptionAt < 0 && DESCRIPTION_RE.test(buffer))
        descriptionAt = links.length
      links.push({ open: k, separator: buffer })
      buffer = ''
      inLink = true
    } else if (t.type === 'link_close') {
      inLink = false
    } else if (inLink) {
      continue
    } else if (t.type === 'html_inline') {
      // An earlier note already rendered as a tooltip acts like a link.
      if (descriptionAt < 0 && DESCRIPTION_RE.test(buffer))
        descriptionAt = links.length
      links.push({ open: -1, separator: buffer })
      buffer = ''
    } else if (t.type === 'strong_open' || t.type === 'strong_close') {
      buffer += '**'
    } else if (t.type === 'text' || t.type === 'code_inline') {
      buffer += t.content
    }
  }

  const isPeerJoin = (separator: string) =>
    PEER_SEPARATOR_RE.test(separator) || BOLD_PEER_RE.test(separator)

  const guarded: number[] = []
  if (slashList) {
    if (DESCRIPTION_RE.test(buffer)) return guarded
    for (let n = links.length - 1; n >= 0; n--) {
      if (links[n].open < 0) break
      guarded.unshift(links[n].open)
      if (!PEER_SEPARATOR_RE.test(links[n].separator)) break
    }
    return guarded
  }

  const end = descriptionAt < 0 ? links.length : descriptionAt
  for (let n = 0; n < end; n++) {
    if (links[n].open < 0) continue
    if (n === 0 || isPeerJoin(links[n].separator)) guarded.push(links[n].open)
  }
  return guarded
}

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
        const footer = `<div class="mt-2 text-right opacity-50 text-xs"><a class="tooltip-source-link" href="${href}">Source</a></div>`
        if (item.critical) {
          const slashList = SLASH_LIST_PAGES.has(state.env?.relativePath ?? '')
          for (const k of findGuardedLinks(children, i, slashList)) {
            if (!children[k].attrGet('data-critical-note'))
              children[k].attrSet('data-critical-note', item.id)
          }
          tooltip.content = `<CriticalBadge ${props} noteId="${item.id}" contentHash="${item.contentHash}">${rendered}${footer}</CriticalBadge>`
        } else {
          tooltip.content = `<Tooltip ${props}>${rendered}${footer}</Tooltip>`
        }

        children.splice(i, j - i + 1, tooltip)
      }
    }
  })
}
