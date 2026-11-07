/**
 * Persistence for critical-note "Don't show again" dismissals.
 * Mirrors the fail-open localStorage pattern in rateLimit.ts.
 */
const STORAGE_KEY = 'fmhy-critical-notes-dismissed'
const hasDOM = typeof window !== 'undefined'

function readDismissed(): Record<string, string> {
  if (!hasDOM) return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string'
        )
      )
    }
    return {}
  } catch {
    return {}
  }
}

export function isCriticalDismissed(id: string, contentHash: string): boolean {
  // Dismissed only if the stored hash still matches the note's current content.
  // Editing a critical note changes its hash and re-prompts all users.
  return readDismissed()[id] === contentHash
}

export function dismissCritical(id: string, contentHash: string): void {
  if (!hasDOM) return
  const dismissed = readDismissed()
  dismissed[id] = contentHash
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed))
  } catch {
    // localStorage unavailable (private-mode quota, disabled storage, etc.) - fail open
  }
}
