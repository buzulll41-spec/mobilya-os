import { resolveQuickActionsForPage } from '../lib/quickActions.js'

/** Telefonda alt aksiyon bar gösterilecek sayfalar. */
export const MOBILE_BOTTOM_ACTION_PAGES = new Set([
  'dashboard',
  'enterprise-ceo-dashboard',
  'orders',
  'shipment-ops',
  'collection',
  'supply-incoming',
  'product-master-center',
])

/**
 * @param {string} page
 * @param {import('../../contracts/v1/user.js').UserRole | undefined} role
 * @param {number} [limit]
 */
export function resolveMobileBottomActions(page, role, limit = 3) {
  if (!MOBILE_BOTTOM_ACTION_PAGES.has(page)) return []
  return resolveQuickActionsForPage(page, role).slice(0, limit)
}
