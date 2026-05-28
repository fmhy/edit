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
 * Set by VPLocalSearchBox before calling router.go(); consumed (and cleared)
 * by the theme's enhanceApp router hook.
 */
export const pendingScrollQuery = ref<string | null>(null)

/**
 * After navigating to a section heading, scroll down to the first element
 * whose text content matches (any word of) the search query.
 *
 * @param sectionEl  The heading element for the target section (may be null)
 * @param query      The raw search query string
 */
export function scrollToMatchInSection(
  sectionEl: HTMLElement | null,
  query: string
): void {
  if (!query.trim()) return

  const queryLower = query.trim().toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(Boolean)
  if (queryWords.length === 0) return

  const contentRoot =
    sectionEl?.closest('.vp-doc') ?? document.querySelector('.vp-doc')
  if (!contentRoot) return

  // Collect candidate elements that belong to this section.
  // Walk all content elements after sectionEl and stop when we hit the next
  // heading of same or higher level.
  const candidates: Element[] = []
  const allElements = contentRoot.querySelectorAll('p, li, td, dd, blockquote')

  if (!sectionEl) {
    // No section heading — scan everything
    for (const el of allElements) candidates.push(el)
  } else {
    // Walk the DOM tree to find the next heading boundary.
    // We can't use findPrecedingHeading on nested elements (e.g. <li> inside
    // <ul>) because previousElementSibling only walks siblings, not up to
    // parent containers. Instead, collect all headings at the same or higher
    // level and find which one follows sectionEl.
    const sectionLevel = getHeadingLevel(sectionEl)
    let nextBoundary: Element | null = null

    if (sectionLevel > 0) {
      // Build a selector for headings at same or higher level
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
      // Only include elements after the section heading
      if (
        !(
          sectionEl.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING
        )
      ) {
        continue
      }

      // Stop if we've passed the next section boundary.
      // DOCUMENT_POSITION_FOLLOWING means el comes AFTER nextBoundary.
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

  // Find the best matching element
  let bestMatch: Element | null = null

  // Also check <a> tags inside candidates for more precise matching
  // (link text is often the actual item name, e.g. "Moe TTS")
  const linkMatchesQuery = (el: Element): boolean => {
    const links = el.querySelectorAll('a')
    for (const link of links) {
      const linkText = (link.textContent ?? '').toLowerCase()
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

  if (!bestMatch) return

  // Don't scroll if the match IS the section heading itself
  if (sectionEl && bestMatch === sectionEl) return

  doScrollAndHighlight(bestMatch)
}

function doScrollAndHighlight(el: Element): void {
  const navEl = document.querySelector('.VPNavBar')
  const navHeight = navEl ? navEl.clientHeight : 64
  const targetY = Math.max(
    0,
    el.getBoundingClientRect().top + window.scrollY - navHeight - 24
  )

  // Temporarily force instant scroll to override any ongoing smooth scroll
  const htmlEl = document.documentElement
  const prevBehavior = htmlEl.style.scrollBehavior
  htmlEl.style.scrollBehavior = 'auto'
  window.scrollTo({ top: targetY })
  // Restore after a frame
  requestAnimationFrame(() => {
    htmlEl.style.scrollBehavior = prevBehavior
  })

  // Add a temporary flash highlight
  el.classList.add('vp-search-highlight-target')
  setTimeout(() => el.classList.remove('vp-search-highlight-target'), 2000)
}

/**
 * Wait for the page DOM to be ready, then attempt to scroll to the match.
 * Uses requestAnimationFrame + retries to handle slow page renders.
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
  let attempts = 0
  const maxAttempts = 10
  const intervalMs = 100

  function tryScroll() {
    attempts++
    let sectionEl: HTMLElement | null = null
    if (hash) {
      try {
        sectionEl = document.getElementById(decodeURIComponent(hash))
      } catch {
        /* malformed URI */
      }
    }

    // If the section element exists (or no hash), try scrolling
    if (sectionEl || !hash) {
      scrollToMatchInSection(sectionEl, query)
      return
    }

    // Retry if section element not found yet (page still rendering)
    if (attempts < maxAttempts) {
      setTimeout(tryScroll, intervalMs)
    }
  }

  // First attempt after a frame + delay for render / scroll animation
  requestAnimationFrame(() => {
    setTimeout(tryScroll, initialDelay)
  })
}

function getHeadingLevel(el: Element): number {
  const match = /^h(\d)$/i.exec(el.tagName)
  return match ? parseInt(match[1], 10) : 0
}
