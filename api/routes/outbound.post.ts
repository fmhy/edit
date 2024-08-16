export default defineEventHandler(async (event) => {
  const env = useRuntimeConfig(event)
  const data = await event.web.request.json()

  console.info(data)
  const forwardHeaders = new Headers(data.headers)
  forwardHeaders.delete('cookie')

  const upstreamResp = await fetch(`${env.ANALYTICS_DOMAIN}/api/event`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: forwardHeaders
  })

  console.info(upstreamResp)

  return new Response(null, { status: upstreamResp.status })
})
