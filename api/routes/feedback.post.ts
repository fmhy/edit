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

import z from 'zod'
import {
  FeedbackSchema,
  getFeedbackOption
} from '../../docs/.vitepress/types/Feedback'

/**
 * Coarse browser/OS buckets from the feedback widget. All optional: the client
 * omits what it cannot read, and versions are major-only.
 */
const FeedbackContextSchema = z.object({
  os: z.string().max(24).optional(),
  browser: z.string().max(24).optional(),
  screen: z.enum(['s', 'm', 'l', 'xl']).optional(),
  viewport: z.enum(['s', 'm', 'l', 'xl']).optional(),
  dpr: z.enum(['1x', '2x', '3x']).optional(),
  scheme: z.enum(['dark', 'light']).optional(),
  lang: z.string().max(10).optional(),
  pointer: z.enum(['coarse', 'fine']).optional()
})

const FeedbackBodySchema = FeedbackSchema.extend({
  context: FeedbackContextSchema.optional()
})

const CONTEXT_KEYS = [
  'os',
  'browser',
  'screen',
  'viewport',
  'dpr',
  'scheme',
  'lang',
  'pointer'
] as const

/**
 * Stable per-quarter grouping id. Hashed server-side only: the canonical string
 * never leaves the worker, and the pepper (Worker secret REPORT_PEPPER, rotated
 * quarterly) keeps ids unguessable across quarters. Same config in the same
 * quarter yields the same id; nothing reversible is sent.
 */
async function buildReportId(
  context: Record<string, string | undefined>,
  pepper: unknown
): Promise<string | undefined> {
  if (typeof pepper !== 'string' || !pepper) return undefined

  const canonical = CONTEXT_KEYS.filter((key) => context[key])
    .map((key) => `${key}=${context[key]!.toLowerCase()}`)
    .join(';')
  if (!canonical) return undefined

  const now = new Date()
  const year = now.getUTCFullYear()
  const quarter = `${year}Q${Math.floor(now.getUTCMonth() / 3) + 1}`
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${pepper}:${quarter}:${canonical}`)
  )
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 8)
}

/** Escape triple backticks so user input can't break the embed's code-block formatting. */
function sanitizeForDiscord(input: string): string {
  return input.replace(/```/g, "'''")
}

interface Translation {
  lang: string
  translated: string
}

function isTranslated(
  message: string,
  candidate: Translation | null
): candidate is Translation {
  return (
    candidate !== null &&
    candidate.lang !== 'en' &&
    candidate.translated.toLowerCase().trim() !== message.toLowerCase().trim()
  )
}

/**
 * Workers AI has no dedicated language-detection model, so a small
 * multilingual instruct model handles detection + translation in one call.
 * Cloudflare deprecates Workers AI models periodically (~2 months' notice via
 * https://developers.cloudflare.com/workers-ai/changelog/). If translations
 * stop working, check that changelog and the catalog at
 * https://developers.cloudflare.com/workers-ai/models/ for a replacement
 * model ID to swap in below.
 */
async function translateWithWorkersAI(
  ai: any,
  message: string
): Promise<Translation | null> {
  const result = await ai.run('@cf/meta/llama-3.2-3b-instruct', {
    messages: [
      {
        role: 'system',
        content:
          'Detect the language of the user message. If it is not English, translate it to English. ' +
          'Misspelled, informal, or grammatically incorrect English is still English — do NOT translate it. ' +
          'Social media patterns such as emoji interspersed between words or syllables are English internet slang — treat them as English. ' +
          'URLs, domain names (e.g. kagane.to, example.org), and technical terms are language-neutral — detect language from the surrounding prose only, ignoring them. ' +
          'If the message is gibberish, random characters, or an unrecognisable language, set translated to null. ' +
          'Respond with ONLY compact JSON, no other text: ' +
          '{"lang":"<ISO 639-1 code>","translated":"<English translation or null>"}. ' +
          'If the message is already English (including misspelled English), respond with {"lang":"en","translated":null}. ' +
          'When uncertain whether a message is English, default to treating it as English.'
      },
      { role: 'user', content: message }
    ],
    temperature: 0
  })

  const response = result?.response
  let lang: string | undefined
  let translated: unknown

  if (response && typeof response === 'object') {
    ;({ lang, translated } = response)
  } else if (typeof response === 'string') {
    const match = response.match(/\{[\s\S]*\}/)
    if (!match) {
      console.warn('Translation response did not contain JSON:', response)
      return null
    }
    ;({ lang, translated } = JSON.parse(match[0]))
  } else {
    console.warn('Unexpected translation response type:', typeof response)
    return null
  }

  if (!lang || typeof translated !== 'string') return null
  return { lang, translated }
}

