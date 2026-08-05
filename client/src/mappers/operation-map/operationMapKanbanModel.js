import { DEMO_TODAY } from '../../data/constants.js'
import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../../constants/supplyOrderStatus.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { getOrderLinesForSalesOrder } from '../../services/mockOrderLineStore.js'
import { formatShortDate } from '../../utils/dates.js'
import { moneyToNumber } from '../moneyHelpers.js'
import { isTerminOverdue, remainingBalance } from '../../utils/orderFinance.js'
import { summarizeLineSupply, resolveSupplyStatusLabel } from './operationMapModel.js'
import { BusinessEngine } from '../../engine/businessEngine.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/** @typedef {'green' | 'orange' | 'red'} KanbanRiskStripe */

/**
 * @typedef {Object} KanbanBadge
 * @property {string} id
 * @property {string} icon
 * @property {string} label
 */

/**
 * @typedef {Object} KanbanCard
 * @property {string} orderId
 * @property {string} customer
 * @property {string} orderNo
 * @property {string} phone
 * @property {string} totalLabel
 * @property {string} remainingLabel
 * @property {string} depositPercentLabel
 * @property {string} terminLabel
 * @property {string} shipmentDateLabel
 * @property {string} supplyStatusLabel
 * @property {string} riskLabel
 * @property {KanbanRiskStripe} riskStripe
 * @property {KanbanBadge[]} badges
 * @property {string} columnId
 * @property {boolean} isThisWeek
 * @property {string} [aiActivityTone] sales | shipment | collection | procurement
 * @property {string} [aiActivityLabel]
 */

/**
 * @typedef {Object} KanbanFilterDef
 * @property {string} id
 * @property {string} label
 */

export const KANBAN_COLUMNS = /** @type {{ id: string, label: string }[]} */ ([
  { id: 'new_order', label: 'Yeni Sipariş' },
  { id: 'deposit_pending', label: 'Kapora Bekleniyor' },
  { id: 'supply_pending', label: 'Tedarik Bekliyor' },
  { id: 'product_preparing', label: 'Ürün Hazırlanıyor' },
  { id: 'shipment_to_plan', label: 'Sevk Planlanacak' },
  { id: 'ready_to_ship', label: 'Sevke Hazır' },
  { id: 'in_transit', label: 'Yolda' },
  { id: 'delivery_confirmation', label: 'Teslim Onayı' },
  { id: 'completed', label: 'Tamamlandı' },
])

export const KANBAN_FILTERS = /** @type {KanbanFilterDef[]} */ ([
  { id: 'all', label: 'Tümü' },
  { id: 'order', label: 'Sipariş' },
  { id: 'shipment', label: 'Sevk' },
  { id: 'collection', label: 'Tahsilat' },
  { id: 'ssh', label: 'SSH' },
  { id: 'risky', label: 'Riskli' },
  { id: 'today', label: 'Bugün' },
  { id: 'week', label: 'Bu Hafta' },
  { id: 'overdue', label: 'Geciken' },
])

const ORDER_STAGE_COLUMNS = new Set([
  'new_order',
  'deposit_pending',
  'supply_pending',
  'product_preparing',
])

const SHIPMENT_STAGE_COLUMNS = new Set([
  'shipment_to_plan',
  'ready_to_ship',
  'in_transit',
  'delivery_confirmation',
])

