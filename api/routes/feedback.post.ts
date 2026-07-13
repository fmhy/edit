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

/** Escape triple backticks so user input can't break the embed's code-block formatting. */
function sanitizeForDiscord(input: string): string {
  return input.replace(/```/g, "'''")
}

export default defineEventHandler(async (event) => {
  const { message, page, type, heading, contact } = await readValidatedBody(
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

  if (contact) {
    fields.push({
      name: 'Contact',
      value: sanitizeForDiscord(contact),
      inline: true
    })
  }

  // Attempt to translate non-English feedback
  try {
    const translateParams = new URLSearchParams()
    translateParams.append('q', message)

    const translateRes = await fetch(
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: translateParams.toString()
      }
    )

    if (translateRes.ok) {
      const data = await translateRes.json()
      const detectedLang = data[2]
      const confidence = data[6]

      if (detectedLang && detectedLang !== 'en' && confidence > 0.5) {
        const translatedText = data[0].map((x: any) => x[0]).join('')

        if (
          translatedText.toLowerCase().trim() !== message.toLowerCase().trim()
        ) {
          fields.push({
            name: `Translated (${detectedLang})`,
            value: sanitizeForDiscord(translatedText),
            inline: false
          })
        }
      }
    }
  } catch (err) {
    console.error('Translation failed:', err)
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
