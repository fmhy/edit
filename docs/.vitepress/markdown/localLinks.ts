import type { MarkdownRenderer } from 'vitepress'

const FMHY_ORIGIN_RE = /^(?:https?:)?\/\/fmhy\.net(?=\/|[?#]|$)/i

// Specific fmhy.net links on website-only pages that intentionally point to
// the main fmhy.net domain rather than staying on the active mirror.
const EXCLUDED_PATHS_BY_FILE: Record<string, Set<string>> = {
  'other/backups.md': new Set(['/', '/other/backups']),
  'posts/search.md': new Set(['/posts/search'])
}

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

    const relativePath =
      typeof env?.relativePath === 'string'
        ? env.relativePath.replace(/\\/g, '/')
        : ''
    const normalizedPath =
      (path.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/'
    if (EXCLUDED_PATHS_BY_FILE[relativePath]?.has(normalizedPath)) {
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
