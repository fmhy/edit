export const LINK_SELECTOR = 'a[href*="://"]'

export function normalizePagePath(page: string, base = '/') {
  let path = page.trim()

  try {
    path = new URL(path, window.location.href).pathname
  } catch {
    path = path.split(/[?#]/)[0] || '/'
  }

  if (!path.startsWith('/')) path = `/${path}`
  if (base && base !== '/' && path.startsWith(base)) {
    path = path.slice(base.length) || '/'
  }
  path = path.replace(/\/index(?:\.html)?$/, '/').replace(/\.html$/, '')

  return path.replace(/\/$/, '') || '/'
}

const EXCLUDED_ANCESTORS = [
  '.fmhy-link-wrap',
  '.link-card',
  '.custom-block',
  '.VPLocalSearchBox',
  '.feedback-footer',
  '.fmhy-saved-list'
]

export function normalizeBookmarkUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.href)
    parsed.hash = ''
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')

    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1)
    }

    return parsed.href
  } catch {
    return url.trim()
  }
}

export function bookmarkUrlsMatch(stored: string, candidate: string): boolean {
  return normalizeBookmarkUrl(stored) === normalizeBookmarkUrl(candidate)
}

export function resolveLinkHref(link: HTMLAnchorElement): string {
  const attr = link.getAttribute('href')?.trim()
  if (!attr) return link.href

  try {
    return new URL(attr, window.location.href).href
  } catch {
    return link.href
  }
}

export function isEligibleLink(link: HTMLAnchorElement) {
  if (link.closest('.fmhy-link-wrap')) return false
  if (EXCLUDED_ANCESTORS.some((selector) => link.closest(selector)))
    return false
  if (!link.textContent?.trim()) return false

  const href = link.getAttribute('href') || ''
  return /^https?:\/\//i.test(href) || href.startsWith('//')
}

export function getMainLink(li: HTMLLIElement) {
  for (const link of li.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (isEligibleLink(link)) return link
  }
  return null
}

export function captureRowHtml(li: HTMLLIElement): string {
  const clone = li.cloneNode(true) as HTMLLIElement

  clone
    .querySelectorAll('.fmhy-bookmark-tooltip, .fmhy-bookmark-inline')
    .forEach((el) => el.remove())
  clone.querySelectorAll('.fmhy-link-wrap').forEach((wrap) => {
    const parent = wrap.parentNode
    if (!parent) return

    while (wrap.firstChild) parent.insertBefore(wrap.firstChild, wrap)
    parent.removeChild(wrap)
  })

  return clone.innerHTML.trim()
}

export function extractRowFromLi(li: HTMLLIElement) {
  return {
    html: captureRowHtml(li),
    classes: li.className.replace(/\bfmhy-saved-item\b/g, '').trim()
  }
}

export function buildPageRowMap(root: ParentNode) {
  const map = new Map<string, ReturnType<typeof extractRowFromLi>>()

  root.querySelectorAll<HTMLLIElement>('li').forEach((li) => {
    const link = getMainLink(li)
    if (!link) return

    const href = resolveLinkHref(link)
    if (!href) return

    map.set(normalizeBookmarkUrl(href), extractRowFromLi(li))
  })

  return map
}

export function findRowInMap(
  map: Map<string, ReturnType<typeof extractRowFromLi>>,
  url: string
) {
  const direct = map.get(normalizeBookmarkUrl(url))
  if (direct) return direct

  for (const [key, value] of map) {
    if (bookmarkUrlsMatch(url, key)) return value
  }

  return null
}
