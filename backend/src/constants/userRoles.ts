export const USER_ROLE = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES: 'SALES',
  OPERATION: 'OPERATION',
  SERVICE: 'SERVICE',
  FINANCE: 'FINANCE',
  WAREHOUSE: 'WAREHOUSE',
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

const ALL_ROLES = new Set<string>(Object.values(USER_ROLE))

export function isUserRole(value: string): value is UserRole {
  return ALL_ROLES.has(value)
}
