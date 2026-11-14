/**
 *  Copyright (c) 2025 taskylizard. Apache License 2.0.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { DurableObject } from 'cloudflare:workers'

/**
 * Globally consistent feedback limits.
 *
 * The Cloudflare rate-limit binding (`RATE_LIMITER`) counts per Cloudflare
 * location, so the same client can spend a fresh budget in every colo it is
 * routed to. A single Durable Object instance (addressed with `idFromName`)
 * keeps one counter for the whole account instead.
 *
 * Limits:
 *   - 3 submissions per IP per 10 minutes
 *   - 10 submissions per IP per 24 hours
 *   - a SHA-256 hash of message + page, remembered for 24 hours, so resent
 *     duplicate text is rejected even when it lands on a different location
 *
 * The caller treats every failure here as "allow": real feedback must never be
 * lost because this component is unavailable.
 */

const TEN_MINUTES_MS = 10 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const SHORT_WINDOW_LIMIT = 3
const DAY_LIMIT = 10

interface Verdict {
  allowed: boolean
  message?: string
  retryAfter?: number
}

interface Row {
  [key: string]: unknown
}

function json(body: Verdict, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

export class FeedbackLimiter extends DurableObject {
  #schemaReady = false

  #sql() {
    // `sql` is only present on SQLite-backed Durable Objects, which is what the
    // `new_sqlite_classes` migration in wrangler.toml declares.
    return (this.ctx as any).storage.sql as {
      exec: (query: string, ...bindings: unknown[]) => any
    }
  }

  #ensureSchema() {
    if (this.#schemaReady) return
    const sql = this.#sql()
    sql.exec(
      'CREATE TABLE IF NOT EXISTS hits (ip TEXT NOT NULL, ts INTEGER NOT NULL)'
    )
    sql.exec(
      'CREATE TABLE IF NOT EXISTS seen (hash TEXT PRIMARY KEY, ts INTEGER NOT NULL)'
    )
    sql.exec('CREATE INDEX IF NOT EXISTS hits_ip_ts ON hits (ip, ts)')
    this.#schemaReady = true
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method !== 'POST' || url.pathname !== '/check') {
      return json({ allowed: false, message: 'Not found' }, 404)
    }

    let payload: { ip?: unknown; hash?: unknown }
    try {
      payload = (await request.json()) as { ip?: unknown; hash?: unknown }
    } catch {
      return json({ allowed: false, message: 'Bad request' }, 400)
    }

    const ip = typeof payload.ip === 'string' ? payload.ip : ''
    const hash = typeof payload.hash === 'string' ? payload.hash : ''
    if (!ip || !hash) {
      return json({ allowed: false, message: 'Bad request' }, 400)
    }

    this.#ensureSchema()

    const sql = this.#sql()
    const now = Date.now()

    // Keep the tables bounded: nothing older than the day window matters.
    sql.exec('DELETE FROM hits WHERE ts <= ?', now - DAY_MS)
    sql.exec('DELETE FROM seen WHERE ts <= ?', now - DAY_MS)

    // Duplicate text (same message and page) is caught regardless of location.
    const seenRows = sql
      .exec('SELECT ts FROM seen WHERE hash = ?', hash)
      .toArray() as Row[]
    if (seenRows.length > 0) {
      return json({
        allowed: false,
        message: 'This feedback was already submitted. Please do not resend it.'
      })
    }

    const shortRows = sql
      .exec(
        'SELECT COUNT(*) AS n FROM hits WHERE ip = ? AND ts > ?',
        ip,
        now - TEN_MINUTES_MS
      )
      .toArray() as Row[]
    const shortCount = Number(shortRows[0]?.n ?? 0)

    if (shortCount >= SHORT_WINDOW_LIMIT) {
      const oldest = Number(
        (
          sql
            .exec(
              'SELECT MIN(ts) AS ts FROM hits WHERE ip = ? AND ts > ?',
              ip,
              now - TEN_MINUTES_MS
            )
            .toArray() as Row[]
        )[0]?.ts ?? now
      )
      return json({
        allowed: false,
        message: `Too many submissions. Try again in ${Math.max(
          1,
          Math.ceil((oldest + TEN_MINUTES_MS - now) / 1000)
        )}s.`,
        retryAfter: Math.max(
          1,
          Math.ceil((oldest + TEN_MINUTES_MS - now) / 1000)
        )
      })
    }

    const dayRows = sql
      .exec('SELECT COUNT(*) AS n FROM hits WHERE ip = ?', ip)
      .toArray() as Row[]
    const dayCount = Number(dayRows[0]?.n ?? 0)

    if (dayCount >= DAY_LIMIT) {
      const oldest = Number(
        (
          sql
            .exec('SELECT MIN(ts) AS ts FROM hits WHERE ip = ?', ip)
            .toArray() as Row[]
        )[0]?.ts ?? now
      )
      const retryAfter = Math.max(1, Math.ceil((oldest + DAY_MS - now) / 1000))
      return json({
        allowed: false,
        message: 'Daily feedback limit reached. Please try again tomorrow.',
        retryAfter
      })
    }

    sql.exec('INSERT INTO hits (ip, ts) VALUES (?, ?)', ip, now)
    sql.exec('INSERT INTO seen (hash, ts) VALUES (?, ?)', hash, now)

    return json({ allowed: true })
  }
}
