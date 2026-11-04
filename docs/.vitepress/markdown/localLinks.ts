import type { MarkdownRenderer } from 'vitepress'

const FMHY_ORIGIN_RE = /^(?:https?:)?\/\/fmhy\.net(?=\/|[?#]|$)/i

export function localLinksPlugin(md: MarkdownRenderer, base: string) {
  const defaultRender = md.renderer.rules.link_open!

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const href = token.attrGet('href') || ''
    if (!FMHY_ORIGIN_RE.test(href)) {
      return defaultRender(tokens, idx, options, env, self)
    }

    const path = href.replace(FMHY_ORIGIN_RE, '')
    // A leading // would become an external, protocol-relative URL on a mirror.
    if (path.startsWith('//')) {
      return defaultRender(tokens, idx, options, env, self)
    }

    token.attrSet(
      'href',
      base.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`)
    )
    // Raw Markdown exports are files, not pages handled by the client router.
    if (/\.md(?:[?#]|$)/i.test(path) && !token.attrGet('target')) {
      token.attrSet('target', '_self')
    }
    // Keep the URL suffix intact, including raw exports such as single-page.md.
    return self.renderToken(tokens, idx, options)
  }
}
