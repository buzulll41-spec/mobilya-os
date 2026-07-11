import { DEMO_TODAY } from '../../data/constants.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { computeOperationalKpis } from '../../domain/kpi/operationalKpiService.js'
import { isTerminOverdue } from '../../utils/orderFinance.js'
import { formatShortDate } from '../../utils/dates.js'
import { filterCollectionRows } from '../collection/collectionCommandCenterModel.js'
import {
  buildCollectionLabel,
  buildOrdersOpsTableRow,
  buildShipmentLabel,
  isCriticalRiskOrder,
  isOpenOrder,
} from '../../features/orders/ordersOpsCenterUi.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/orderListRowVm.js').OrderListRowVM} OrderListRowVM */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../lib/opsDeepLink.js').OpsDeepLinkFilterId} OpsDeepLinkFilterId */

/**
 * @typedef {'success' | 'warning' | 'critical' | 'neutral'} StoreTone
 *
 * @typedef {Object} MobileStoreHomeCard
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {string} hint
 * @property {StoreTone} tone
 * @property {string} navTarget
 * @property {OpsDeepLinkFilterId} [navFilter]
 *
 * @typedef {Object} MobileStoreQuickAction
 * @property {import('../../contracts/v1/mobileStoreOpsFaz115.js').MobileStoreQuickActionId} id
 * @property {string} label
 * @property {string} icon
 * @property {string} [navTarget]
 * @property {OpsDeepLinkFilterId} [navFilter]
 * @property {'new-order' | 'focus-search' | 'open-shipment-plan'} [actionKind]
 *
 * @typedef {Object} MobileOrderCardVm
 * @property {string} id
 * @property {string} orderNo
 * @property {string} customer
 * @property {string} phone
 * @property {string} statusLabel
 * @property {string} terminLabel
 * @property {boolean} terminOverdue
 * @property {string} balanceLabel
 * @property {string} shipmentLabel
 * @property {StoreTone} tone
 */

export const MOBILE_STORE_HOME_CARDS = /** @type {const} */ ([
  'today-orders',
  'pending-collection',
  'today-shipments',
  'critical-alerts',
])

export const MOBILE_STORE_QUICK_ACTIONS = /** @type {const} */ ([
  { id: 'new-order', label: 'Yeni Sipariş', icon: '➕', actionKind: 'new-order' },
  { id: 'collection', label: 'Tahsilat Gir', icon: '💰', navTarget: 'collection' },
  { id: 'shipment', label: 'Sevk Planla', icon: '🚚', navTarget: 'shipment-ops', navFilter: 'today' },
  { id: 'customer-search', label: 'Müşteri Ara', icon: '🔍', actionKind: 'focus-search' },
])

export const MOBILE_COLLECTION_PRIORITY_CHIPS = /** @type {const} */ ([
  { id: 'search', label: 'Sipariş ara', actionKind: 'focus-search' },
  { id: 'deposit', label: 'Kapora gir', actionKind: 'open-deposit' },
  { id: 'payment', label: 'Tahsilat gir', actionKind: 'open-payment' },
  { id: 'balance', label: 'Bakiye gör', filterId: 'all' },
])

export const MOBILE_SHIPMENT_PRIORITY_CHIPS = /** @type {const} */ ([
  { id: 'today', label: 'Bugünkü sevk', horizon: 'today' },
  { id: 'tomorrow', label: 'Yarınki sevk', horizon: 'tomorrow' },
  { id: 'overdue', label: 'Geciken sevk', horizon: 'overdue' },
  { id: 'delivered', label: 'Teslim edildi', horizon: 'delivered' },
])

/**
 * @param {{
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   shipmentPlans?: import('../../state/shipmentPlanStore.js').ShipmentPlan[]
 *   todayIso?: string
 * }} input
 * @returns {MobileStoreHomeCard[]}
 */
