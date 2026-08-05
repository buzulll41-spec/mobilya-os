import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../../errors/apiError.js'
import { isUserRole, USER_ROLE, type UserRole } from '../../constants/userRoles.js'
import { hashPassword } from '../../lib/password.js'
import { userToPublicDto, type UserPublicDto } from '../../lib/authUser.js'

export type CreateUserRequest = {
  fullName: string
  email: string
  role: UserRole
  password: string
  isActive?: boolean
}

export type PatchUserRequest = {
  fullName?: string
  role?: UserRole
  isActive?: boolean
}

export function assertValidCreateUserRequest(body: unknown): CreateUserRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const fullName = typeof o.fullName === 'string' ? o.fullName.trim() : ''
  const email = typeof o.email === 'string' ? o.email.trim().toLowerCase() : ''
  const role = typeof o.role === 'string' ? o.role.trim() : ''
  const password = typeof o.password === 'string' ? o.password : ''
  const isActive = o.isActive !== false

  const details: Record<string, string> = {}
  if (!fullName) details.fullName = 'Required'
  if (!email) details.email = 'Required'
  if (!isUserRole(role)) details.role = 'Invalid role'
  if (password.length < 6) details.password = 'Min 6 characters'
  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  return { fullName, email, role: role as UserRole, password, isActive }
}

export function assertValidPatchUserRequest(body: unknown): PatchUserRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const out: PatchUserRequest = {}
  if (typeof o.fullName === 'string') out.fullName = o.fullName.trim()
  if (typeof o.role === 'string') {
    if (!isUserRole(o.role.trim())) {
      throw new AppHttpError(400, 'Invalid role', 'Bad Request')
    }
    out.role = o.role.trim() as UserRole
  }
  if (typeof o.isActive === 'boolean') out.isActive = o.isActive
  if (Object.keys(out).length === 0) {
    throw new AppHttpError(400, 'No fields to update', 'Bad Request')
  }
  return out
}

export async function createUser(prisma: PrismaClient, body: CreateUserRequest): Promise<UserPublicDto> {
  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) {
    throw new AppHttpError(409, 'Bu e-posta zaten kayıtlı', 'Conflict')
  }
  const row = await prisma.user.create({
    data: {
      fullName: body.fullName,
      email: body.email,
      role: body.role,
      passwordHash: hashPassword(body.password),
      isActive: body.isActive !== false,
    },
  })
  return userToPublicDto(row)
}

export async function patchUser(
  prisma: PrismaClient,
  userId: string,
  body: PatchUserRequest,
): Promise<UserPublicDto> {
  const row = await prisma.user.findUnique({ where: { id: userId } })
  if (!row) throw new AppHttpError(404, 'Kullanıcı bulunamadı', 'Not Found')

  const nextIsActive = body.isActive ?? row.isActive
  const nextRole = body.role ?? (row.role as UserRole)
  await assertNotLastActiveAdmin(prisma, userId, nextIsActive, nextRole)

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  })
  return userToPublicDto(updated)
}

function generateTempPassword(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `Pilot-${suffix}`
}

export async function resetUserPassword(
  prisma: PrismaClient,
  userId: string,
): Promise<{ user: UserPublicDto; temporaryPassword: string }> {
  const row = await prisma.user.findUnique({ where: { id: userId } })
  if (!row) throw new AppHttpError(404, 'Kullanıcı bulunamadı', 'Not Found')

  const temporaryPassword = generateTempPassword()
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(temporaryPassword) },
  })
  return { user: userToPublicDto(updated), temporaryPassword }
}

/** Pilot: en az bir aktif admin kalmalı */
export async function assertNotLastActiveAdmin(
  prisma: PrismaClient,
  userId: string,
  nextIsActive: boolean,
  nextRole?: UserRole,
): Promise<void> {
  if (nextIsActive !== false && nextRole !== USER_ROLE.ADMIN) return
  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target || target.role !== USER_ROLE.ADMIN) return

  const adminCount = await prisma.user.count({
    where: { role: USER_ROLE.ADMIN, isActive: true, NOT: { id: userId } },
  })
  if (adminCount === 0) {
    throw new AppHttpError(409, 'Son aktif yönetici devre dışı bırakılamaz', 'Conflict')
  }
}
