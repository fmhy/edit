import type { MarkdownRenderer } from 'vitepress'
import { headers } from '../transformer/constants'

const titles = Object.keys(headers).map((key) => headers[key].title)

export const headersPlugin = (md: MarkdownRenderer) => {
  // Add the Feedback component after the heading and close the container
  md.renderer.rules.heading_close = (tokens, idx, options, env, self) => {
    const result = self.renderToken(tokens, idx, options)
    const heading = tokens[idx - 1]
    const level = tokens[idx].tag.slice(1)
    if (!titles.includes(env.frontmatter.title) || level !== '2') return result

    return `<Feedback heading="${heading.content}" />${result}`
  }
}
