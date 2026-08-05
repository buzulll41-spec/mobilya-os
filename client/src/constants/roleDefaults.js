import { USER_ROLE } from '../contracts/v1/user.js'

/** @typedef {import('../contracts/v1/user.js').UserRole} UserRole */

/** @type {Record<UserRole, string>} */
export const ROLE_HOME_PAGE = {
  [USER_ROLE.ADMIN]: 'enterprise-ceo-dashboard',
  [USER_ROLE.MANAGER]: 'enterprise-ceo-dashboard',
  [USER_ROLE.SALES]: 'dashboard',
  [USER_ROLE.OPERATION]: 'dashboard',
  [USER_ROLE.SERVICE]: 'dashboard',
  [USER_ROLE.FINANCE]: 'dashboard',
  [USER_ROLE.WAREHOUSE]: 'dashboard',
}

/** @type {Record<UserRole, string>} */
export const ROLE_HOME_TITLE = {
  [USER_ROLE.ADMIN]: 'Yönetici Ana Ekranı',
  [USER_ROLE.MANAGER]: 'Günlük Operasyon Özeti',
  [USER_ROLE.SALES]: 'Satış Masası',
  [USER_ROLE.OPERATION]: 'Sevk & SSH Masası',
  [USER_ROLE.SERVICE]: 'Servis Masası',
  [USER_ROLE.FINANCE]: 'Tahsilat Masası',
  [USER_ROLE.WAREHOUSE]: 'Depo Masası',
}

/**
 * @param {UserRole | undefined} role
 */
export function resolveDefaultHomePage(role) {
  if (!role) return 'dashboard'
  return ROLE_HOME_PAGE[role] ?? 'dashboard'
}

/**
 * Field pilot (phone) role landing pages.
 * @param {UserRole | undefined} role
 */
export function resolveMobileFieldPilotHomePage(role) {
  if (!role) return 'dashboard'
  if (role === USER_ROLE.OPERATION) return 'dashboard'
  if (role === USER_ROLE.WAREHOUSE) return 'dashboard'
  if (role === USER_ROLE.SERVICE) return 'ssh-service'
  if (role === USER_ROLE.FINANCE) return 'collection'
  return 'dashboard'
}
