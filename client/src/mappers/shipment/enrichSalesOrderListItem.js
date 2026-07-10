import {
  OPEN_SHIPMENT_PIPELINE,
  SHIPPED_QTY_STATUSES,
  normalizeShipmentStatusValue,
} from '../../contracts/v1/shipmentStatuses.js'
import { deriveShipmentInstallationSummary } from './deriveShipmentInstallationSummary.js'
import { hasOrderLinesInStore } from '../../services/mockOrderLineStore.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/shipment.js').ShipmentDto} ShipmentDto */
/** @typedef {{ id: string; salesOrderId: string; qtyOrdered: string }} OrderLineSeed */

/** @param {string} s */
function parseDec(s) {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {string} n
 */
function formatDec(n) {
  return n.toFixed(2)
}

/**
 * @param {OrderLineSeed[]} lineSeeds
 * @param {Order} order
 */
function effectiveLineSeeds(lineSeeds, order) {
  if (lineSeeds.length) return lineSeeds
  if (hasOrderLinesInStore(order.id)) {
    if (import.meta.env?.DEV) {
      console.warn('[mobilya] persisted order lines missing from seeds', order.id)
    }
    return []
  }
  if (import.meta.env?.DEV) {
    console.warn('[mobilya] effectiveLineSeeds legacy fallback', order.id)
  }
  return [{ id: `OL-${order.id}-1`, salesOrderId: order.id, qtyOrdered: '1.00' }]
}

/**
 * @param {ShipmentDto[]} shipments
 */
function qtyShippedCompleted(shipments) {
  let q = 0
  for (const sh of shipments) {
    if (!SHIPPED_QTY_STATUSES.has(normalizeShipmentStatusValue(sh.status))) continue
    for (const ln of sh.lines) {
      q += parseDec(ln.qty)
    }
  }
  return q
}

/**
 * @param {ShipmentDto[]} shipments
 */
function openPipelineShipments(shipments) {
  return shipments.filter((s) =>
    OPEN_SHIPMENT_PIPELINE.has(normalizeShipmentStatusValue(s.status)),
  )
}

/**
 * @param {ShipmentDto[]} openShipments
 * @param {string | null | undefined} fallbackDate
 */
function nextPlannedShipDate(openShipments, fallbackDate) {
  const dates = openShipments
    .map((s) => s.plannedShipDate)
    .filter((d) => typeof d === 'string' && d.length >= 8)
  if (!dates.length) return fallbackDate ?? null
  return dates.sort()[0]
}

/**
 * @param {SalesOrderListItemDto} dto
 * @param {Order} order
 * @param {ShipmentDto[]} shipments
 * @param {OrderLineSeed[]} lineSeeds
 * @returns {SalesOrderListItemDto}
 */
export function enrichSalesOrderListItemWithShipmentSummary(dto, order, shipments, lineSeeds) {
  const seeds = effectiveLineSeeds(lineSeeds, order)
  let qtyOrdered = 0
  for (const s of seeds) qtyOrdered += parseDec(s.qtyOrdered)

  const shipped = qtyShippedCompleted(shipments)
  const remaining = Math.max(0, qtyOrdered - shipped)
  const partiallyShipped = shipped > 0.0001 && remaining > 0.0001

  const open = openPipelineShipments(shipments)
  const shipmentSummaryOpenCount = open.length
  const fallbackShip = order.shipmentDate ?? dto.plannedShipmentDate ?? null
  const shipmentSummaryNextPlannedDate =
    nextPlannedShipDate(open, fallbackShip) ?? (remaining > 0.0001 ? fallbackShip : null)

  const install = deriveShipmentInstallationSummary(
    shipments.map((s) => ({ status: String(s.status) })),
  )

  return {
    ...dto,
    qtyOrderedTotal: formatDec(qtyOrdered),
    qtyShippedTotal: formatDec(shipped),
    remainingQty: formatDec(remaining),
    partiallyShipped,
    shipmentSummaryOpenCount,
    shipmentSummaryNextPlannedDate,
    hasShipmentIssue: install.hasShipmentIssue,
    installationPending: install.installationPending,
    inTransitShipmentCount: install.inTransitShipmentCount,
  }
}
