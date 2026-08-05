import type { FastifyInstance, FastifyRequest } from 'fastify'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 300

/** @type {Map<string, { count: number, resetAt: number }>} */
const buckets = new Map()

/**
 * Enterprise 1.0 — lightweight in-memory rate limit (FAZ 110).
 */
export function registerEnterpriseRateLimit(app: FastifyInstance): void {
  app.addHook('onRequest', async (req, reply) => {
    if (req.url === '/health' || req.url.startsWith('/v1/auth/login')) return

    const key = clientKey(req)
    const now = Date.now()
    const bucket = buckets.get(key) ?? { count: 0, resetAt: now + WINDOW_MS }
    if (now > bucket.resetAt) {
      bucket.count = 0
      bucket.resetAt = now + WINDOW_MS
    }
    bucket.count += 1
    buckets.set(key, bucket)

    reply.header('X-RateLimit-Limit', String(MAX_REQUESTS))
    reply.header('X-RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS - bucket.count)))

    if (bucket.count > MAX_REQUESTS) {
      reply.code(429)
      throw new Error('Rate limit exceeded')
    }
  })
}

/** @param {FastifyRequest} req */
function clientKey(req: FastifyRequest): string {
  const auth = req.headers.authorization ?? ''
  if (auth.startsWith('Bearer ')) return auth.slice(0, 32)
  return req.ip
}

export function resetRateLimitStoreForTests(): void {
  buckets.clear()
}
