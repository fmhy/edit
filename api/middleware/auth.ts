import { verifyToken } from '../utils/auth'

const PROTECTED_ROUTES = ['/api/protected']

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  const isProtected = PROTECTED_ROUTES.some((route) => path.startsWith(route))

  if (!isProtected) return

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

  event.context.user = { username: payload.sub, displayName: payload.name }
})
