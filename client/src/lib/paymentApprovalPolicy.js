import { USER_ROLE } from '../contracts/v1/user.js'

export const PAYMENT_TX_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
}

/** @param {string | undefined} role */
export function paymentAutoApprovesForRole(role) {
  return (
    role === USER_ROLE.ADMIN ||
    role === USER_ROLE.MANAGER ||
    role === USER_ROLE.FINANCE
  )
}

/** @param {string | undefined} role */
export function canApprovePayments(role) {
  return (
    role === USER_ROLE.ADMIN ||
    role === USER_ROLE.MANAGER ||
    role === USER_ROLE.FINANCE ||
    role === USER_ROLE.OPERATION
  )
}
