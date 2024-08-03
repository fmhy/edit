import type { MarkdownRenderer } from 'vitepress'

const excluded = ['Beginners Guide']

export function toggleStarredPlugin(md: MarkdownRenderer) {
  md.renderer.rules.list_item_open = (tokens, index, options, env, self) => {
    const contentToken = tokens[index + 2]
    if (
      !excluded.includes(env.frontmatter.title) &&
      contentToken &&
      contentToken.content.startsWith(':star:')
    ) {
      return `<li class="starred">`
    }
    return self.renderToken(tokens, index, options)
  }
}
