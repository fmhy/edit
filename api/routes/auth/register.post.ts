import { z } from 'zod'
import {
  hashPassword,
  generateSalt,
  createToken,
  getAuthStore
} from '../../utils/auth'

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(128)
})

export default defineEventHandler(async (event) => {
  const { username, password } = await readValidatedBody(
    event,
    RegisterSchema.parseAsync
  )

  const store = getAuthStore(event)
  const existing = await store.get(`user:${username.toLowerCase()}`)
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Username already taken' })
  }

  const salt = generateSalt()
  const hashed = await hashPassword(password, salt)

  const user = {
    username: username.toLowerCase(),
    displayName: username,
    passwordHash: hashed,
    salt,
    createdAt: Date.now()
  }

  await store.put(`user:${username.toLowerCase()}`, JSON.stringify(user))

  const env = useRuntimeConfig(event)
  const token = await createToken(
    { sub: user.username, name: user.displayName },
    env.JWT_SECRET
  )

  return { status: 'ok', token, user: { username: user.username, displayName: user.displayName } }
})
