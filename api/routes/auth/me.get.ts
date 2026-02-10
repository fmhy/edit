import { verifyToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const token = authHeader.slice(7)
  const env = useRuntimeConfig(event)
  const payload = await verifyToken(token, env.JWT_SECRET)

  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  return {
    status: 'ok',
    user: { username: payload.sub, displayName: payload.name }
  }
})
