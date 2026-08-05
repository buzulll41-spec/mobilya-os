import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../../errors/apiError.js'
import { userToPublicDto, type UserPublicDto } from '../../lib/authUser.js'
import { signJwt } from '../../lib/jwt.js'
import { verifyPassword } from '../../lib/password.js'
import { isUserRole } from '../../constants/userRoles.js'

export type LoginRequest = { email: string; password: string }

export type LoginResponse = {
  token: string
  user: UserPublicDto
}

export function assertValidLoginRequest(body: unknown): LoginRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const email = typeof o.email === 'string' ? o.email.trim().toLowerCase() : ''
  const password = typeof o.password === 'string' ? o.password : ''
  const details: Record<string, string> = {}
  if (!email) details.email = 'Required'
  if (!password) details.password = 'Required'
  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }
  return { email, password }
}

export async function loginUser(prisma: PrismaClient, body: LoginRequest): Promise<LoginResponse> {
  const row = await prisma.user.findUnique({ where: { email: body.email } })
  if (!row || !row.isActive) {
    throw new AppHttpError(401, 'E-posta veya şifre hatalı', 'Unauthorized')
  }
  if (!verifyPassword(body.password, row.passwordHash)) {
    throw new AppHttpError(401, 'E-posta veya şifre hatalı', 'Unauthorized')
  }
  if (!isUserRole(row.role)) {
    throw new AppHttpError(500, 'Kullanıcı rolü geçersiz', 'Internal Server Error')
  }

  const user = userToPublicDto(row)
  const token = signJwt({
    sub: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
  })

  return { token, user }
}

export async function getUserById(prisma: PrismaClient, userId: string): Promise<UserPublicDto | null> {
  const row = await prisma.user.findUnique({ where: { id: userId } })
  if (!row || !row.isActive) return null
  return userToPublicDto(row)
}
