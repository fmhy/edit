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
export const pendingScrollQuery = ref<string | null>(null)

// Active scroll operation ID — incremented on every new schedule call
// so stale attempts from previous navigations abort themselves.
let activeScrollId = 0

// Active MutationObserver, disconnected when a new scroll is scheduled
// or when a match is found.
let activeObserver: MutationObserver | null = null

/**
 * After navigating to a section heading, scroll down to the first element
 * whose text content matches (any word of) the search query.
 *
 * @param sectionEl  The heading element for the target section (may be null)
 * @param query      The raw search query string
 * @returns true if a match was found and scrolled to, false otherwise
 */
export function scrollToMatchInSection(
  sectionEl: HTMLElement | null,
  query: string
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
          sectionEl.compareDocumentPosition(h) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ) {
          nextBoundary = h
          break
        }
      }
    }

    for (const el of allElements) {
      if (
        !(
          sectionEl.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING
        )
      ) {
        continue
      }

      if (
        nextBoundary &&
        nextBoundary.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        break
      }

      candidates.push(el)
    }
  }

  if (candidates.length === 0) return false

  // Find the best matching element using a multi-pass strategy.
  let bestMatch: Element | null = null

  // Check <a> tags inside candidates for precise matching
  // (link text is often the actual item name, e.g. "Moe TTS")
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

  // First pass: exact link text match (most precise)
  for (const el of candidates) {
    if (linkMatchesQuery(el)) {
      bestMatch = el
      break
    }
  }

  // Second pass: full query phrase in element text
  if (!bestMatch) {
    for (const el of candidates) {
      const text = (el.textContent ?? '').toLowerCase()
      if (text.includes(queryLower)) {
        bestMatch = el
        break
      }
    }
  }

  // Third pass: all query words present in element text
  if (!bestMatch) {
    for (const el of candidates) {
      const text = (el.textContent ?? '').toLowerCase()
      if (queryWords.every((w) => text.includes(w))) {
        bestMatch = el
        break
      }
    }
  }

  // Fourth pass: any query word in element text
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

  const navEl = document.querySelector('.VPNavBar')
  const navHeight = navEl ? navEl.clientHeight : 64
  const targetY = Math.max(
    0,
    el.getBoundingClientRect().top + window.scrollY - navHeight - 24
  )

  // Force instant scroll — override any CSS smooth scroll that may be active.
  const htmlEl = document.documentElement
  const prevBehavior = htmlEl.style.scrollBehavior
  htmlEl.style.scrollBehavior = 'auto'
  window.scrollTo({ top: targetY, behavior: 'auto' as ScrollBehavior })
  // Restore original scroll-behavior after the browser processes the scroll
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      htmlEl.style.scrollBehavior = prevBehavior
    })
  })

  // Add a temporary flash highlight
  el.classList.add('vp-search-highlight-target')
  setTimeout(() => el.classList.remove('vp-search-highlight-target'), 2000)
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
}

/**
 * Wait for the page DOM to be ready, then attempt to scroll to the match.
 * Uses polling retries AND a MutationObserver fallback for robustness.
 *
 * @param hash        The URL hash (without #) identifying the section heading
 * @param query       The search query text to find within the section
 * @param initialDelay Extra delay (ms) before the first attempt, e.g. to wait
 *                     for a scroll animation to finish. Defaults to 150.
 */
export function scheduleScrollToMatch(
  hash: string,
  query: string,
  initialDelay = 150
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

  function tryScroll(): boolean {
    if (isStale()) return true // treat stale as "done" to stop retrying

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
    const found = scrollToMatchInSection(sectionEl, query)
    if (found) {
      // Success — clean up observer
      if (activeObserver && !isStale()) {
        activeObserver.disconnect()
        activeObserver = null
      }
    }
    return found
  }

  function poll() {
    if (isStale()) return

    attempts++
    const found = tryScroll()
    if (found) return

    if (attempts < maxAttempts) {
      setTimeout(poll, intervalMs)
    } else {
      // All polling attempts exhausted — fall back to MutationObserver.
      // This catches lazy-loaded content, async components, etc.
      startObserver()
    }
  }

  function startObserver() {
    if (isStale()) return

    const contentRoot = document.querySelector('.vp-doc')
    if (!contentRoot) return

    // Watch for new child nodes being added to the content area
    activeObserver = new MutationObserver(() => {
      if (isStale()) {
        activeObserver?.disconnect()
        activeObserver = null
        return
      }
      const found = tryScroll()
      if (found) {
        activeObserver?.disconnect()
        activeObserver = null
      }
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
    }, 5000)
  }

  // First attempt after a frame + initial delay
  requestAnimationFrame(() => {
    if (isStale()) return
    setTimeout(poll, initialDelay)
  })
}

function getHeadingLevel(el: Element): number {
  const match = /^h(\d)$/i.exec(el.tagName)
  return match ? parseInt(match[1], 10) : 0
}
