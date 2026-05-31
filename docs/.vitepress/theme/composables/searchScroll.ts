import { ref } from 'vue'

/**
 * When non-null, the router's onAfterRouteChanged hook will attempt to scroll
 * to the first text node matching this query inside the target section.
 * Set by VPLocalSearchBox AFTER calling router.go() (so that onBeforeRouteChange
 * can clear stale values first); consumed (and cleared) by onAfterRouteChanged.
 */
export const pendingScrollQuery = ref<{
  query: string
  matchContext: string | null
} | null>(null)

// Active scroll operation ID — incremented on every new schedule call
// so stale attempts from previous navigations abort themselves.
let activeScrollId = 0

// Active MutationObserver, disconnected when a new scroll is scheduled
// or when a match is found.
let activeObserver: MutationObserver | null = null

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
  if (prev) prev.classList.remove('vp-search-highlight-target')
  if (highlightTimeout) {
    clearTimeout(highlightTimeout)
    highlightTimeout = null
  }

  const navHeight = getNavbarHeight()

  // Place the match at 18% of the remaining viewport height below the navbar
  const viewportHeight =
    typeof window !== 'undefined' ? window.innerHeight : 800
  const remainingHeight = Math.max(200, viewportHeight - navHeight)
  const desiredOffset = navHeight + Math.floor(remainingHeight * 0.18)

  // Calculate the target scroll position relative to the document
  const rect = el.getBoundingClientRect()
  const targetY = Math.max(0, rect.top + window.scrollY - desiredOffset)

  // Force instant scroll by overriding any active smooth scroll behavior in documentElement
  const docEl = document.documentElement
  const prevBehavior = docEl.style.scrollBehavior
  docEl.style.scrollBehavior = 'auto'
  window.scrollTo({
    top: targetY,
    behavior: 'auto'
  })
  // Restore original scroll behavior after layout/paint processes the instant scroll
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      docEl.style.scrollBehavior = prevBehavior
    })
  })

  // Add a temporary highlight (uses outline, no layout shift)
  el.classList.add('vp-search-highlight-target')
  highlightTimeout = setTimeout(
    () => el.classList.remove('vp-search-highlight-target'),
    2000
  )
}

/**
 * Cancel any in-progress scroll-to-match operation. Call this before starting
 * a new one or when the user navigates away.
 */
export function cancelPendingScroll(): void {
  activeScrollId++
  if (activeObserver) {
    activeObserver.disconnect()
    activeObserver = null
  }
  if (highlightTimeout) {
    clearTimeout(highlightTimeout)
    highlightTimeout = null
  }
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('vp-search-scrolling')
  }
}

/**
 * Wait for the page DOM to be ready, then attempt to scroll to the match.
 * Uses polling retries AND a MutationObserver fallback for robustness.
 *
 * @param hash         The URL hash (without #) identifying the section heading
 * @param query        The search query text to find within the section
 * @param initialDelay Extra delay (ms) before the first attempt. Defaults to 150.
 * @param matchContext Optional text content identifying the specific match
 * @param onComplete   Optional callback fired when the scroll completes (or
 *                     all attempts are exhausted). Used by the router to
 *                     defer scroll-behavior restoration until the scroll is done.
 */
export function scheduleScrollToMatch(
  hash: string,
  query: string,
  initialDelay = 150,
  matchContext: string | null = null,
  onComplete?: () => void
): void {
  // Cancel any previous scroll operation
  cancelPendingScroll()

  // Lock the navbar in place during the scroll operation to prevent layout shifts
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('vp-search-scrolling')
  }

  const scrollId = activeScrollId
  let attempts = 0
  const maxAttempts = 15
  const intervalMs = 120

  function isStale(): boolean {
    return scrollId !== activeScrollId
  }

  let completed = false
  function complete() {
    if (!completed) {
      completed = true
      // Always fire onComplete — even when stale — so deferred restoration
      // (e.g. scroll-behavior in the router hook) is never skipped.
      onComplete?.()
      // Only clear the lock if this op is still the active one; a stale op
      // must not remove the class belonging to a newer scroll operation.
      if (!isStale() && typeof document !== 'undefined') {
        document.documentElement.classList.remove('vp-search-scrolling')
      }
    }
  }

  function tryScroll(): boolean {
    if (isStale()) {
      complete() // ensure callback fires even when cancelled
      return true
    }

    let sectionEl: HTMLElement | null = null
    if (hash) {
      try {
        sectionEl = document.getElementById(decodeURIComponent(hash))
      } catch {
        /* malformed URI */
      }
    }

    // If the section heading hasn't rendered yet, we can't match content
    if (hash && !sectionEl) return false

    // Attempt to find and scroll to the matching element
    const found = scrollToMatchInSection(sectionEl, query, matchContext)
    if (found) {
      // Success — clean up observer and notify caller
      if (activeObserver && !isStale()) {
        activeObserver.disconnect()
        activeObserver = null
      }
      // Defer completion to let the browser process the scroll event before unlocking the navbar
      setTimeout(complete, 100)
    }
    return found
  }

  function poll() {
    if (isStale()) {
      complete()
      return
    }

    attempts++
    const found = tryScroll()
    if (found) return

    if (attempts < maxAttempts) {
      setTimeout(poll, intervalMs)
    } else {
      // All polling attempts exhausted — fall back to MutationObserver.
      startObserver()
    }
  }

  function startObserver() {
    if (isStale()) {
      complete()
      return
    }

    const contentRoot = document.querySelector('.vp-doc')
    if (!contentRoot) {
      complete()
      return
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    activeObserver = new MutationObserver(() => {
      if (isStale()) {
        activeObserver?.disconnect()
        activeObserver = null
        complete()
        return
      }
      // Debounce: batch rapid mutations into a single tryScroll call
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        const found = tryScroll()
        if (found) {
          activeObserver?.disconnect()
          activeObserver = null
        }
      }, 50)
    })

    activeObserver.observe(contentRoot, {
      childList: true,
      subtree: true
    })

    // Safety: disconnect observer after 5 seconds to prevent leaks
    const observerScrollId = scrollId
    setTimeout(() => {
      if (activeObserver && observerScrollId === activeScrollId) {
        activeObserver.disconnect()
        activeObserver = null
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      complete()
    }, 5000)
  }

  // First attempt after a frame + initial delay
  requestAnimationFrame(() => {
    if (isStale()) {
      complete()
      return
    }
    setTimeout(poll, initialDelay)
  })
}

function getHeadingLevel(el: Element): number {
  const match = /^h(\d)$/i.exec(el.tagName)
  return match ? parseInt(match[1], 10) : 0
}

function getNavbarHeight(): number {
  if (typeof window === 'undefined') return 64
  let navHeight = 64
  const navHeightVar = getComputedStyle(document.documentElement)
    .getPropertyValue('--vp-nav-height')
    .trim()
  if (navHeightVar) {
    const parsed = parseInt(navHeightVar, 10)
    if (!isNaN(parsed) && parsed > 0) {
      navHeight = parsed
    }
  } else {
    const navEl = document.querySelector('.VPNavBar')
    if (navEl && navEl.clientHeight > 0) {
      navHeight = navEl.clientHeight
    }
  }

  // Account for mobile sub-navigation bar (.VPLocalNav) if visible and stacked below main navbar
  if (window.innerWidth < 960) {
    const localNavEl = document.querySelector('.VPLocalNav')
    if (localNavEl) {
      const rect = localNavEl.getBoundingClientRect()
      if (rect.height > 0) {
        navHeight += rect.height
      }
    }
  }

  return navHeight
}
