import type { FastifyInstance, FastifyRequest } from 'fastify'
import { AppHttpError } from '../errors/apiError.js'
import { authUserFromJwt } from '../lib/authUser.js'
import { verifyJwt } from '../lib/jwt.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { USER_ROLE } from '../constants/userRoles.js'
import { assertRbac } from './rbac.js'
import { prisma } from '../prisma.js'

const PUBLIC_PATHS = new Set(['/health', '/v1/auth/login'])

/** Integration test bypass */
export const TEST_AUTH_USER: AuthUserContext = {
  id: 'user-test-admin',
  fullName: 'Test Admin',
  email: 'admin@test.local',
  role: USER_ROLE.ADMIN,
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUserContext
  }
}

function bearerToken(req: FastifyRequest): string | null {
  const raw = req.headers.authorization
  if (typeof raw !== 'string' || !raw.startsWith('Bearer ')) return null
  return raw.slice(7).trim() || null
}

export async function resolveRequestAuthUser(req: FastifyRequest): Promise<AuthUserContext | null> {
  if (process.env.AUTH_DISABLED === 'true') {
    return TEST_AUTH_USER
  }
  const token = bearerToken(req)
  if (!token) return null
  const payload = verifyJwt(token)
  if (!payload) return null
  const user = authUserFromJwt(payload)
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { isActive: true, role: true } })
  if (!row?.isActive) return null
  return { ...user, role: row.role as AuthUserContext['role'] }
}

export function registerAuthHook(app: FastifyInstance): void {
  app.addHook('onRequest', async (req, _reply) => {
    const path = req.url.split('?')[0]
    if (PUBLIC_PATHS.has(path)) return
    if (req.method === 'OPTIONS') return

    const user = await resolveRequestAuthUser(req)
    if (!user) {
      throw new AppHttpError(401, 'Oturum süresi doldu veya oturum geçersiz', 'Unauthorized')
    }
    req.authUser = user
    assertRbac(req)
  })
}

export function requireAuthUser(req: FastifyRequest): AuthUserContext {
  if (!req.authUser) {
    throw new AppHttpError(401, 'Oturum gerekli', 'Unauthorized')
  }
  return req.authUser
}
