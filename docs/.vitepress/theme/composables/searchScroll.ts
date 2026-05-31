/**
 *  Copyright (c) 2025 taskylizard. Apache License 2.0.
 *
 *  Shared state and utilities for scrolling to the exact matching text
 *  within a section after navigating from a search result.
 */

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

// Pending polling/observer timers for the in-flight scroll operation.
// All are cleared by cancelPendingScroll so rapid re-navigation never leaks
// timers or lets a stale callback act on a newer operation.
let pollTimeout: ReturnType<typeof setTimeout> | null = null
let safetyTimeout: ReturnType<typeof setTimeout> | null = null
let observerDebounceTimer: ReturnType<typeof setTimeout> | null = null

// onComplete callback of the in-flight operation. Held at module scope so
// cancelPendingScroll can fire it exactly once when an operation is cancelled,
// guaranteeing the router never stays stuck with scroll-behavior:'auto'.
let pendingComplete: (() => void) | null = null

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

  // Position the match at ~33% from the top of the viewport for comfortable
  // reading context (the user can see what's above the match).
  const navEl = document.querySelector('.VPNavBar')
  const navHeight = navEl ? navEl.clientHeight : 64
  const htmlEl = el as HTMLElement

  // scroll-margin-top makes scrollIntoView({ block: 'start' }) place the
  // element desiredOffset px below the viewport top — i.e. at ~33%.
  const desiredOffset = Math.max(
    navHeight + 24,
    Math.floor(window.innerHeight * 0.33)
  )
  const prevScrollMargin = htmlEl.style.getPropertyValue('scroll-margin-top')
  htmlEl.style.setProperty('scroll-margin-top', `${desiredOffset}px`)

  // 'instant' bypasses CSS scroll-behavior entirely, so we never need to
  // touch document.documentElement.style.scrollBehavior here. The previous
  // implementation saved/restored scrollBehavior in a double-rAF, which
  // fired AFTER onComplete had already restored it — permanently locking the
  // page into scrollBehavior:'auto' and breaking smooth TOC/anchor scrolling.
  el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })

  // Restore scroll-margin-top after the scroll is committed.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (prevScrollMargin) {
        htmlEl.style.setProperty('scroll-margin-top', prevScrollMargin)
      } else {
        htmlEl.style.removeProperty('scroll-margin-top')
      }
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
  if (pollTimeout) {
    clearTimeout(pollTimeout)
    pollTimeout = null
  }
  if (safetyTimeout) {
    clearTimeout(safetyTimeout)
    safetyTimeout = null
  }
  if (observerDebounceTimer) {
    clearTimeout(observerDebounceTimer)
    observerDebounceTimer = null
  }
  // Remove any leftover highlight from an interrupted scroll so a cancelled
  // navigation never leaves a stale outline on the page.
  if (typeof document !== 'undefined') {
    document
      .querySelector('.vp-search-highlight-target')
      ?.classList.remove('vp-search-highlight-target')
  }
  // Fire the in-flight completion callback exactly once. Without this, a
  // cancelled cross-page scroll would leave document scroll-behavior pinned to
  // 'auto' (the caller restores it in onComplete), breaking smooth scrolling
  // site-wide. complete() is idempotent, so this is safe even if it later
  // fires again from a stale callback.
  const complete = pendingComplete
  pendingComplete = null
  complete?.()
}

/**
 * Wait for the page DOM to be ready, then attempt to scroll to the match.
 * Uses polling retries AND a MutationObserver fallback for robustness.
 *
 * @param hash         The URL hash (without #) identifying the section heading
 * @param query        The search query text to find within the section
 * @param initialDelay Extra delay (ms) before the first attempt. Defaults to 0
 *                     (first attempt on the next animation frame).
 * @param matchContext Optional text content identifying the specific match
 * @param onComplete   Optional callback fired when the scroll completes (or
 *                     all attempts are exhausted). Used by the router to
 *                     defer scroll-behavior restoration until the scroll is done.
 */
export function scheduleScrollToMatch(
  hash: string,
  query: string,
  initialDelay = 0,
  matchContext: string | null = null,
  onComplete?: () => void
): void {
  // Cancel any previous scroll operation
  cancelPendingScroll()

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
      if (pendingComplete === complete) pendingComplete = null
      onComplete?.()
    }
  }
  // Expose this operation's completer so cancelPendingScroll can fire it.
  pendingComplete = complete

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
      complete()
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
      pollTimeout = setTimeout(poll, intervalMs)
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

    // Local handle to THIS observer so stale callbacks only ever disconnect
    // their own observer, never a newer navigation's observer that has since
    // replaced the shared activeObserver.
    const myObserver = new MutationObserver(() => {
      if (isStale()) {
        if (activeObserver === myObserver) activeObserver = null
        myObserver.disconnect()
        complete()
        return
      }
      // Debounce: batch rapid mutations into a single tryScroll call
      if (observerDebounceTimer) clearTimeout(observerDebounceTimer)
      observerDebounceTimer = setTimeout(() => {
        observerDebounceTimer = null
        if (isStale()) return
        const found = tryScroll()
        if (found && activeObserver === myObserver) {
          myObserver.disconnect()
          activeObserver = null
          if (safetyTimeout) {
            clearTimeout(safetyTimeout)
            safetyTimeout = null
          }
        }
      }, 50)
    })
    activeObserver = myObserver

    myObserver.observe(contentRoot, {
      childList: true,
      subtree: true
    })

    // Safety: disconnect observer after 5 seconds to prevent leaks
    const observerScrollId = scrollId
    safetyTimeout = setTimeout(() => {
      if (
        activeObserver === myObserver &&
        observerScrollId === activeScrollId
      ) {
        myObserver.disconnect()
        activeObserver = null
      }
      if (observerDebounceTimer) {
        clearTimeout(observerDebounceTimer)
        observerDebounceTimer = null
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
    pollTimeout = setTimeout(poll, initialDelay)
  })
}

function getHeadingLevel(el: Element): number {
  const match = /^h(\d)$/i.exec(el.tagName)
  return match ? parseInt(match[1], 10) : 0
}
