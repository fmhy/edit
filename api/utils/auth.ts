import type { H3Event } from 'h3'

const ENCODER = new TextEncoder()

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = ENCODER.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateSalt(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function createToken(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(
    JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  )
  const key = await crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    ENCODER.encode(`${header}.${body}`)
  )
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
  return `${header}.${body}.${sig}`
}

async function verifyToken(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, body, sig] = parts
  const key = await crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const signatureBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0))
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    ENCODER.encode(`${header}.${body}`)
  )
  if (!valid) return null

  const payload = JSON.parse(atob(body))
  if (payload.exp && payload.exp < Date.now()) return null

  return payload
}

function getAuthStore(event: H3Event): KVNamespace {
  return (event.context.cloudflare.env as unknown as Env).AUTH_STORE
}

export { hashPassword, generateSalt, createToken, verifyToken, getAuthStore }
