import DOMPurify from 'dompurify'

// These helpers are only ever fed content client-side (localStorage, search
// interaction), and DOMPurify needs a real `window`. Guard for SSR so the
// build doesn't try to sanitize without a DOM.
const hasDOM = typeof window !== 'undefined'

/** Sanitize a user-provided SVG string before rendering it via `v-html`. */
export function sanitizeSvg(svg: string | undefined | null): string {
  if (!svg) return ''
  if (!hasDOM) return ''
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true }
  })
}

/**
 * Sanitize a search-result title, keeping only the inline tags used for
 * highlighting and basic emphasis.
 */
export function sanitizeSearchHtml(html: string | undefined | null): string {
  if (!html) return ''
  if (!hasDOM) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['mark', 'span', 'em', 'strong', 'b', 'i', 'code'],
    ALLOWED_ATTR: ['class']
  })
}

/**
 * Sanitize a rich rendered-markdown search excerpt. Uses DOMPurify defaults,
 * which keep formatting/links/code but strip scripts and event handlers.
 */
export function sanitizeRichHtml(html: string | undefined | null): string {
  if (!html) return ''
  if (!hasDOM) return ''
  return DOMPurify.sanitize(html)
}
