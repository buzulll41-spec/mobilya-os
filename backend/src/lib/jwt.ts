import { createHmac, timingSafeEqual } from 'node:crypto'

export type JwtPayload = {
  sub: string
  email: string
  fullName: string
  role: string
  exp: number
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf.toString('base64url')
}

function decodeBase64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

export function jwtSecret(): string {
  const s = process.env.JWT_SECRET ?? process.env.AUTH_JWT_SECRET
  if (s && s.trim()) return s.trim()
  if (process.env.NODE_ENV === 'test') return 'test-jwt-secret-mobilya-os'
  throw new Error('JWT_SECRET is required')
}

export function signJwt(payload: Omit<JwtPayload, 'exp'>, expiresInSec = 86_400): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body: JwtPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSec }
  const payloadPart = base64url(JSON.stringify(body))
  const sig = createHmac('sha256', jwtSecret())
    .update(`${header}.${payloadPart}`)
    .digest('base64url')
  return `${header}.${payloadPart}.${sig}`
}

export function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payloadPart, sig] = parts
  const expected = createHmac('sha256', jwtSecret())
    .update(`${header}.${payloadPart}`)
    .digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
  try {
    const payload = JSON.parse(decodeBase64url(payloadPart)) as JwtPayload
    if (!payload.sub || !payload.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
