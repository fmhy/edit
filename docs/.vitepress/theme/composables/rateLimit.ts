/**
 * Client-side mirror of the Worker's RATE_LIMITER binding
 */
const STORAGE_KEY = 'fmhy-feedback-submissions'
const LIMIT = 5
const PERIOD_MS = 60 * 1000

const hasDOM = typeof window !== 'undefined'

function readTimestamps(): number[] {
  if (!hasDOM) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((n): n is number => typeof n === 'number')
      : []
  } catch {
    return []
  }
}

function pruneToWindow(timestamps: number[]): number[] {
  const now = Date.now()
  return timestamps.filter((t) => now - t < PERIOD_MS)
}

export function getRateLimitCooldown(): number {
  const recent = pruneToWindow(readTimestamps())
  if (recent.length < LIMIT) return 0
  const oldest = Math.min(...recent)
  return Math.max(0, Math.ceil((PERIOD_MS - (Date.now() - oldest)) / 1000))
}

export function recordSubmission(): void {
  if (!hasDOM) return
  const recent = pruneToWindow(readTimestamps())
  recent.push(Date.now())
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
  } catch {
    // localStorage unavailable (private-mode quota, disabled storage, etc.) - fail open
  }
}
