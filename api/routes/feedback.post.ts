import { fetcher } from 'itty-fetcher'
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

  const fields = [
    {
      name: 'Page',
      value: page,
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

  await fetcher()
    .post(env.WEBHOOK_URL, {
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
    .catch((error) => {
      throw new Error(error)
    })

  return { status: 'ok' }
})
