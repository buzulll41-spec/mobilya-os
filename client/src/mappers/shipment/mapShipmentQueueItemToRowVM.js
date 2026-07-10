import { moneyToNumber } from '../moneyHelpers.js'

/** @typedef {import('../../contracts/v1/shipmentQueueItem.js').ShipmentQueueItemDto} ShipmentQueueItemDto */
/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */

/**
 * @param {ShipmentQueueItemDto} item
 * @param {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto | undefined} orderDto
 * @returns {ShipmentRowVM}
 */
export function mapShipmentQueueItemToRowVM(item, orderDto) {
  const amount = orderDto ? moneyToNumber(orderDto.totalAmount) : 0
  const paidAmount = orderDto ? moneyToNumber(orderDto.amountPaid) : 0
  const dueNum = orderDto ? moneyToNumber(orderDto.amountDue) : 0
  const paid = dueNum <= 0.009

  return {
    id: item.salesOrderId,
    shipmentId: item.shipmentId,
    customer: item.customerDisplayName,
    phone: item.customerPhone ?? undefined,
    product: item.lineSummaryTitle,
    status: /** @type {import('../../data/constants.js').OrderStatus} */ (item.displayStatus),
    amount,
    cost: orderDto?.lineCostAmount ? moneyToNumber(orderDto.lineCostAmount) : undefined,
    orderDate: orderDto?.placedAt?.slice(0, 10) ?? '2026-05-14',
    dueDate: orderDto?.latestCommittedShipBy ?? orderDto?.earliestCommittedShipBy ?? undefined,
    shipmentDate: item.plannedShipDate ?? undefined,
    plannedShipDate: item.plannedShipDate,
    shipmentStatus: item.shipmentStatus,
    queueBucket: item.queueBucket,
    paid,
    paidAmount: paid ? amount : paidAmount,
    notes: orderDto?.notesSnapshot ?? undefined,
    salesPerson: orderDto?.salesPerson,
    orderNumber: orderDto?.orderNumber ?? item.salesOrderId,
    lifecycleStatus: orderDto?.lifecycleStatus,
    riskSeverity: orderDto?.currentRiskSeverity,
    operationalState: orderDto?.operationalState,
    remainingQty: orderDto?.remainingQty
      ? Number.parseFloat(orderDto.remainingQty)
      : 0,
    partiallyShipped: Boolean(orderDto?.partiallyShipped),
    shipmentSummaryOpenCount: orderDto?.shipmentSummaryOpenCount ?? 0,
    inTransitShipmentCount: item.inTransit ? 1 : (orderDto?.inTransitShipmentCount ?? 0),
    hasShipmentIssue: Boolean(item.hasShipmentIssue ?? orderDto?.hasShipmentIssue),
    installationPending: Boolean(item.installationPending ?? orderDto?.installationPending),
    crewName: item.crewName ?? null,
    vehicleNote: undefined,
  }
}

/**
 * @param {unknown} raw
 * @returns {ShipmentQueueItemDto | null}
 */
export function normalizeShipmentQueueItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (raw)
  const shipmentId = typeof r.shipmentId === 'string' ? r.shipmentId : typeof r.id === 'string' ? r.id : ''
  const salesOrderId =
    typeof r.salesOrderId === 'string' ? r.salesOrderId : ''
  if (!shipmentId || !salesOrderId) return null

  const plannedRaw = r.plannedShipDate ?? r.plannedDate ?? null
  const plannedShipDate =
    typeof plannedRaw === 'string' && plannedRaw.length >= 8 ? plannedRaw.slice(0, 10) : null

  const bucket = r.queueBucket
  /** @type {'planned' | 'in_transit' | 'delivered' | undefined} */
  const queueBucket =
    bucket === 'planned' || bucket === 'in_transit' || bucket === 'delivered' ? bucket : undefined

  return {
    shipmentId,
    salesOrderId,
    plannedShipDate,
    shipmentStatus: typeof r.shipmentStatus === 'string' ? r.shipmentStatus : 'PLANNED',
    crewName: typeof r.crewName === 'string' ? r.crewName : null,
    customerDisplayName:
      typeof r.customerDisplayName === 'string' ? r.customerDisplayName : '—',
    lineSummaryTitle: typeof r.lineSummaryTitle === 'string' ? r.lineSummaryTitle : '—',
    displayStatus: typeof r.displayStatus === 'string' ? r.displayStatus : 'Bekleniyor',
    customerPhone: typeof r.customerPhone === 'string' ? r.customerPhone : null,
    installationPending: Boolean(r.installationPending),
    hasShipmentIssue: Boolean(r.hasShipmentIssue),
    inTransit: Boolean(r.inTransit),
    queueBucket,
  }
}

/**
 * @param {unknown[]} rows
 * @returns {ShipmentQueueItemDto[]}
 */
export function sanitizeShipmentQueueItems(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map(normalizeShipmentQueueItem).filter((r) => r != null)
}

/**
 * @param {ShipmentQueueItemDto[]} items
 * @param {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} orders
 * @returns {ShipmentRowVM[]}
 */
export function mapShipmentQueueToRowVMs(items, orders) {
  const byOrder = new Map(orders.map((o) => [o.id, o]))
  return items.map((item) => mapShipmentQueueItemToRowVM(item, byOrder.get(item.salesOrderId)))
}