export function buildMobileStoreHomeCards(input) {
  const {
    orders,
    listItemDtos,
    collectionRows,
    shipmentPlans = [],
    todayIso = DEMO_TODAY,
  } = input

  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))
  const {
    dashKpis: kpis,
    openCollections,
    criticalCollections,
    overdueCollections,
    activeOrders,
    todayShipments,
    delayedShipmentKpi: delayedShipments,
  } = computeOperationalKpis({ orders, listItemDtos, collectionRows, shipmentPlans, todayIso })

  const pendingCollection = openCollections.length
  const todayOrders = activeOrders.filter((o) => o.orderDate === todayIso)

  const criticalOrders = activeOrders.filter((row) => {
    const dto = dtoById.get(row.id)
    return isCriticalRiskOrder(
      /** @type {OrderListRowVM} */ (row),
      dto,
      todayIso,
    )
  })

  const criticalAlerts = criticalCollections.length + criticalOrders.length + delayedShipments

  return [
    {
      id: 'today-orders',
      label: 'Bugünkü Siparişler',
      value: String(todayOrders.length || kpis.todayOrderCount || 0),
      hint: 'Yeni ve açık siparişler',
      tone: todayOrders.length > 0 ? 'success' : 'neutral',
      navTarget: 'orders',
      navFilter: 'new',
    },
    {
      id: 'pending-collection',
      label: 'Bekleyen Tahsilatlar',
      value: String(pendingCollection),
      hint: overdueCollections.length > 0 ? `${overdueCollections.length} gecikmiş` : 'Açık bakiye',
      tone: overdueCollections.length > 0 ? 'warning' : pendingCollection > 0 ? 'neutral' : 'success',
      navTarget: 'collection',
      navFilter: overdueCollections.length > 0 ? 'overdue' : 'all',
    },
    {
      id: 'today-shipments',
      label: 'Bugünkü Sevkler',
      value: String(todayShipments.length),
      hint: 'Planlanan teslimatlar',
      tone: todayShipments.length > 0 ? 'warning' : 'neutral',
      navTarget: 'shipment-ops',
      navFilter: 'today',
    },
    {
      id: 'critical-alerts',
      label: 'Kritik Uyarılar',
      value: String(criticalAlerts),
      hint: 'Risk, tahsilat, sevk',
      tone: criticalAlerts > 0 ? 'critical' : 'success',
      navTarget: 'orders',
      navFilter: 'critical',
    },
  ]
}

/**
 * @param {OrderListRowVM} row
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 * @returns {MobileOrderCardVm}
 */
export function buildMobileOrderCardVm(row, dto, todayIso) {
  const tableRow = buildOrdersOpsTableRow(row, dto, todayIso)
  const phone = row.phone?.trim() || row.phone2?.trim() || '—'

  return {
    id: row.id,
    orderNo: tableRow.orderNo,
    customer: row.customer,
    phone,
    statusLabel: row.status,
    terminLabel: row.dueDate ? formatShortDate(row.dueDate) : '—',
    terminOverdue: isTerminOverdue(row, todayIso),
    balanceLabel: buildCollectionLabel(row, dto),
    shipmentLabel: buildShipmentLabel(row, dto),
    tone: tableRow.tone,
  }
}

/**
 * @param {import('../../features/shipment-ops/shipmentOpsCenterUi.js').ShipmentPlannedTableRow} row
 */
export function isMobileDeliveredShipmentRow(row) {
  const label = `${row.statusLabel ?? ''} ${row.shipmentStatus ?? ''}`.toLowerCase()
  return label.includes('teslim') || label.includes('delivered')
}

/** @param {string | null | undefined} raw */
export function normalizeSearchDigits(raw) {
  return String(raw ?? '').replace(/\D/g, '')
}

/** @param {string} message */
export function toMobileFriendlyErrorMessage(message) {
  const text = String(message ?? '').trim()
  if (!text) return 'Veriler şu an yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.'
  if (/network|fetch|failed|timeout|offline/i.test(text)) {
    return 'İnternet bağlantısı zayıf görünüyor. Bağlantınızı kontrol edip yeniden deneyin.'
  }
  if (/401|403|yetki|unauthorized|forbidden/i.test(text)) {
    return 'Bu işlem için yetkiniz bulunmuyor. Yöneticinize başvurun.'
  }
  if (/500|502|503|server/i.test(text)) {
    return 'Sunucuya ulaşılamadı. Biraz sonra tekrar deneyin.'
  }
  if (/Bu işlem için yetkiniz yok/.test(text)) {
    return 'Bu işlem için yetkiniz bulunmuyor.'
  }
  return text.length > 120 ? `${text.slice(0, 117)}…` : text
}

export {}
