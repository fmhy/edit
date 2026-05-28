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

  // Determine the DOM subtree to search within.
  // VitePress renders content inside `.vp-doc` containers.
  const contentRoot =
    sectionEl?.closest('.vp-doc') ?? document.querySelector('.vp-doc')
  if (!contentRoot) return

  // Collect all content elements (paragraphs, list items, table cells, etc.)
  // that follow the section heading in document order.
  const candidates: Element[] = []
  const allElements = contentRoot.querySelectorAll('p, li, td, dd, blockquote')

  let pastHeading = !sectionEl // If no section heading, scan everything
  for (const el of allElements) {
    if (!pastHeading) {
      // Check if this element comes after the section heading
      if (
        sectionEl!.compareDocumentPosition(el) &
        Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        pastHeading = true
      } else {
        continue
      }
    }

    // Stop if we've reached the next heading of same or higher level
    // (meaning we've left the target section)
    if (sectionEl && pastHeading) {
      const prevHeading = findPrecedingHeading(el)
      if (prevHeading && prevHeading !== sectionEl) {
        const sectionLevel = getHeadingLevel(sectionEl)
        const prevLevel = getHeadingLevel(prevHeading)
        if (sectionLevel > 0 && prevLevel > 0 && prevLevel <= sectionLevel) {
          break
        }
      }
    }

    candidates.push(el)
  }

  // Find the first candidate whose text matches the query
  let bestMatch: Element | null = null

  // First pass: try to find an element containing the full query phrase
  for (const el of candidates) {
    const text = (el.textContent ?? '').toLowerCase()
    if (text.includes(queryLower)) {
      bestMatch = el
      break
    }
  }

  // Second pass: if no phrase match, find the first element matching all words
  if (!bestMatch) {
    for (const el of candidates) {
      const text = (el.textContent ?? '').toLowerCase()
      if (queryWords.every((w) => text.includes(w))) {
        bestMatch = el
        break
      }
    }
  }

  // Third pass: find element matching any word
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

  const navEl = document.querySelector('.VPNavBar')
  const navHeight = navEl ? navEl.clientHeight : 64
  const targetY = Math.max(
    0,
    bestMatch.getBoundingClientRect().top + window.scrollY - navHeight - 24
  )

  window.scrollTo({ top: targetY, behavior: 'smooth' })

  // Add a temporary flash highlight
  bestMatch.classList.add('vp-search-highlight-target')
  const cleanup = () =>
    bestMatch!.classList.remove('vp-search-highlight-target')
  setTimeout(cleanup, 1500)
}

function getHeadingLevel(el: Element): number {
  const match = /^h(\d)$/i.exec(el.tagName)
  return match ? parseInt(match[1], 10) : 0
}

function findPrecedingHeading(el: Element): Element | null {
  let sibling: Element | null = el.previousElementSibling
  while (sibling) {
    if (/^h[1-6]$/i.test(sibling.tagName)) return sibling
    sibling = sibling.previousElementSibling
  }
  return null
}
