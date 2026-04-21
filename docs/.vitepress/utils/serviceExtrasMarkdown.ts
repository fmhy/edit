import type { MarkdownRenderer } from 'vitepress'
import {
  buildTrigger,
  createServiceExtraEntry,
  isCompanionTitle,
  parseExtraItems,
  parseServiceLine,
  toPlainText
} from './serviceExtras'

function findListItemClose(tokens: MarkdownRenderer['core']['State']['prototype']['tokens'], start: number) {
  for (let index = start; index < tokens.length; index++) {
    if (tokens[index].type === 'list_item_close') return index
  }

  return -1
}

export function replaceServiceExtras(md: MarkdownRenderer) {
  md.core.ruler.after('inline', 'service-extras', (state) => {
    for (let index = 0; index < state.tokens.length; index++) {
      if (state.tokens[index].type !== 'list_item_open') continue

      const inlineIndex = index + 2
      const inlineToken = state.tokens[inlineIndex]
      if (!inlineToken || inlineToken.type !== 'inline' || !inlineToken.children) continue

      const currentItem = parseServiceLine(inlineToken.content)
      if (!currentItem) continue

      const groups: Array<{ title: string; items: ReturnType<typeof parseExtraItems>; contentText: string }> = []
      const removals: Array<{ start: number; end: number }> = []
      let nextIndex = findListItemClose(state.tokens, index) + 1

      while (nextIndex > 0 && nextIndex < state.tokens.length) {
        if (state.tokens[nextIndex].type !== 'list_item_open') break

        const nextInlineIndex = nextIndex + 2
        const nextInlineToken = state.tokens[nextInlineIndex]
        if (!nextInlineToken || nextInlineToken.type !== 'inline') break

        const nextItem = parseServiceLine(nextInlineToken.content)
        if (!nextItem || !isCompanionTitle(nextItem.titlePlain, currentItem.primaryLabel)) {
          break
        }

        const items = parseExtraItems(nextItem.body)
        if (!items.length) break

        groups.push({
          title: nextItem.titlePlain,
          items,
          contentText: toPlainText(nextItem.body)
        })

        const closeIndex = findListItemClose(state.tokens, nextIndex)
        if (closeIndex === -1) break

        removals.push({ start: nextIndex, end: closeIndex })
        nextIndex = closeIndex + 1
      }

      if (!groups.length) continue

      const entry = createServiceExtraEntry(currentItem, groups)
      const htmlToken = new state.Token('html_inline', '', 0)
      htmlToken.content = ` ${buildTrigger(entry)}`
      inlineToken.children.push(htmlToken)

      for (let removalIndex = removals.length - 1; removalIndex >= 0; removalIndex--) {
        const removal = removals[removalIndex]
        state.tokens.splice(removal.start, removal.end - removal.start + 1)
      }
    }
  })
}
