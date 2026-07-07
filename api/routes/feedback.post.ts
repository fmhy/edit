/**
 *  Copyright (c) 2026 ManuJL. Apache License 2.0.
 *
 *  feedback.post.ts — Feedback ingestion endpoint with profanity/toxicity filtering.
 *
 *  Architecture:
 *    1. Blocklist layer   — exact-match words from feedback-blocklist.txt (loaded at startup)
 *    2. Regex layer       — pattern matching for common leet-speak & obfuscation variants
 *    3. Normalisation     — strip zero-width chars, homoglyphs, repeated chars, separators
 *
 *  Toxic messages are silently discarded; the caller still receives { status: 'ok' }
 *  to prevent trolls from knowing their messages are blocked.
 *
 *  Performance notes:
 *    - Blocklist is loaded ONCE at module initialisation (not per-request).
 *    - Regex patterns are compiled ONCE at module initialisation.
 *    - All checks run in <1 ms on typical feedback lengths.
 */

import {
  FeedbackSchema,
  getFeedbackOption
} from '../../docs/.vitepress/types/Feedback'

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─────────────────────────────────────────────────────────────────────────────
// BLOCKLIST — loaded once at startup
// ─────────────────────────────────────────────────────────────────────────────

let _blocklist: string[] = []

/**
 * Load words from feedback-blocklist.txt into memory.
 * Each non-empty, non-comment line becomes a blocked term.
 */
function loadBlocklist(): void {
  // Try several possible paths (dev vs Cloudflare Worker bundle)
  const candidates = [
    resolve('./feedback-blocklist.txt'),
    resolve('./api/feedback-blocklist.txt'),
    new URL('../../feedback-blocklist.txt', import.meta.url).pathname
  ]

  for (const candidate of candidates) {
    try {
      const content = readFileSync(candidate, 'utf-8')
      _blocklist = content
        .split('\n')
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
      console.info(
        `[feedback-filter] Loaded ${_blocklist.length} blocked terms from ${candidate}`
      )
      return
    } catch {
      // Try next candidate
    }
  }

  // Non-fatal: log a warning but keep running
  console.warn(
    '[feedback-filter] feedback-blocklist.txt not found — blocklist filtering disabled'
  )
}

loadBlocklist()

// ─────────────────────────────────────────────────────────────────────────────
// REGEX LAYER — hardcoded patterns for common obfuscation / leet-speak
// These act as a second defense in case a word isn't in the blocklist.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core patterns built with permissive separators between letters so users
 * can't bypass with spaces, dots, dashes, underscores, or zero-width chars.
 *
 * The SEP character class allows: space, dash, dot, underscore, asterisk,
 * at-sign, zero-width joiner (U+200D), soft hyphen (U+00AD).
 */
const SEP = '[\\s\\-._*@\u200d\u00ad]*'

const CORE_PATTERNS: RegExp[] = [
  // Racial slurs
  new RegExp(`n${SEP}[i1!|]+${SEP}g${SEP}g${SEP}[e3]+${SEP}r`, 'i'),
  new RegExp(`n${SEP}[i1!|]+${SEP}g${SEP}g${SEP}[a@]+`, 'i'),
  new RegExp(`f${SEP}[a@]+${SEP}g${SEP}g${SEP}[o0]+${SEP}t`, 'i'),
  new RegExp(`f${SEP}[a@]+${SEP}g${SEP}g${SEP}[i1]+t`, 'i'),
  new RegExp(`k${SEP}[i1]+${SEP}k${SEP}[e3]+`, 'i'),
  new RegExp(`sp${SEP}[i1]+${SEP}c+k?`, 'i'),
  new RegExp(`ch${SEP}[i1]+${SEP}nk`, 'i'),
  new RegExp(`g${SEP}[o0]+${SEP}[o0]+k`, 'i'),
  new RegExp(`c${SEP}[o0]+${SEP}[o0]+n`, 'i'),
  new RegExp(`w${SEP}[e3]+${SEP}t${SEP}b${SEP}[a@]+ck`, 'i'),

  // Severe profanity
  new RegExp(`f${SEP}[u*]+${SEP}c${SEP}k`, 'i'),
  new RegExp(`sh${SEP}[i1!]+${SEP}t`, 'i'),
  new RegExp(`[a@]${SEP}s${SEP}s${SEP}h${SEP}[o0]+${SEP}l${SEP}[e3]+`, 'i'),
  new RegExp(`b${SEP}[i1!]+${SEP}t${SEP}ch`, 'i'),
  new RegExp(`c${SEP}[u*]+${SEP}n${SEP}t`, 'i'),
  new RegExp(`d${SEP}[i1!]+${SEP}ck`, 'i'),
  new RegExp(`c${SEP}[o0]+${SEP}ck`, 'i'),

  // Homophobic
  new RegExp(`f${SEP}[a@]+${SEP}g(?:g${SEP}[o0]+t)?`, 'i'),
  new RegExp(`tr${SEP}[a@]+nn${SEP}[y]+`, 'i'),

  // Violence / self-harm (exact phrases)
  /kill\s+your\s*self/i,
  /\bkys\b/i,
  /\bkms\b/i,

  // Nazi / hate symbols
  /sieg\s*heil/i,
  /heil\s*hitler/i,
  /\b1488\b/,
  /white\s+power/i,
  /gas\s+the\s+jews/i
]

