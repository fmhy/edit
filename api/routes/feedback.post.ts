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

const MAX_BODY_BYTES = 4096

// `node:net` isn't available in the Workers runtime, so validate with a regex.
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/
const IPV6 = /^[0-9a-fA-F:]+$/
function isValidIP(ip: string): boolean {
  return IPV4.test(ip) || (ip.includes(':') && IPV6.test(ip))
}

/**
 * Resolve the client IP for rate limiting. Prefers `cf-connecting-ip` (set by
 * Cloudflare and not spoofable by the client). Falls back to the last hop of
 * `x-forwarded-for` (closest to our edge), then the socket address. Returns
 * `undefined` if nothing validates as an IP.
 */
function resolveClientIP(
  event: Parameters<typeof getHeader>[0]
): string | undefined {
  const cf = getHeader(event, 'cf-connecting-ip')
  if (cf && isValidIP(cf)) return cf

  const xff = getHeader(event, 'x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim())
    const last = parts[parts.length - 1]
    if (last && isValidIP(last)) return last
  }

  const remote = event.node.req.socket.remoteAddress
  return remote && isValidIP(remote) ? remote : undefined
}

/** Neutralize Discord-specific markup before embedding user content. */
function sanitizeForDiscord(input: string): string {
  return input
    .replace(/@(everyone|here)/gi, '[at]$1')
    .replace(/```/g, "'''")
    .slice(0, 1000)
}

export default defineEventHandler(async (event) => {
  const contentLength = Number(getHeader(event, 'content-length') ?? '0')
  if (contentLength > MAX_BODY_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Payload Too Large'
    })
  }

  const { message, page, type, heading } = await readValidatedBody(
    event,
    FeedbackSchema.parseAsync
  )
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

  const clientIP = resolveClientIP(event)

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
