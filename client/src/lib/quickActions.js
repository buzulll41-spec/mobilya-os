import { canPerformStoreAction, STORE_ACTION } from '../constants/roleActions.js'
import { canAccessPage } from '../constants/roleAccess.js'

/**
 * @typedef {{
 *   id: string
 *   label: string
 *   page?: string
 *   action?: string
 * }} QuickActionDef
 */

/** @typedef {import('../contracts/v1/user.js').UserRole} UserRole */

/** @type {QuickActionDef[]} */
export const GLOBAL_QUICK_ACTIONS = [
  { id: 'new-order', label: 'Yeni Sipariş', page: 'orders', action: 'new-order' },
  { id: 'collection', label: 'Tahsilat Gir', page: 'collection' },
  { id: 'shipment', label: 'Sevk Oluştur', page: 'shipment-ops' },
  { id: 'customer-search', label: 'Müşteri Ara', page: 'orders', action: 'focus-search' },
  { id: 'ssh', label: 'SSH Aç', page: 'ssh-service' },
]

/** @type {Record<string, QuickActionDef[]>} */
export const MODULE_QUICK_ACTIONS = {
  dashboard: [
    { id: 'new-order', label: 'Yeni Sipariş', page: 'orders', action: 'new-order' },
    { id: 'ceo', label: 'CEO Komuta Merkezi', page: 'executive-command-center' },
  ],
  orders: [
    { id: 'new-order', label: 'Yeni Sipariş', action: 'new-order' },
    { id: 'contract', label: 'Sözleşme Yazdır', action: 'contract' },
  ],
  collection: [
    { id: 'payment', label: 'Tahsilat Gir', page: 'collection' },
    { id: 'pending', label: 'Onay Bekleyenler', page: 'collection', action: 'pending' },
  ],
  'shipment-ops': [
    { id: 'plan', label: 'Sevk Planla', page: 'shipment-ops' },
    { id: 'week', label: 'Haftalık Takvim', page: 'shipment-ops', action: 'week' },
  ],
  'ssh-service': [
    { id: 'new-case', label: 'SSH Kaydı', page: 'ssh-service' },
  ],
  'product-master-center': [
    { id: 'products', label: 'Ürün Kartları', page: 'products' },
    { id: 'publish', label: 'Yayına Hazır', page: 'product-publish-readiness' },
  ],
  'executive-command-center': [
    { id: 'workforce', label: 'Digital Workforce', page: 'digital-workforce' },
    { id: 'operation-map', label: 'Operasyon Haritası', page: 'operation-map' },
  ],
  'enterprise-ceo-dashboard': [
    { id: 'copilot', label: 'CEO Copilot', page: 'ceo-copilot' },
    { id: 'workforce', label: 'AI Workforce', page: 'digital-workforce' },
  ],
  'supply-incoming': [
    { id: 'incoming', label: 'Gelen Ürün', page: 'supply-incoming' },
    { id: 'supplier', label: 'Tedarikçi', page: 'supply-incoming' },
  ],
}

/** @param {QuickActionDef} action */
function actionStoreKey(action) {
  if (action.id === 'new-order') return STORE_ACTION.CREATE_ORDER
  if (action.id === 'collection' || action.id === 'payment') return STORE_ACTION.POST_COLLECTION
  if (action.id === 'shipment' || action.id === 'plan') return STORE_ACTION.PLAN_SHIPMENT
  if (action.id === 'ssh' || action.id === 'new-case') return STORE_ACTION.CREATE_SSH
  return null
}

/**
 * @param {QuickActionDef[]} actions
 * @param {UserRole | undefined} role
 */
export function filterQuickActionsForRole(actions, role) {
  if (!role) return []
  return actions.filter((action) => {
    const page = action.page ?? ''
    if (page && !canAccessPage(role, page)) return false
    const storeAction = actionStoreKey(action)
    if (storeAction && !canPerformStoreAction(role, storeAction)) return false
    return true
  })
}

/**
 * @param {string} page
 * @param {UserRole} [role]
 * @returns {QuickActionDef[]}
 */
export function resolveQuickActionsForPage(page, role) {
  const moduleActions = MODULE_QUICK_ACTIONS[page] ?? []
  const seen = new Set(moduleActions.map((a) => a.id))
  const merged = [...moduleActions]
  for (const action of GLOBAL_QUICK_ACTIONS) {
    if (!seen.has(action.id)) merged.push(action)
  }
  const sliced = merged.slice(0, 6)
  return role ? filterQuickActionsForRole(sliced, role) : sliced
}