// ─────────────────────────────────────────────────────────────────────────────
// NORMALISATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Common homoglyph / leet-speak substitutions */
const HOMOGLYPHS: [RegExp, string][] = [
  [/[àáâãäåāă]/gi, 'a'],
  [/[èéêëēĕ]/gi, 'e'],
  [/[ìíîïīĭ]/gi, 'i'],
  [/[òóôõöōŏ]/gi, 'o'],
  [/[ùúûüūŭ]/gi, 'u'],
  [/[ýÿ]/gi, 'y'],
  [/[ñ]/gi, 'n'],
  [/[@]/g, 'a'],
  [/[3]/g, 'e'],
  [/[1!|]/g, 'i'],
  [/[0]/g, 'o'],
  [/[$]/g, 's'],
  [/[+]/g, 't'],
  // Zero-width / invisible chars
  [/[\u200b\u200c\u200d\u00ad\u2060\ufeff]/g, '']
]

/** Collapse repeated characters (e.g. "fuuuuck" → "fuck") */
const REPEATED_CHARS = /(.)\1{2,}/g

/**
 * Normalise a string to defeat common obfuscation tricks:
 *  - homoglyphs (@ → a, 3 → e, 0 → o …)
 *  - invisible / zero-width characters
 *  - repeated characters (fuuuuck → fuck)
 */
function normalise(text: string): string {
  let s = text
  for (const [pattern, replacement] of HOMOGLYPHS) {
    s = s.replace(pattern, replacement)
  }
  return s.replace(REPEATED_CHARS, '$1$1')
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TOXICITY CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if `text` contains any blocked term from the blocklist OR
 * matches any of the compiled regex patterns.
 *
 * Both the original and normalised forms are checked so that neither
 * exact nor obfuscated inputs slip through.
 */
function containsToxicContent(text: string): boolean {
  if (!text) return false

  const lower = text.toLowerCase()
  const norm = normalise(lower)

  // 1. Blocklist exact-word check (both original and normalised)
  if (_blocklist.length > 0) {
    for (const term of _blocklist) {
      if (lower.includes(term) || norm.includes(term)) return true
    }
  }

  // 2. Regex pattern layer (both original and normalised)
  for (const pattern of CORE_PATTERNS) {
    if (pattern.test(lower) || pattern.test(norm)) return true
  }

  return false
}

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
  // Check the message and optional heading. If either contains toxic content,
  // silently return { status: 'ok' } without forwarding to Discord.
  // The sender has NO indication that their message was dropped.
  const isToxic =
    containsToxicContent(message) ||
    (heading != null && containsToxicContent(heading))

  if (isToxic) {
    const ip =
      getHeader(event, 'cf-connecting-ip') ||
      getHeader(event, 'x-forwarded-for') ||
      'unknown'
    console.warn(
      `[feedback-filter] Toxic message silently discarded — IP: ${ip} | page: ${page}`
    )
    // Return the same shape as a successful submission to fool the sender.
    return { status: 'ok' }
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
    console.error(`[feedback] Discord webhook failed: ${response.status} — ${body}`)
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to send feedback'
    })
  }

  return { status: 'ok' }
})
