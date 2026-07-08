/**
 *  Copyright (c) 2025 taskylizard. Apache License 2.0.
 *
 *  feedback.post.ts — Feedback ingestion endpoint with profanity/toxicity filtering.
 */

import { createRequire } from 'module'
import {
  FeedbackSchema,
  getFeedbackOption
} from '../../docs/.vitepress/types/Feedback'

// ─────────────────────────────────────────────────────────────────────────────
// PROFANITY FILTERING
// ─────────────────────────────────────────────────────────────────────────────

const require = createRequire(import.meta.url)
let profanityList: any[] = []
try {
  profanityList = require('@dsojevic/profanity-list/en.json')
} catch (e) {
  console.warn('[feedback-filter] Failed to load profanity list', e)
}

function buildRegex(items: any[]): RegExp | null {
  if (!items.length) return null
  const parts = items.map((p) => {
    return p.match
      .split('|')
      .map((m: string) => {
        // Escape regex chars except * (which we turn into +)
        return m.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '+')
      })
      .join('|')
  })
  // We use word boundaries (\b) to prevent partial-match false positives
  return new RegExp(`\\b(?:${parts.join('|')})\\b`, 'gi')
}

// Severity 3 and 4 -> Blocked completely
const BLOCK_REGEX = buildRegex(profanityList.filter((p) => p.severity >= 3))
// Severity 1 and 2 -> Censored with ****
const CENSOR_REGEX = buildRegex(profanityList.filter((p) => p.severity < 3))

// ─────────────────────────────────────────────────────────────────────────────
// DISCORD HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Escape triple backticks so they don't break Discord code blocks */
function sanitizeForDiscord(input: string): string {
  return input.replace(/```/g, "'''")
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const { message, page, type, heading } = await readValidatedBody(
    event,
    FeedbackSchema.parseAsync
  )

  // ── Toxicity gate ──────────────────────────────────────────────────────────
  // 1. Block highly toxic messages (Severity 3/4)
  if (
    BLOCK_REGEX &&
    (BLOCK_REGEX.test(message) ||
      (heading != null && BLOCK_REGEX.test(heading)))
  ) {
    const ip =
      getHeader(event, 'cf-connecting-ip') ||
      getHeader(event, 'x-forwarded-for') ||
      'unknown'
    console.warn(
      `[feedback-filter] Toxic message blocked — IP: ${ip} | page: ${page}`
    )
    throw createError({
      statusCode: 400,
      message: 'Failed to send feedback. Please try again.'
    })
  }

  // 2. Censor mild profanity (Severity 1/2)
  let finalMessage = message
  let finalHeading = heading
  if (CENSOR_REGEX) {
    finalMessage = message.replace(CENSOR_REGEX, '****')
    if (finalHeading != null) {
      finalHeading = finalHeading.replace(CENSOR_REGEX, '****')
    }
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const clientIP =
    getHeader(event, 'cf-connecting-ip') ||
    getHeader(event, 'x-forwarded-for') ||
    event.node.req.socket?.remoteAddress

  const cf = event.context.cloudflare as any
  if (clientIP && cf?.env?.RATE_LIMITER) {
    const { success } = await cf.env.RATE_LIMITER.limit({
      key: `feedback:${clientIP}`
    })
    if (!success) {
      throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' })
    }
  }

  // ── Build Discord embed fields ─────────────────────────────────────────────
  const pageURL = `https://fmhy.net${page}`
  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: 'Page', value: `[${page}](${pageURL})`, inline: true },
    {
      name: 'Message',
      value: sanitizeForDiscord(finalMessage),
      inline: false
    }
  ]

  if (finalHeading) {
    fields.unshift({
      name: 'Section',
      value: sanitizeForDiscord(finalHeading),
      inline: true
    })
  }

  // ── Send to Discord ────────────────────────────────────────────────────────
  const env = useRuntimeConfig(event)

  const response = await fetch(env.WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Feedback',
      avatar_url: 'https://fmhy.net/feedback-avatar.jpg',
      embeds: [
        {
          color: 3447003,
          title: getFeedbackOption(type)?.label ?? type,
          fields
        }
      ]
    })
  })

  if (!response.ok) {
    const body = await response.text().catch(() => 'Unknown error')
    console.error(
      `[feedback] Discord webhook failed: ${response.status} — ${body}`
    )
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to send feedback'
    })
  }

  return { status: 'ok' }
})
