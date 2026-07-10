import type { UserRole } from '../constants/userRoles.js'
import type { OperationActorWire } from './operationActor.js'

export type AuthUserContext = {
  id: string
  fullName: string
  email: string
  role: UserRole
}

export type UserPublicDto = {
  id: string
  fullName: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

export function userToPublicDto(row: {
  id: string
  fullName: string
  email: string
  role: string
  isActive: boolean
  createdAt: Date
}): UserPublicDto {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    role: row.role as UserRole,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  }
}

export function authUserFromJwt(payload: {
  sub: string
  email: string
  fullName: string
  role: string
}): AuthUserContext {
  return {
    id: payload.sub,
    fullName: payload.fullName,
    email: payload.email,
    role: payload.role as AuthUserContext['role'],
  }
}

export function actorWireFromUser(user: AuthUserContext, action: string): OperationActorWire {
  const at = new Date().toISOString()
  return {
    actorId: user.id,
    actorName: user.fullName,
    role: user.role,
    actor: user.fullName,
    action,
    at,
  }
}
