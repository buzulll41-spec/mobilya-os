import { DEMO_TODAY } from '../../data/constants.js'
import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../../constants/supplyOrderStatus.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { getOrderLinesForSalesOrder } from '../../services/mockOrderLineStore.js'
import { getShipmentsForSalesOrder } from '../../services/mockShipmentStore.js'
import { moneyToNumber } from '../moneyHelpers.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { shipmentStatusLabel } from '../shipment/shipmentStatusLabel.js'
import { isTerminOverdue } from '../../utils/orderFinance.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/** @typedef {'critical' | 'warning' | 'active' | 'success' | 'neutral'} OperationMapRiskTone */

/**
 * @typedef {Object} OperationMapBoardDef
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {boolean} [comingSoon]
 */

/**
 * @typedef {Object} OperationMapColumnDef
 * @property {string} id
 * @property {string} label
 */

/**
 * @typedef {Object} OperationMapCard
 * @property {string} orderId
 * @property {string} customer
 * @property {string} orderNo
 * @property {string} totalLabel
 * @property {string} remainingLabel
 * @property {string} supplyStatusLabel
 * @property {string} shipmentStatusLabel
 * @property {string} riskLabel
 * @property {OperationMapRiskTone} riskTone
 * @property {string} columnId
 */

export const OPERATION_MAP_BOARDS = /** @type {OperationMapBoardDef[]} */ ([
  { id: 'order', label: 'Siparişler', description: 'Sipariş yaşam döngüsü akışı' },
  { id: 'shipment', label: 'Sevkiyat', description: 'Sevk ve teslimat akışı' },
  { id: 'collection', label: 'Tahsilat', description: 'Tahsilat ve bakiye akışı' },
  { id: 'supply', label: 'Tedarik', description: 'Tedarik ve depo giriş akışı' },
  { id: 'ssh', label: 'SSH', description: 'Servis / eksik parça takibi', comingSoon: true },
  {
    id: 'digital-workforce',
    label: 'Digital Workforce',
    description: 'Otonom operasyon ajanları',
    comingSoon: true,
  },
])

export const ORDER_FLOW_COLUMNS = /** @type {OperationMapColumnDef[]} */ ([
  { id: 'new_order', label: 'Yeni Sipariş' },
  { id: 'deposit_received', label: 'Kapora Alındı' },
  { id: 'supply_pending', label: 'Tedarik Bekliyor' },
  { id: 'product_waiting', label: 'Ürün Bekleniyor' },
  { id: 'product_arrived', label: 'Ürün Geldi' },
  { id: 'shipment_planned', label: 'Sevk Planlandı' },
  { id: 'delivered', label: 'Teslim Edildi' },
  { id: 'remaining_collection', label: 'Kalan Tahsilat' },
  { id: 'completed', label: 'Tamamlandı' },
])

export const SHIPMENT_FLOW_COLUMNS = /** @type {OperationMapColumnDef[]} */ ([
  { id: 'to_plan', label: 'Planlanacak' },
  { id: 'planned', label: 'Planlandı' },
  { id: 'vehicle_assigned', label: 'Araç Atandı' },
  { id: 'dispatched', label: 'Yola Çıktı' },
  { id: 'delivered', label: 'Teslim Edildi' },
  { id: 'installation_waiting', label: 'Montaj Bekliyor' },
  { id: 'completed', label: 'Tamamlandı' },
])

export const COLLECTION_FLOW_COLUMNS = /** @type {OperationMapColumnDef[]} */ ([
  { id: 'no_payment', label: 'Ödeme Yok' },
  { id: 'deposit_received', label: 'Kapora Alındı' },
  { id: 'partial_payment', label: 'Kısmi Ödeme' },
  { id: 'pending_approval', label: 'Onay Bekliyor' },
  { id: 'remaining_balance', label: 'Kalan Bakiye Var' },
  { id: 'closed', label: 'Kapandı' },
])

export const SUPPLY_FLOW_COLUMNS = /** @type {OperationMapColumnDef[]} */ ([
  { id: 'not_sent', label: 'Tedarik Verilmedi' },
  { id: 'sent', label: 'Tedarik Verildi' },
  { id: 'waiting', label: 'Bekleniyor' },
  { id: 'partial_arrived', label: 'Kısmi Geldi' },
  { id: 'full_arrived', label: 'Tam Geldi' },
  { id: 'issue', label: 'Sorunlu' },
  { id: 'closed', label: 'Kapandı' },
])

/** @param {string} boardId */
export function columnsForBoard(boardId) {
  switch (boardId) {
    case 'order':
      return ORDER_FLOW_COLUMNS
    case 'shipment':
      return SHIPMENT_FLOW_COLUMNS
    case 'collection':
      return COLLECTION_FLOW_COLUMNS
    case 'supply':
      return SUPPLY_FLOW_COLUMNS
    default:
      return []
  }
}

