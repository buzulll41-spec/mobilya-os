import { USER_ROLE } from '../contracts/v1/user.js'

/** @typedef {import('../contracts/v1/user.js').UserRole} UserRole */

/** @type {Record<UserRole, string[]>} */
export const ROLE_PAGE_ACCESS = {
  [USER_ROLE.ADMIN]: [
    'enterprise-ceo-dashboard',
    'enterprise-release',
    'dashboard',
    'operation-map',
    'executive-center',
    'executive-command-center',
    'ceo-copilot',
    'digital-workforce',
    'operation-center',
    'operation-automation-center',
    'executive-war-room',
    'cash-radar',
    'ceo-control-center',
    'operations-agents',
    'executive-director',
    'strategic-intelligence',
    'company-simulation',
    'board-directors',
    'ceo-intelligence',
    'chairman-intelligence',
    'future-engine',
    'investor-intelligence',
    'holding-center',
    'group-chairman',
    'business-brain',
    'action-orchestrator',
    'performance-feedback',
    'learning-engine',
    'optimization-engine',
    'goal-engine',
    'enterprise-command-center',
    'manager-cockpit',
    'forecast-engine',
    'ai-operations-advisor',
    'action-center',
    'operation-cases',
    'automation-center',
    'business-rules',
    'business-rule-tester',
    'orders',
    'products',
    'product-master-center',
    'product-health',
    'product-publish-readiness',
    'media-center',
    'commerce-publishing',
    'woocommerce-connector',
    'supply-incoming',
    'shipment-ops',
    'collection',
    'sales-source-analytics',
    'profitability-analytics',
    'data-quality',
    'ssh-service',
    'users-admin',
    'pilot-readiness',
    'go-live',
    'system-health',
    'error-center',
  ],
  [USER_ROLE.MANAGER]: [
    'enterprise-ceo-dashboard',
    'dashboard',
    'operation-map',
    'executive-center',
    'executive-command-center',
    'ceo-copilot',
    'digital-workforce',
    'operation-center',
    'operation-automation-center',
    'ceo-control-center',
    'manager-cockpit',
    'orders',
    'products',
    'product-master-center',
    'product-health',
    'product-publish-readiness',
    'commerce-publishing',
    'media-center',
    'woocommerce-connector',
    'supply-incoming',
    'shipment-ops',
    'collection',
    'ssh-service',
    'sales-source-analytics',
    'profitability-analytics',
    'system-health',
    'error-center',
  ],
  [USER_ROLE.SALES]: [
    'dashboard',
    'orders',
    'products',
    'product-master-center',
    'collection',
  ],
  [USER_ROLE.OPERATION]: [
    'dashboard',
    'operation-map',
    'operation-cases',
    'operation-center',
    'operation-automation-center',
    'orders',
    'shipment-ops',
    'ssh-service',
    'supply-incoming',
  ],
  [USER_ROLE.SERVICE]: [
    'dashboard',
    'ssh-service',
    'orders',
  ],
  [USER_ROLE.FINANCE]: [
    'dashboard',
    'collection',
    'supply-incoming',
    'profitability-analytics',
  ],
  [USER_ROLE.WAREHOUSE]: ['dashboard', 'supply-incoming', 'shipment-ops', 'products', 'product-master-center'],
}

/**
 * @param {UserRole | undefined} role
 * @param {string} pageId
 */
export function canAccessPage(role, pageId) {
  if (!role) return false
  const allowed = ROLE_PAGE_ACCESS[role]
  if (!allowed) return false
  if (pageId === 'supplier-ledger-center') {
    return allowed.includes('supply-incoming')
  }
  return allowed.includes(pageId)
}

/**
 * @param {UserRole | undefined} role
 * @param {{ id: string }[]} navItems
 */
export function filterNavForRole(role, navItems) {
  if (!role) return []
  return navItems.filter((item) => canAccessPage(role, item.id))
}
