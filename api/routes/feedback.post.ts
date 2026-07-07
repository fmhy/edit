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

import {
  FeedbackSchema,
  getFeedbackOption
} from '../../docs/.vitepress/types/Feedback'

// --- Toxic content blocker ---
// Regex patterns for slurs, insults, and severe profanity.
// Kept inline because Cloudflare Workers have no fs access at runtime.
const BLOCKED_PATTERNS: RegExp[] = [
  /n[i1]g{2}[ae]r?|nagger/i,
  /fagg?[o0]t|fag[^o]|fag$/i,
  /tranny|tranz/i,
  /sp[i1]c/i,
  /ch[i1]nk/i,
  /k[i1]ke/i,
  /c[o0]{2}n/i,
  /wetback/i,
  /gook/i,
  /kaffir/i,
  /b[i1]tch|betch/i,
  /wh[o0]re/i,
  /sl[u0]t/i,
  /c[u0]nt/i,
  /r[e3]t[a@]rd/i,
  /dumb[\s\-_]*ass/i,
  /f[u0][cg]k|phuck|fck/i,
  /asshole|a\$\$hole/i,
  /dyke|lezbo/i,
]

function containsToxicContent(text: string): boolean {
  if (!text) return false
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text))
}

/** Escape triple backticks so user input can't break the embed's code-block formatting. */
function sanitizeForDiscord(input: string): string {
  return input.replace(/```/g, "'''")
}

export default defineEventHandler(async (event) => {
  const { message, page, type, heading } = await readValidatedBody(
    event,
    FeedbackSchema.parseAsync
  )

  // --- Silently discard toxic feedback ---
  // Return success so the sender thinks it went through.
  if (containsToxicContent(message) || (heading && containsToxicContent(heading))) {
    console.warn(`[feedback-blocker] Toxic feedback discarded (IP: ${getHeader(event, 'cf-connecting-ip') || 'unknown'})`)
    return { status: 'ok' }
  }
  const env = useRuntimeConfig(event)

  const pageURL = `https://fmhy.net${page}`
  const fields = [
    {
      name: 'Page',
      value: `[${page}](${pageURL})`,
      inline: true
    },
    {
      name: 'Message',
      value: sanitizeForDiscord(message),
      inline: false
    }
  ]

  if (heading) {
    fields.unshift({
      name: 'Section',
      value: sanitizeForDiscord(heading),
      inline: true
    })
  }

  const clientIP =
    getHeader(event, 'cf-connecting-ip') ||
    getHeader(event, 'x-forwarded-for') ||
    event.node.req.socket.remoteAddress

  const cf = event.context.cloudflare as any
  if (clientIP && cf?.env?.RATE_LIMITER) {
    const key = `feedback:${clientIP}`
    const { success } = await cf.env.RATE_LIMITER.limit({ key })
    if (!success) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests'
      })
    }
  }

  const response = await fetch(env.WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'Feedback',
      // Self-hosted so the avatar can't break if a third-party host changes it.
      avatar_url: 'https://fmhy.net/feedback-avatar.jpg',
      embeds: [
        {
          color: 3447003,
          title: getFeedbackOption(type).label,
          fields
        }
      ]
    })
  })

  if (!response.ok) {
    const body = await response.text().catch(() => 'Could not read body')
    console.error(
      `Discord webhook failed: ${response.status} ${response.statusText} - ${body}`
    )
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to send feedback to Discord'
    })
  }

  return { status: 'ok' }
})