/** @param {string | undefined} isoDate @param {string} todayIso */
function isDateInCurrentWeek(isoDate, todayIso) {
  if (!isoDate) return false
  const today = new Date(`${todayIso}T12:00:00`)
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const target = new Date(`${isoDate}T12:00:00`)
  return target >= monday && target <= sunday
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveKanbanColumn(order, dto) {
  return BusinessEngine.resolveKanbanColumnId(order, dto)
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
function resolveKanbanRiskStripe(order, dto, todayIso) {
  const severity = dto?.currentRiskSeverity ?? 'NONE'
  if (
    severity === 'CRITICAL' ||
    severity === 'HIGH' ||
    (dto?.openMissingItemsCount ?? 0) > 0 ||
    dto?.hasShipmentIssue
  ) {
    return /** @type {const} */ ('red')
  }
  if (isTerminOverdue(order, todayIso) || dto?.hasOverdueBalance) {
    return /** @type {const} */ ('orange')
  }
  return /** @type {const} */ ('green')
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 * @param {KanbanRiskStripe} riskStripe
 * @param {string} columnId
 * @param {boolean} [hasAiAlert]
 * @param {boolean} [hasCollectionAiRisk]
 * @param {boolean} [hasShipmentAiRisk]
 * @param {boolean} [hasProcurementAiRisk]
 */
function resolveKanbanBadges(order, dto, todayIso, riskStripe, columnId, hasAiAlert = false, hasCollectionAiRisk = false, hasShipmentAiRisk = false, hasProcurementAiRisk = false) {
  /** @type {KanbanBadge[]} */
  const badges = []
  if (hasProcurementAiRisk) {
    badges.push({ id: 'procurement-ai', icon: '📦', label: '📦' })
  }
  if (hasShipmentAiRisk) {
    badges.push({ id: 'shipment-ai', icon: '🚚', label: 'Sevk Riski' })
  }
  if (hasCollectionAiRisk) {
    badges.push({ id: 'collection-ai', icon: '💰', label: 'Tahsilat Riski' })
  }
  if (hasAiAlert) {
    badges.push({ id: 'ai', icon: '🤖', label: 'AI uyarı' })
  }
  const remaining = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)

  if (remaining > 0.009) {
    badges.push({ id: 'collection', icon: '⚠', label: 'Tahsilat' })
  }
  if (SHIPMENT_STAGE_COLUMNS.has(columnId) || (dto?.shipmentSummaryOpenCount ?? 0) > 0) {
    badges.push({ id: 'shipment', icon: '🚚', label: 'Sevk' })
  }
  if (ORDER_STAGE_COLUMNS.has(columnId) && columnId !== 'new_order') {
    badges.push({ id: 'supply', icon: '📦', label: 'Tedarik' })
  }
  if ((dto?.openMissingItemsCount ?? 0) > 0) {
    badges.push({ id: 'ssh', icon: '🛠', label: 'SSH' })
  }
  if (order.dueDate === todayIso || order.shipmentDate === todayIso) {
    badges.push({ id: 'today', icon: '📅', label: 'Bugün' })
  }
  if (isTerminOverdue(order, todayIso)) {
    badges.push({ id: 'overdue', icon: '🔥', label: 'Gecikti' })
  }
  if (riskStripe === 'red' && !badges.some((b) => b.id === 'overdue')) {
    badges.push({ id: 'risk', icon: '🔥', label: 'Risk' })
  }
  return badges
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
function resolveKanbanRiskLabel(order, dto, todayIso) {
  const stripe = resolveKanbanRiskStripe(order, dto, todayIso)
  if (stripe === 'red') return 'Kritik'
  if (stripe === 'orange') return 'Gecikme'
  if (order.status === 'Teslim Edildi') return 'Tamam'
  return 'Normal'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 * @param {Set<string>} [aiSalesOrderIds]
 * @param {Set<string>} [aiCollectionOrderIds]
 * @param {Set<string>} [aiShipmentOrderIds]
 * @param {Set<string>} [aiProcurementOrderIds]
 * @param {{ workerId: string, tone: string, workerLabel?: string } | undefined} [aiActivity]
 */
export function buildKanbanCard(
  order,
  dto,
  todayIso = DEMO_TODAY,
  aiSalesOrderIds = new Set(),
  aiCollectionOrderIds = new Set(),
  aiShipmentOrderIds = new Set(),
  aiProcurementOrderIds = new Set(),
  aiActivity,
) {
  const total = dto ? moneyToNumber(dto.totalAmount) : order.totalAmount ?? order.amount ?? 0
  const paid = dto ? moneyToNumber(dto.amountPaid) : order.paidAmount ?? 0
  const remaining = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)
  const depositPct = total > 0 ? Math.round((paid / total) * 100) : 0
  const columnId = resolveKanbanColumn(order, dto)
  const riskStripe = resolveKanbanRiskStripe(order, dto, todayIso)
  const weekDates = [order.dueDate, order.shipmentDate, order.orderDate].filter(Boolean)

  /** @type {KanbanCard} */
  return {
    orderId: order.id,
    customer: dto?.customerDisplayName ?? order.customer,
    orderNo: dto?.orderNumber ?? order.id,
    phone: order.phone ?? '',
    totalLabel: formatTry(total),
    remainingLabel: formatTry(remaining),
    depositPercentLabel: `%${depositPct}`,
    terminLabel: order.dueDate ? formatShortDate(order.dueDate) : '—',
    shipmentDateLabel: order.shipmentDate ? formatShortDate(order.shipmentDate) : '—',
    supplyStatusLabel: resolveSupplyStatusLabel(order, dto),
    riskLabel: resolveKanbanRiskLabel(order, dto, todayIso),
    riskStripe,
    badges: resolveKanbanBadges(
      order,
      dto,
      todayIso,
      riskStripe,
      columnId,
      aiSalesOrderIds.has(order.id),
      aiCollectionOrderIds.has(order.id),
      aiShipmentOrderIds.has(order.id),
      aiProcurementOrderIds.has(order.id),
    ),
    columnId,
    isThisWeek: weekDates.some((d) => isDateInCurrentWeek(d, todayIso)),
    aiActivityTone: aiActivity?.tone,
    aiActivityLabel: aiActivity?.workerLabel ?? (aiActivity ? 'AI çalışıyor' : undefined),
  }
}

/**
 * @param {KanbanCard} card
 * @param {string} filterId
 */
export function matchesKanbanFilter(card, filterId) {
  if (filterId === 'all') return true
  if (filterId === 'order') return ORDER_STAGE_COLUMNS.has(card.columnId)
  if (filterId === 'shipment') return SHIPMENT_STAGE_COLUMNS.has(card.columnId)
  if (filterId === 'collection') return card.badges.some((b) => b.id === 'collection')
  if (filterId === 'ssh') return card.badges.some((b) => b.id === 'ssh')
  if (filterId === 'risky') return card.riskStripe === 'red' || card.riskStripe === 'orange'
  if (filterId === 'today') return card.badges.some((b) => b.id === 'today')
  if (filterId === 'week') return card.isThisWeek
  if (filterId === 'overdue') return card.badges.some((b) => b.id === 'overdue')
  return true
}

/**
 * @param {KanbanCard} card
 * @param {string} query
 */
export function matchesKanbanSearch(card, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    card.customer.toLowerCase().includes(q) ||
    card.orderNo.toLowerCase().includes(q) ||
    card.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
  )
}

/**
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} dtos
 * @param {string} [todayIso]
 * @param {{ aiSalesOrderIds?: Set<string>, aiCollectionOrderIds?: Set<string>, aiShipmentOrderIds?: Set<string>, aiProcurementOrderIds?: Set<string>, aiActiveByOrderId?: Map<string, { workerId: string, tone: string, workerLabel?: string }> }} [options]
 */
export function buildKanbanBoard(orders, dtos, todayIso = DEMO_TODAY, options = {}) {
  const aiSalesOrderIds = options.aiSalesOrderIds ?? new Set()
  const aiCollectionOrderIds = options.aiCollectionOrderIds ?? new Set()
  const aiShipmentOrderIds = options.aiShipmentOrderIds ?? new Set()
  const aiProcurementOrderIds = options.aiProcurementOrderIds ?? new Set()
  const aiActiveByOrderId = options.aiActiveByOrderId ?? new Map()
  const dtoById = new Map(dtos.map((d) => [d.id, d]))
  /** @type {Record<string, KanbanCard[]>} */
  const grouped = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, []]))

  for (const order of orders) {
    if (order.status === 'İptal') continue
    const dto = dtoById.get(order.id)
    const card = buildKanbanCard(
      order,
      dto,
      todayIso,
      aiSalesOrderIds,
      aiCollectionOrderIds,
      aiShipmentOrderIds,
      aiProcurementOrderIds,
      aiActiveByOrderId.get(order.id),
    )
    if (grouped[card.columnId]) grouped[card.columnId].push(card)
    else grouped.new_order.push(card)
  }

  return { columns: KANBAN_COLUMNS, grouped }
}

/**
 * @param {Record<string, KanbanCard[]>} grouped
 * @param {string} filterId
 * @param {string} searchQuery
 */
export function applyKanbanFilters(grouped, filterId, searchQuery) {
  /** @type {Record<string, KanbanCard[]>} */
  const next = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, []]))
  for (const column of KANBAN_COLUMNS) {
    next[column.id] = (grouped[column.id] ?? []).filter(
      (card) => matchesKanbanFilter(card, filterId) && matchesKanbanSearch(card, searchQuery),
    )
  }
  return next
}
