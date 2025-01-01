export default defineEventHandler(async (event) => {
  const { cloudflare } = event.context

  // FIXME: THIS IS NOT RECOMMENDED. BUT I WILL USE IT FOR NOW
  // Not recommended:  many users may share a single IP, especially on mobile networks
  // or when using privacy-enabling proxies
  const ipAddress = getHeader(event, 'CF-Connecting-IP') ?? ''

  const { success } = await // KILL YOURSELF
  (cloudflare.env as unknown as Env).RATE_LIMITER.limit({
    key: ipAddress
  })

  if (!success) {
    throw createError('Failure – global rate limit exceeded')
  }
})
