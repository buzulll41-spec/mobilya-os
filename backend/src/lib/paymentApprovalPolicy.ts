import { USER_ROLE, type UserRole } from '../constants/userRoles.js'

export const PAYMENT_TX_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
} as const

export function paymentAutoApprovesForRole(role: UserRole | string | undefined): boolean {
  return role === USER_ROLE.ADMIN || role === USER_ROLE.MANAGER || role === USER_ROLE.FINANCE
}

export function canApprovePayments(role: UserRole | string | undefined): boolean {
  return paymentAutoApprovesForRole(role)
}
