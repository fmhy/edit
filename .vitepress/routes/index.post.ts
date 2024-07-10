import { fetcher } from 'itty-fetcher'
import { FeedbackSchema, getFeedbackOption } from '../types/Feedback'

export default defineEventHandler(async (event) => {
  const { message, page, type } = await readValidatedBody(
    event,
    FeedbackSchema.parseAsync
  )
  const env = useRuntimeConfig(event)
  const { pathname } = new URL(event.node.req.url)

  const { success } = await env.MY_RATE_LIMITER.limit({ key: pathname })
  if (!success) {
    return new Response(`429 Failure – rate limit exceeded for ${pathname}`, {
      status: 429
    })
  }

  let description = `${message}\n\n`
  if (page) description += `**Page:** \`${page}\``

  await fetcher()
    .post(env.WEBHOOK_URL, {
      username: 'Feedback',
      avatar_url:
        'https://i.kym-cdn.com/entries/icons/facebook/000/043/403/cover3.jpg',
      embeds: [
        {
          color: 3447003,
          title: getFeedbackOption(type).label,
          description
        }
      ]
    })
    .catch((error) => {
      throw new Error(error)
    })

  return { status: 'ok' }
})
