import { USER_ROLE } from '../contracts/v1/user.js'
import { ORDER_PANEL_TABS } from '../mappers/order/orderOperationPanelModel.js'
import { canApprovePayments } from '../lib/paymentApprovalPolicy.js'
import { canAccessPage } from './roleAccess.js'

/** @typedef {import('../contracts/v1/user.js').UserRole} UserRole */
/** @typedef {import('../contracts/orderDrawer.js').OrderDrawerTab} OrderDrawerTab */
/** @typedef {import('../contracts/orderDrawer.js').OrderDrawerSource} OrderDrawerSource */
/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../mappers/risk/riskDrawerUi.js').RiskDrawerModel} RiskDrawerModel */

/** @type {Record<UserRole, OrderDrawerTab[]>} */
const ROLE_VISIBLE_TABS = {
  [USER_ROLE.ADMIN]: ORDER_PANEL_TABS.map((t) => /** @type {OrderDrawerTab} */ (t.id)),
  [USER_ROLE.MANAGER]: ORDER_PANEL_TABS.map((t) => /** @type {OrderDrawerTab} */ (t.id)),
  [USER_ROLE.SALES]: ['overview', 'timeline', 'products', 'payments', 'shipment', 'ssh', 'history'],
  [USER_ROLE.OPERATION]: ORDER_PANEL_TABS.map((t) => /** @type {OrderDrawerTab} */ (t.id)),
  [USER_ROLE.WAREHOUSE]: ['overview', 'timeline', 'products', 'shipment', 'history'],
  [USER_ROLE.SERVICE]: ['overview', 'timeline', 'products', 'payments', 'ssh', 'history'],
  [USER_ROLE.FINANCE]: ['overview', 'timeline', 'products', 'payments', 'shipment', 'ssh', 'history'],
}

/**
 * @param {UserRole | undefined} role
 */
export function canViewOrderPayments(role) {
  return canViewDrawerTab(role, 'payments')
}

/**
 * Tahsilat girişi — Sales, Operation, Finance ve yöneticiler; Service salt okunur.
 * @param {UserRole | undefined} role
 */
export function canPostOrderPayment(role) {
  if (!role) return false
  if (role === USER_ROLE.ADMIN || role === USER_ROLE.MANAGER) return true
  if (role === USER_ROLE.SALES || role === USER_ROLE.OPERATION) return true
  if (role === USER_ROLE.FINANCE) return true
  return false
}

/**
 * @param {UserRole | undefined} role
 */
export function canApproveOrderPayment(role) {
  return canApprovePayments(role)
}

/**
 * Yeni sipariş sihirbazı — Sales ve Operation oluşturabilir.
 * @param {UserRole | undefined} role
 */
export function canCreateSalesOrder(role) {
  if (!role) return false
  return (
    role === USER_ROLE.ADMIN ||
    role === USER_ROLE.MANAGER ||
    role === USER_ROLE.SALES ||
    role === USER_ROLE.OPERATION
  )
}

/**
 * @param {UserRole | undefined} role
 * @param {OrderDrawerTab} tab
 */
export function canViewDrawerTab(role, tab) {
  if (!role) return true
  const allowed = ROLE_VISIBLE_TABS[role]
  return allowed ? allowed.includes(tab) : true
}

/**
 * @param {UserRole | undefined} role
 * @param {OrderDrawerTab} tab
 */
export function canEditDrawerTab(role, tab) {
  if (!role) return false
  if (role === USER_ROLE.ADMIN || role === USER_ROLE.MANAGER) return true
  if (role === USER_ROLE.SALES) return tab === 'payments' || tab === 'overview'
  if (role === USER_ROLE.OPERATION) {
    return tab === 'products' || tab === 'shipment' || tab === 'ssh' || tab === 'overview' || tab === 'payments'
  }
  if (role === USER_ROLE.WAREHOUSE) return tab === 'products'
  return false
}

/**
 * @param {UserRole | undefined} role
 */
export function canChangeOrderStatus(role) {
  return role === USER_ROLE.ADMIN || role === USER_ROLE.MANAGER || role === USER_ROLE.OPERATION
}

