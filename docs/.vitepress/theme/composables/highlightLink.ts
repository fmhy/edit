/**
 * Line highlight for links carrying ?hl=<resource-url> (the What's New page).
 * After navigation we find the page link whose href matches, flash its line,
 * then leave a persistent highlight until the next click.
 */

let activeId = 0
let dismissListener: (() => void) | null = null

export function clearLinkHighlight(): void {
  activeId++
  if (typeof document === 'undefined') return
  document.querySelector('.vp-hl-target')?.classList.remove('vp-hl-target')
  if (dismissListener) {
    document.removeEventListener('pointerdown', dismissListener)
    dismissListener = null
  }
}

/**
 * Flash then persistently highlight the list item containing a link to `url`,
 * scoped to the section named by `hash` when it exists. Retries briefly while
 * the page finishes rendering; self-cancels if another call or navigation
 * supersedes it.
 */
export function scheduleLinkHighlight(hash: string, url: string): void {
  clearLinkHighlight()
  const id = activeId
  let attempts = 0

  const tryApply = () => {
    if (id !== activeId || typeof document === 'undefined') return
    attempts++
    if (applyHighlight(hash, url)) return
    if (attempts < 12) setTimeout(tryApply, 120)
  }

  // Let VitePress perform its own anchor scroll first.
  setTimeout(tryApply, 90)
}

function applyHighlight(hash: string, url: string): boolean {
  const contentRoot = document.querySelector('.vp-doc')
  if (!contentRoot) return false

  const escaped = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const links = [...contentRoot.querySelectorAll(`a[href="${escaped}"]`)]
  if (!links.length) return false

  // Prefer the match inside the target section; fall back to the first one.
  let link = links[0]
  let sectionEl: HTMLElement | null = null
  try {
    sectionEl = hash ? document.getElementById(decodeURIComponent(hash)) : null
  } catch {
    /* malformed hash */
  }
  if (sectionEl) {
    const level = headingLevel(sectionEl)
    const boundary = level
      ? [
          ...contentRoot.querySelectorAll(
            Array.from({ length: level }, (_, i) => `h${i + 1}`).join(', ')
          )
        ].find(
          (h) =>
            (sectionEl.compareDocumentPosition(h) &
              Node.DOCUMENT_POSITION_FOLLOWING) !==
            0
        )
      : null
    const inSection = links.find(
      (a) =>
        (sectionEl.compareDocumentPosition(a) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
          0 &&
        (!boundary ||
          (boundary.compareDocumentPosition(a) &
            Node.DOCUMENT_POSITION_FOLLOWING) ===
            0)
    )
    if (inSection) link = inSection
  }

  const line = link.closest('li, p, td')
  if (!line) return false

  line.classList.add('vp-hl-target')
  line.scrollIntoView({ block: 'center' })

  dismissListener = () => {
    line.classList.remove('vp-hl-target')
    dismissListener = null
  }
  document.addEventListener('pointerdown', dismissListener, { once: true })
  return true
}

function headingLevel(el: Element): number {
  const match = /^h(\d)$/i.exec(el.tagName)
  return match ? parseInt(match[1], 10) : 0
}
