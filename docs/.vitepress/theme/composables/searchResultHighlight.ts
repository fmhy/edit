import Mark from 'mark.js'

const SEARCH_RESULT_HIGHLIGHT_KEY = 'fmhy:search-result-highlight'
const SEARCH_RESULT_MARK_CLASS = 'search-result-highlight'
const SEARCH_RESULT_CURRENT_CLASS = 'search-result-highlight-current'
const SEARCH_RESULT_TARGET_CLASS = 'search-result-highlight-target'
const SEARCH_RESULT_STALE_MS = 5 * 60 * 1000

interface SearchableResult {
  id: string
  match?: Record<string, unknown>
}

interface SearchResultHighlightPayload {
  resultId: string
  terms: string[]
  createdAt: number
}

function normalizePath(path: string) {
  const [pathname] = path.split(/[?#]/)
  const withoutHtml = pathname.replace(/\.html$/, '')
  const normalized = withoutHtml.replace(/\/index$/, '/').replace(/\/$/, '')
  return normalized || '/'
}

function getResultAnchor(resultId: string) {
  const [, rawAnchor] = resultId.split('#')
  return rawAnchor ? decodeURIComponent(rawAnchor) : null
}

function getResultPath(resultId: string) {
  const [path] = resultId.split('#')
  return normalizePath(path)
}

function getCurrentPath() {
  return normalizePath(window.location.pathname)
}

function readPayload(): SearchResultHighlightPayload | null {
  if (typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(SEARCH_RESULT_HIGHLIGHT_KEY)
  if (!raw) return null

  try {
    const payload = JSON.parse(raw) as SearchResultHighlightPayload
    if (!payload?.resultId || !Array.isArray(payload.terms) || !payload.createdAt) {
      window.sessionStorage.removeItem(SEARCH_RESULT_HIGHLIGHT_KEY)
      return null
    }

    if (Date.now() - payload.createdAt > SEARCH_RESULT_STALE_MS) {
      window.sessionStorage.removeItem(SEARCH_RESULT_HIGHLIGHT_KEY)
      return null
    }

    return payload
  } catch {
    window.sessionStorage.removeItem(SEARCH_RESULT_HIGHLIGHT_KEY)
    return null
  }
}

function writePayload(payload: SearchResultHighlightPayload) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(SEARCH_RESULT_HIGHLIGHT_KEY, JSON.stringify(payload))
}

function clearPayload() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(SEARCH_RESULT_HIGHLIGHT_KEY)
}

function getContentRoot() {
  return document.querySelector('.VPDoc .vp-doc') as HTMLElement | null
}

function getTargetElement(resultId: string, contentRoot: HTMLElement) {
  const anchor = getResultAnchor(resultId)
  if (!anchor) return null

  const target = document.getElementById(anchor)
  if (!target || !contentRoot.contains(target)) return null

  return (target.closest('h1, h2, h3, h4, h5, h6') ?? target) as HTMLElement
}

function getSectionNodes(contentRoot: HTMLElement, target: HTMLElement | null) {
  if (!target) return [contentRoot]

  const heading = target.closest('h1, h2, h3, h4, h5, h6')
  if (!heading || !contentRoot.contains(heading)) return [target]

  const scopes: HTMLElement[] = [heading as HTMLElement]
  let sibling = heading.nextElementSibling

  while (sibling && !/^H[1-6]$/.test(sibling.tagName)) {
    scopes.push(sibling as HTMLElement)
    sibling = sibling.nextElementSibling
  }

  return scopes
}

function getEntryBlock(element: HTMLElement) {
  return element.closest('li, tr, p, blockquote, pre, table') as HTMLElement | null
}

function dedupeElements(elements: Iterable<HTMLElement>) {
  return [...new Set(elements)]
}

function wait(ms = 50) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function dedupeTerms(terms: Iterable<string>) {
  return [...new Set([...terms].map((term) => term.trim()).filter(Boolean))]
}

export function collectHighlightTerms(
  result: SearchableResult,
  filterText: string,
  isFuzzySearch: boolean
) {
  if (isFuzzySearch) {
    return dedupeTerms(Object.keys(result.match ?? {}))
  }

  return dedupeTerms([filterText])
}

export function formMarkRegex(terms: Iterable<string>) {
  const normalizedTerms = dedupeTerms(terms)
  if (!normalizedTerms.length) return null

  const escapedTerms = normalizedTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  return new RegExp(
    escapedTerms
      .sort((a, b) => b.length - a.length)
      .map((term) => `(${term})`)
      .join('|'),
    'gi'
  )
}

export function queueSearchResultHighlight(
  result: SearchableResult,
  filterText: string,
  isFuzzySearch: boolean
) {
  if (typeof window === 'undefined') return

  const terms = collectHighlightTerms(result, filterText, isFuzzySearch)

  writePayload({
    resultId: result.id,
    terms,
    createdAt: Date.now()
  })
}

export async function clearSearchResultHighlight() {
  if (typeof document === 'undefined') return

  document.querySelectorAll(`.${SEARCH_RESULT_TARGET_CLASS}`).forEach((element) => {
    element.classList.remove(SEARCH_RESULT_TARGET_CLASS)
  })

  const contentRoot = getContentRoot()
  if (!contentRoot) return

  await new Promise<void>((resolve) => {
    new Mark(contentRoot).unmark({ done: resolve })
  })
}

export async function syncSearchResultHighlight(maxRetries = 8) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const payload = readPayload()
  if (!payload) return

  if (getResultPath(payload.resultId) !== getCurrentPath()) {
    return
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const contentRoot = getContentRoot()

    if (!contentRoot) {
      await wait()
      continue
    }

    await clearSearchResultHighlight()

    const target = getTargetElement(payload.resultId, contentRoot)
    const sectionScopes = getSectionNodes(contentRoot, target)
    const regex = formMarkRegex(payload.terms)
    const marks: HTMLElement[] = []

    if (regex) {
      await Promise.all(
        sectionScopes.map(
          (scope) =>
            new Promise<void>((resolve) => {
              new Mark(scope).markRegExp(regex, {
                acrossElements: true,
                separateWordSearch: false,
                className: SEARCH_RESULT_MARK_CLASS,
                exclude: ['.header-anchor'],
                each: (node) => {
                  marks.push(node as HTMLElement)
                },
                done: resolve
              })
            })
        )
      )
    }

    const targetScopes = dedupeElements(
      marks.map((mark) => getEntryBlock(mark)).filter((scope): scope is HTMLElement => Boolean(scope))
    )

    targetScopes.forEach((scope) => {
      scope.classList.add(SEARCH_RESULT_TARGET_CLASS)
    })

    const activeMark = marks[0]
    if (activeMark) {
      activeMark.classList.add(SEARCH_RESULT_CURRENT_CLASS)
      activeMark.scrollIntoView({ block: 'center', behavior: 'smooth' })
    } else {
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }

    clearPayload()
    return
  }
}