/**
 * @param {UserRole | undefined} role
 * @param {OrderDrawerSource | null} source
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveDefaultDrawerTab(role, source, dto) {
  if (source === 'collection' && role && canAccessPage(role, 'collection')) return 'payments'
  if (source === 'ssh') return 'ssh'
  if (source === 'shipment') return 'shipment'
  if (role === USER_ROLE.OPERATION) {
    if ((dto?.openMissingItemsCount ?? 0) > 0) return 'ssh'
    if ((dto?.shipmentSummaryOpenCount ?? 0) > 0 || (dto?.inTransitShipmentCount ?? 0) > 0) {
      return 'shipment'
    }
    return 'products'
  }
  if (role === USER_ROLE.WAREHOUSE) return 'products'
  if (role === USER_ROLE.SALES) return 'overview'
  return 'overview'
}

/**
 * @typedef {Object} DrawerPrimaryCta
 * @property {string} label
 * @property {OrderDrawerTab} tab
 * @property {'primary' | 'ghost'} variant
 * @property {boolean} disabled
 * @property {string} [disabledReason]
 */

/**
 * @param {UserRole | undefined} role
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {number} remaining
 * @param {RiskDrawerModel} riskModel
 * @param {import('../mappers/order/globalOperationLocks.js').OperationLock[]} locks
 * @param {OrderDrawerSource | null} [source]
 * @returns {DrawerPrimaryCta}
 */
export function resolveDrawerPrimaryCta(role, order, dto, remaining, riskModel, locks, source) {
  const sshBlocked = locks.some((l) => l.id === 'SSH_BLOCKS_SHIPMENT' && l.blocks)

  if (source === 'collection' && role && canAccessPage(role, 'collection')) {
    void riskModel
    return { label: 'Ödeme al', tab: 'payments', variant: 'primary', disabled: false }
  }

  if (source === 'ssh' && (role === USER_ROLE.OPERATION || role === USER_ROLE.ADMIN || role === USER_ROLE.MANAGER)) {
    return { label: 'Parça durumu güncelle', tab: 'ssh', variant: 'primary', disabled: false }
  }

  if (role === USER_ROLE.SALES) {
    if (remaining > 0.009) {
      return { label: 'Ödeme al', tab: 'payments', variant: 'primary', disabled: false }
    }
    return { label: 'Sözleşme yazdır', tab: 'overview', variant: 'primary', disabled: false }
  }

  if (role === USER_ROLE.OPERATION) {
    if ((dto?.openMissingItemsCount ?? 0) > 0) {
      return { label: 'SSH takibi', tab: 'ssh', variant: 'primary', disabled: false }
    }
    const planBlocked = locks.some((l) => l.blocks && l.scopes.includes('shipment_plan'))
    return {
      label: 'Sevk planla',
      tab: 'shipment',
      variant: 'primary',
      disabled: planBlocked || sshBlocked,
      disabledReason: planBlocked ? locks.find((l) => l.blocks)?.message : undefined,
    }
  }

  if (role === USER_ROLE.WAREHOUSE) {
    return { label: 'Ürün alımı', tab: 'products', variant: 'primary', disabled: false }
  }

  if ((dto?.openMissingItemsCount ?? 0) > 0) {
    return { label: 'SSH takibi', tab: 'ssh', variant: 'primary', disabled: false }
  }
  if (remaining > 0.009 && remaining / Math.max(order.amount, 1) > 0.4) {
    return { label: 'Ödeme kaydet', tab: 'payments', variant: 'primary', disabled: false }
  }
  const planBlocked = locks.some((l) => l.blocks && l.scopes.includes('shipment_plan'))
  return {
    label: 'Sevk & montaj',
    tab: 'shipment',
    variant: 'primary',
    disabled: planBlocked,
    disabledReason: planBlocked ? locks.find((l) => l.blocks)?.message : undefined,
  }
}

/**
 * @param {UserRole | undefined} role
 * @param {OrderDrawerTab | undefined} requestedTab
 * @param {OrderDrawerSource | null} source
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveEffectiveDrawerTab(role, requestedTab, source, dto) {
  const fallback = resolveDefaultDrawerTab(role, source, dto)
  if (!requestedTab) return fallback
  if (!canViewDrawerTab(role, requestedTab)) return fallback
  return requestedTab
}
