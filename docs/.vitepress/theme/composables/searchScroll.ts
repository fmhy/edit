import { ref } from 'vue'

/**
 * When non-null, the router's onAfterRouteChanged hook will attempt to scroll
 * to the first text node matching this query inside the target section.
 * Set by VPLocalSearchBox before calling router.go(); consumed (and cleared)
 * by the route hooks after verifying the destination path.
 */
export const pendingScrollQuery = ref<{
  query: string
  matchContext: string | null
  /**
   * Destination path (without hash) of the search navigation. The router hook
   * compares this against the actual navigation target so a stale query from
   * an aborted/superseded navigation is never consumed on the wrong page.
   */
  path: string
} | null>(null)

// Active scroll operation ID — incremented on every new schedule call
// so stale attempts from previous navigations abort themselves.
let activeScrollId = 0

// Active highlight timeout, cleared when a new highlight is applied
// or when the scroll operation is cancelled.
let highlightTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * After navigating to a section heading, scroll down to the first element
 * whose text content matches (any word of) the search query.
 *
 * @param sectionEl    The heading element for the target section (may be null)
 * @param query        The raw search query string
 * @param matchContext Optional text content of the specific match the user
 *                     was looking at in the search excerpt. When provided,
 *                     this is used as the primary match target so the correct
 *                     element is scrolled to (not just the first match).
 * @returns true if a match was found and scrolled to, false otherwise
 */
export function scrollToMatchInSection(
  sectionEl: HTMLElement | null,
  query: string,
  matchContext: string | null = null
): boolean {
  if (!query.trim()) return false

  const queryLower = query.trim().toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(Boolean)
  if (queryWords.length === 0) return false

  const contentRoot =
    sectionEl?.closest('.vp-doc') ?? document.querySelector('.vp-doc')
  if (!contentRoot) return false

  // Collect candidate elements that belong to this section.
  const candidates: Element[] = []
  const allElements = contentRoot.querySelectorAll('p, li, td, dd, blockquote')

  if (!sectionEl) {
    // No section heading — scan everything
    for (const el of allElements) candidates.push(el)
  } else {
    const sectionLevel = getHeadingLevel(sectionEl)
    let nextBoundary: Element | null = null

    if (sectionLevel > 0) {
      const headingSelectors: string[] = []
      for (let i = 1; i <= sectionLevel; i++) headingSelectors.push(`h${i}`)
      const allHeadings = contentRoot.querySelectorAll(
        headingSelectors.join(', ')
      )
      for (const h of allHeadings) {
        if (
          (sectionEl.compareDocumentPosition(h) &
            Node.DOCUMENT_POSITION_FOLLOWING) !==
          0
        ) {
          nextBoundary = h
          break
        }
      }
    }

    for (const el of allElements) {
      if (
        (sectionEl.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING) ===
        0
      ) {
        continue
      }

      if (
        nextBoundary &&
        (nextBoundary.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
          0
      ) {
        break
      }

      candidates.push(el)
    }
  }

  if (candidates.length === 0) return false

  // Find the best matching element using a multi-pass strategy.
  let bestMatch: Element | null = null

  // Normalize match context for comparison
  const contextLower = matchContext?.trim().toLowerCase() || null

  // Check <a> tags inside candidates for precise matching
  const linkMatchesQuery = (el: Element): boolean => {
    const links = el.querySelectorAll('a')
    for (const link of links) {
      const linkText = (link.textContent ?? '').trim().toLowerCase()
      if (linkText.length === 0) continue
      if (linkText.includes(queryLower) || queryLower.includes(linkText)) {
        return true
      }
    }
    return false
  }

  // Pass 0 (highest priority): Match by context from the excerpt.
  // When the user navigated to a specific match in the excerpt, we know the
  // text content of that match's container. Find the page element that best
  // matches this context text.
  if (contextLower && contextLower.length > 0) {
    // Try exact text content match first
    for (const el of candidates) {
      const text = (el.textContent ?? '').trim().toLowerCase()
      if (text === contextLower) {
        bestMatch = el
        break
      }
    }

    // Then try containment matching (context contains element or vice versa)
    if (!bestMatch) {
      for (const el of candidates) {
        const text = (el.textContent ?? '').trim().toLowerCase()
        if (text.length > 10 && contextLower.includes(text)) {
          bestMatch = el
          break
        }
        if (contextLower.length > 10 && text.includes(contextLower)) {
          bestMatch = el
          break
        }
      }
    }
  }

  // Pass 1: exact link text match
  if (!bestMatch) {
    for (const el of candidates) {
      if (linkMatchesQuery(el)) {
        bestMatch = el
        break
      }
    }
  }

  // Pass 2: full query phrase in element text
  if (!bestMatch) {
    for (const el of candidates) {
      const text = (el.textContent ?? '').toLowerCase()
      if (text.includes(queryLower)) {
        bestMatch = el
        break
      }
    }
  }

  // Pass 3: all query words present in element text
  if (!bestMatch) {
    for (const el of candidates) {
      const text = (el.textContent ?? '').toLowerCase()
      if (queryWords.every((w) => text.includes(w))) {
        bestMatch = el
        break
      }
    }
  }

  // Pass 4: any query word in element text
  if (!bestMatch) {
    for (const el of candidates) {
      const text = (el.textContent ?? '').toLowerCase()
      if (queryWords.some((w) => text.includes(w))) {
        bestMatch = el
        break
      }
    }
  }

  if (!bestMatch) return false

  // Don't scroll if the match IS the section heading itself
  if (sectionEl && bestMatch === sectionEl) return false

  doScrollAndHighlight(bestMatch)
  return true
}

function doScrollAndHighlight(el: Element): void {
  // Remove any existing highlight from a previous scroll
  const prev = document.querySelector('.vp-search-highlight-target')
  if (prev) {
    prev.classList.remove(
      'vp-search-highlight-target',
      'vp-search-scroll-target'
    )
  }
  if (highlightTimeout) {
    clearTimeout(highlightTimeout)
    highlightTimeout = null
  }

  el.classList.add('vp-search-scroll-target')
  el.scrollIntoView({ block: 'start' })

  // Add a temporary highlight (uses outline, no layout shift).
  el.classList.add('vp-search-highlight-target')
  highlightTimeout = setTimeout(() => {
    el.classList.remove('vp-search-highlight-target', 'vp-search-scroll-target')
  }, 2000)
}

/**
 * Cancel any in-progress scroll-to-match operation. Call this before starting
 * a new one or when the user navigates away.
 */
export function cancelPendingScroll(): void {
  activeScrollId++
  if (highlightTimeout) {
    clearTimeout(highlightTimeout)
    highlightTimeout = null
  }
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('vp-search-scrolling')
    document
      .querySelector('.vp-search-scroll-target')
      ?.classList.remove('vp-search-scroll-target')
  }
}

