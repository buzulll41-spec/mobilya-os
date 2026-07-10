import { USER_ROLE } from '../contracts/v1/user.js'
import { canAccessPage } from './roleAccess.js'
import { canCreateSalesOrder, canPostOrderPayment } from './orderDrawerPermissions.js'

/** @typedef {import('../contracts/v1/user.js').UserRole} UserRole */

/** FAZ 46 mağaza operasyon aksiyonları */
export const STORE_ACTION = {
  CREATE_ORDER: 'create_order',
  POST_DEPOSIT: 'post_deposit',
  CREATE_SUPPLY: 'create_supply',
  PLAN_SHIPMENT: 'plan_shipment',
  POST_COLLECTION: 'post_collection',
  CREATE_SSH: 'create_ssh',
  CONFIRM_DELIVERY: 'confirm_delivery',
  VIEW_REPORTS: 'view_reports',
  MANAGE_USERS: 'manage_users',
  VIEW_SYSTEM_HEALTH: 'view_system_health',
}

/** @type {Record<string, UserRole[]>} */
const ACTION_ROLES = {
  [STORE_ACTION.CREATE_ORDER]: [
    USER_ROLE.ADMIN,
    USER_ROLE.MANAGER,
    USER_ROLE.SALES,
    USER_ROLE.OPERATION,
  ],
  [STORE_ACTION.POST_DEPOSIT]: [
    USER_ROLE.ADMIN,
    USER_ROLE.MANAGER,
    USER_ROLE.SALES,
    USER_ROLE.OPERATION,
    USER_ROLE.FINANCE,
  ],
  [STORE_ACTION.CREATE_SUPPLY]: [
    USER_ROLE.ADMIN,
    USER_ROLE.MANAGER,
    USER_ROLE.OPERATION,
    USER_ROLE.WAREHOUSE,
  ],
  [STORE_ACTION.PLAN_SHIPMENT]: [
    USER_ROLE.ADMIN,
    USER_ROLE.MANAGER,
    USER_ROLE.OPERATION,
    USER_ROLE.WAREHOUSE,
  ],
  [STORE_ACTION.POST_COLLECTION]: [
    USER_ROLE.ADMIN,
    USER_ROLE.MANAGER,
    USER_ROLE.SALES,
    USER_ROLE.OPERATION,
    USER_ROLE.FINANCE,
  ],
  [STORE_ACTION.CREATE_SSH]: [
    USER_ROLE.ADMIN,
    USER_ROLE.MANAGER,
    USER_ROLE.OPERATION,
    USER_ROLE.SERVICE,
  ],
  [STORE_ACTION.CONFIRM_DELIVERY]: [
    USER_ROLE.ADMIN,
    USER_ROLE.MANAGER,
    USER_ROLE.OPERATION,
    USER_ROLE.WAREHOUSE,
  ],
  [STORE_ACTION.VIEW_REPORTS]: [
    USER_ROLE.ADMIN,
    USER_ROLE.MANAGER,
    USER_ROLE.FINANCE,
  ],
  [STORE_ACTION.MANAGE_USERS]: [USER_ROLE.ADMIN],
  [STORE_ACTION.VIEW_SYSTEM_HEALTH]: [USER_ROLE.ADMIN, USER_ROLE.MANAGER],
}

/** FAZ 46 rol etiketleri (UI) */
export const STORE_ROLE_LABELS = {
  [USER_ROLE.ADMIN]: 'CEO',
  [USER_ROLE.MANAGER]: 'Manager',
  [USER_ROLE.SALES]: 'Sales',
  [USER_ROLE.FINANCE]: 'Finance',
  [USER_ROLE.OPERATION]: 'Shipment',
  [USER_ROLE.WAREHOUSE]: 'Procurement',
  [USER_ROLE.SERVICE]: 'Service',
}

/**
 * @param {UserRole | undefined} role
 * @param {string} action
 */
export function canPerformStoreAction(role, action) {
  if (!role) return false
  const allowed = ACTION_ROLES[action]
  if (!allowed) return false
  return allowed.includes(role)
}

/**
 * Sayfa + aksiyon birleşik kontrol.
 * @param {UserRole | undefined} role
 * @param {string} action
 * @param {string} [pageId]
 */
export function canPerformStoreActionOnPage(role, action, pageId) {
  if (!canPerformStoreAction(role, action)) return false
  if (pageId && !canAccessPage(role, pageId)) return false

  if (action === STORE_ACTION.CREATE_ORDER) return canCreateSalesOrder(role)
  if (action === STORE_ACTION.POST_DEPOSIT || action === STORE_ACTION.POST_COLLECTION) {
    return canPostOrderPayment(role)
  }
  return true
}
