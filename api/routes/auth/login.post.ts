import { z } from 'zod'
import { hashPassword, createToken, getAuthStore } from '../../utils/auth'

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const { username, password } = await readValidatedBody(
    event,
    LoginSchema.parseAsync
  )

  const store = getAuthStore(event)
  const raw = await store.get(`user:${username.toLowerCase()}`)
  if (!raw) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
  }

  const user = JSON.parse(raw)
  const hashed = await hashPassword(password, user.salt)

  if (hashed !== user.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
  }

  const env = useRuntimeConfig(event)
  const token = await createToken(
    { sub: user.username, name: user.displayName },
    env.JWT_SECRET
  )

  return { status: 'ok', token, user: { username: user.username, displayName: user.displayName } }
})