/**
 * Wait for Vue to paint the page, then scroll to the match.
 *
 * @param hash         The URL hash (without #) identifying the section heading
 * @param query        The search query text to find within the section
 * @param initialDelay Extra delay (ms) before the first attempt. Defaults to 16.
 * @param matchContext Optional text content identifying the specific match
 */
export function scheduleScrollToMatch(
  hash: string,
  query: string,
  initialDelay = 16,
  matchContext: string | null = null
): void {
  cancelPendingScroll()

  // Lock the navbar in place during the scroll operation to prevent layout shifts
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('vp-search-scrolling')
  }

  const scrollId = activeScrollId

  function scrollToMatch() {
    if (scrollId !== activeScrollId) return

    let sectionEl: HTMLElement | null = null
    if (hash) {
      try {
        sectionEl = document.getElementById(decodeURIComponent(hash))
      } catch {
        /* malformed URI */
      }
    }

    if (!hash || sectionEl) {
      scrollToMatchInSection(sectionEl, query, matchContext)
    }

    setTimeout(() => {
      if (scrollId === activeScrollId) {
        document.documentElement.classList.remove('vp-search-scrolling')
      }
    }, 100)
  }

  requestAnimationFrame(() => {
    if (scrollId === activeScrollId) setTimeout(scrollToMatch, initialDelay)
  })
}

function getHeadingLevel(el: Element): number {
  const match = /^h(\d)$/i.exec(el.tagName)
  return match ? parseInt(match[1], 10) : 0
}
