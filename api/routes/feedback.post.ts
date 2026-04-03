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

export default defineEventHandler(async (event) => {
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
      value: message,
      inline: false
    }
  ]

  if (heading) {
    fields.unshift({
      name: 'Section',
      value: heading,
      inline: true
    })
  }

  // FIXME: somehow this is not working, but it worked before
  // const path = 'feedback'
  //
  // const { success } = await env.MY_RATE_LIMITER.limit({ key: path })
  // if (!success) {
  //   return new Response('429 Failure – global rate limit exceeded', {
  //     status: 429
  //   })
  // }


  const clientIP =
    getHeader(event, 'cf-connecting-ip') ||
    getHeader(event, 'x-forwarded-for') ||
    event.node.req.socket.remoteAddress ||
    '127.0.0.1'
  const key = `feedback:${clientIP}`
  const cf = event.context.cloudflare
  if (cf?.env?.RATE_LIMITER) {
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
      avatar_url:
        'https://i.kym-cdn.com/entries/icons/facebook/000/043/403/cover3.jpg',
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
    throw createError({
      statusCode: response.status,
      statusMessage: 'Failed to send feedback to Discord'
    })
  }

  return { status: 'ok' }
})