/**
 * @param {string} orderId
 */
export function summarizeLineSupply(orderId) {
  const lines = getOrderLinesForSalesOrder(orderId)
  if (!lines.length) return null
  const supplySent = lines.filter((l) => (l.supplyStatus ?? SUPPLY_STATUS.NOT_SENT) === SUPPLY_STATUS.SENT)
  const allSent = supplySent.length === lines.length
  const anyPartial = lines.some((l) => l.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED)
  const allArrived = lines.every((l) => l.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED)
  const anyWaiting = lines.some(
    (l) =>
      (l.supplyStatus ?? SUPPLY_STATUS.NOT_SENT) === SUPPLY_STATUS.SENT &&
      (l.warehouseEntryStatus ?? WAREHOUSE_ENTRY_STATUS.NOT_SENT) === WAREHOUSE_ENTRY_STATUS.WAITING,
  )
  return { allSent, anyPartial, allArrived, anyWaiting, lineCount: lines.length }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveSupplyStatusLabel(order, dto) {
  const summary = summarizeLineSupply(order.id)
  if (!summary) {
    if (order.status === 'Geldi' || order.status === 'Hazır') return 'Geldi'
    if (order.status === 'Üretimde') return 'Bekleniyor'
    return 'Verilmedi'
  }
  if (summary.allArrived) return 'Tam Geldi'
  if (summary.anyPartial) return 'Kısmi Geldi'
  if (summary.anyWaiting) return 'Bekleniyor'
  if (summary.allSent) return 'Verildi'
  return 'Verilmedi'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
function resolveShipmentStatusLabel(order, dto) {
  const shipments = getShipmentsForSalesOrder(order.id)
  const latest = shipments[shipments.length - 1]
  if (latest?.status) return shipmentStatusLabel(String(latest.status))
  if ((dto?.inTransitShipmentCount ?? 0) > 0) return 'Yolda'
  if ((dto?.shipmentSummaryOpenCount ?? 0) > 0) return 'Planlandı'
  return order.status ?? dto?.displayStatus ?? '—'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
function resolveRisk(order, dto, todayIso) {
  const severity = dto?.currentRiskSeverity ?? 'NONE'
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    return { label: 'Kritik', tone: /** @type {const} */ ('critical') }
  }
  if ((dto?.openMissingItemsCount ?? 0) > 0 || dto?.hasShipmentIssue) {
    return { label: 'SSH / Sorun', tone: /** @type {const} */ ('critical') }
  }
  if (isTerminOverdue(order, todayIso) || dto?.hasOverdueBalance) {
    return { label: 'Gecikme', tone: /** @type {const} */ ('warning') }
  }
  if (order.status === 'Teslim Edildi' && remainingBalance(order) <= 0.009) {
    return { label: 'Tamam', tone: /** @type {const} */ ('success') }
  }
  if (order.status === 'İptal') {
    return { label: 'Kapalı', tone: /** @type {const} */ ('neutral') }
  }
  return { label: 'Aktif', tone: /** @type {const} */ ('active') }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveOrderFlowColumn(order, dto) {
  const status = order.status ?? dto?.displayStatus ?? ''
  const remaining = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)
  const paid = dto ? moneyToNumber(dto.amountPaid) : order.paidAmount ?? 0
  const summary = summarizeLineSupply(order.id)
  const shipments = getShipmentsForSalesOrder(order.id)
  const hasShipmentPlan = shipments.length > 0 || (dto?.shipmentSummaryOpenCount ?? 0) > 0

  if (status === 'Teslim Edildi' && remaining <= 0.009) return 'completed'
  if (status === 'Teslim Edildi' && remaining > 0.009) return 'remaining_collection'
  if (status === 'Teslim Edildi') return 'delivered'
  if (hasShipmentPlan && (status === 'Sevke Hazır' || status === 'Planlandı' || status === 'Hazır')) {
    return 'shipment_planned'
  }
  if (summary?.allArrived || status === 'Geldi' || status === 'Hazır') return 'product_arrived'
  if (summary?.anyWaiting || (summary?.allSent && !summary.allArrived)) return 'product_waiting'
  if (summary && !summary.allSent) return 'supply_pending'
  if (paid > 0.009) return 'deposit_received'
  return 'new_order'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveShipmentFlowColumn(order, dto) {
  const status = order.status ?? dto?.displayStatus ?? ''
  if (status === 'Teslim Edildi' && !dto?.installationPending) return 'completed'
  if (dto?.installationPending) return 'installation_waiting'
  if (status === 'Teslim Edildi') return 'delivered'
  if ((dto?.inTransitShipmentCount ?? 0) > 0) return 'dispatched'

  const shipments = getShipmentsForSalesOrder(order.id)
  const latest = shipments[shipments.length - 1]
  const raw = String(latest?.status ?? '').toUpperCase()
  if (raw === 'DISPATCHED') return 'dispatched'
  if (raw === 'LOADED') return 'vehicle_assigned'
  if (raw === 'PLANNED' || (dto?.shipmentSummaryOpenCount ?? 0) > 0) return 'planned'
  return 'to_plan'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveCollectionFlowColumn(order, dto) {
  const remaining = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)
  const paid = dto ? moneyToNumber(dto.amountPaid) : order.paidAmount ?? 0
  const total = dto ? moneyToNumber(dto.totalAmount) : order.totalAmount ?? order.amount ?? 0

  if ((dto?.pendingApprovalPaymentCount ?? 0) > 0) return 'pending_approval'
  if (remaining <= 0.009) return 'closed'
  if (paid <= 0.009) return 'no_payment'
  if (paid > 0 && paid < total * 0.35 && remaining > total * 0.5) return 'deposit_received'
  if (remaining > 0.009 && paid > 0.009) return 'remaining_balance'
  if (paid > 0.009 && paid < total - 0.009) return 'partial_payment'
  return 'no_payment'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveSupplyFlowColumn(order, dto) {
  const status = order.status ?? dto?.displayStatus ?? ''
  if (status === 'Teslim Edildi' || status === 'İptal') return 'closed'
  if ((dto?.openMissingItemsCount ?? 0) > 0 || dto?.hasShipmentIssue) return 'issue'

  const summary = summarizeLineSupply(order.id)
  if (!summary) {
    if (status === 'Geldi' || status === 'Hazır') return 'full_arrived'
    if (status === 'Üretimde') return 'waiting'
    return 'not_sent'
  }
  if (summary.allArrived) return 'full_arrived'
  if (summary.anyPartial) return 'partial_arrived'
  if (summary.anyWaiting) return 'waiting'
  if (summary.allSent) return 'sent'
  return 'not_sent'
}

/** @param {string} boardId @param {Order} order @param {SalesOrderListItemDto | undefined} dto */
function resolveColumnForBoard(boardId, order, dto) {
  switch (boardId) {
    case 'order':
      return resolveOrderFlowColumn(order, dto)
    case 'shipment':
      return resolveShipmentFlowColumn(order, dto)
    case 'collection':
      return resolveCollectionFlowColumn(order, dto)
    case 'supply':
      return resolveSupplyFlowColumn(order, dto)
    default:
      return 'new_order'
  }
}

/**
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} dtos
 * @param {string} boardId
 * @param {string} [todayIso]
 */
export function buildOperationMapBoard(orders, dtos, boardId, todayIso = DEMO_TODAY) {
  const dtoById = new Map(dtos.map((d) => [d.id, d]))
  const columns = columnsForBoard(boardId)
  /** @type {Record<string, OperationMapCard[]>} */
  const grouped = Object.fromEntries(columns.map((c) => [c.id, []]))

  for (const order of orders) {
    if (order.status === 'İptal') continue
    const dto = dtoById.get(order.id)
    const columnId = resolveColumnForBoard(boardId, order, dto)
    const risk = resolveRisk(order, dto, todayIso)
    const total = dto ? moneyToNumber(dto.totalAmount) : order.totalAmount ?? order.amount ?? 0
    const remaining = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)

    /** @type {OperationMapCard} */
    const card = {
      orderId: order.id,
      customer: dto?.customerDisplayName ?? order.customer,
      orderNo: dto?.orderNumber ?? order.id,
      totalLabel: formatTry(total),
      remainingLabel: formatTry(remaining),
      supplyStatusLabel: resolveSupplyStatusLabel(order, dto),
      shipmentStatusLabel: resolveShipmentStatusLabel(order, dto),
      riskLabel: risk.label,
      riskTone: risk.tone,
      columnId,
    }

    if (grouped[columnId]) grouped[columnId].push(card)
    else if (columns[0]) grouped[columns[0].id].push(card)
  }

  return { columns, grouped }
}

/**
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} dtos
 */
export function buildOperationMapHubCounts(orders, dtos) {
  const active = orders.filter((o) => o.status !== 'İptal')
  const dtoById = new Map(dtos.map((d) => [d.id, d]))
  let openBalance = 0
  for (const o of active) {
    const dto = dtoById.get(o.id)
    const rem = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(o)
    if (rem > 0.009) openBalance += 1
  }
  return {
    order: active.length,
    shipment: active.filter((o) => {
      const dto = dtoById.get(o.id)
      return (dto?.shipmentSummaryOpenCount ?? 0) > 0 || (getShipmentsForSalesOrder(o.id).length ?? 0) > 0
    }).length,
    collection: openBalance,
    supply: active.filter((o) => resolveSupplyFlowColumn(o, dtoById.get(o.id)) !== 'closed').length,
    ssh: dtos.reduce((n, d) => n + (d.openMissingItemsCount ?? 0), 0),
  }
}