function sanitizeTranslationLang(lang: string): string {
  return /^[a-zA-Z-]{2,10}$/.test(lang) ? lang : '?'
}

const TRANSLATION_FAILURE_KV_KEY = 'feedback:translation-failure-notified'
const TRANSLATION_FAILURE_NOTIFY_INTERVAL_SECONDS = 12 * 60 * 60

async function shouldNotifyTranslationFailure(kv: any): Promise<boolean> {
  if (!kv) return true

  try {
    const lastNotified = await kv.get(TRANSLATION_FAILURE_KV_KEY)
    if (lastNotified) return false

    await kv.put(TRANSLATION_FAILURE_KV_KEY, Date.now().toString(), {
      expirationTtl: TRANSLATION_FAILURE_NOTIFY_INTERVAL_SECONDS
    })
    return true
  } catch (err) {
    console.error('Failed to check translation-failure notify state:', err)
    return true
  }
}

export default defineEventHandler(async (event) => {
  const { message, page, type, heading, contact, context } =
    await readValidatedBody(event, FeedbackBodySchema.parseAsync)
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

  if (contact) {
    fields.push({
      name: 'Contact',
      value: sanitizeForDiscord(contact),
      inline: true
    })
  }

  if (context) {
    if (context.os) {
      fields.push({
        name: 'OS',
        value: sanitizeForDiscord(context.os),
        inline: true
      })
    }
    if (context.browser) {
      fields.push({
        name: 'Browser',
        value: sanitizeForDiscord(context.browser),
        inline: true
      })
    }
    if (context.viewport) {
      fields.push({
        name: 'Viewport bucket',
        value: context.viewport,
        inline: true
      })
    }

    const cfEnv = (event.context.cloudflare as any)?.env
    const reportId = await buildReportId(context, cfEnv?.REPORT_PEPPER).catch(
      () => undefined
    )
    if (reportId) {
      fields.push({ name: 'Report ID', value: reportId, inline: true })
    }
  }

  const cf = event.context.cloudflare as any

  const clientIP =
    getHeader(event, 'cf-connecting-ip') ||
    getHeader(event, 'x-forwarded-for') ||
    event.node.req.socket.remoteAddress

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

  // Attempt to translate non-English feedback
  let translation: Translation | null = null
  let translationFailed = false

  if (cf?.env?.AI) {
    try {
      translation = await translateWithWorkersAI(cf.env.AI, message)
    } catch (err) {
      console.error('Workers AI translation failed:', err)
      translationFailed = true
    }
  }

  if (isTranslated(message, translation)) {
    fields.push({
      name: `Translated (${sanitizeTranslationLang(translation.lang)})`,
      value: sanitizeForDiscord(translation.translated),
      inline: false
    })
  } else if (
    translationFailed &&
    (await shouldNotifyTranslationFailure(cf?.env?.STORAGE))
  ) {
    fields.push({
      name: 'Translation unavailable',
      value: 'Automatic translation errored for this message.',
      inline: false
    })
  }

  const colors: Record<string, number> = {
    suggestion: 3447003, // Blue
    appreciation: 5763719, // Green
    other: 9807270 // Grey
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
          color: colors[type] || 3447003,
          title: getFeedbackOption(type)?.label || 'Feedback',
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
