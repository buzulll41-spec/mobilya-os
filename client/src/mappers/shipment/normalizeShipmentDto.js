import { normalizeShipmentStatusValue } from '../../contracts/v1/shipmentStatuses.js'

/** @typedef {import('../../contracts/v1/shipment.js').ShipmentDto} ShipmentDto */
/** @typedef {import('../../contracts/v1/shipment.js').ShipmentLineDto} ShipmentLineDto */

/**
 * @param {unknown} raw
 * @returns {ShipmentLineDto | null}
 */
function normalizeLine(raw) {
  if (!raw || typeof raw !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (raw)
  const id = typeof r.id === 'string' ? r.id : ''
  const shipmentId = typeof r.shipmentId === 'string' ? r.shipmentId : ''
  const orderLineId = typeof r.orderLineId === 'string' ? r.orderLineId : ''
  const qty = typeof r.qty === 'string' ? r.qty : '0.00'
  if (!id || !shipmentId) return null
  return { id, shipmentId, orderLineId, qty }
}

/**
 * @param {unknown} raw
 * @returns {ShipmentDto | null}
 */
export function normalizeShipmentDto(raw) {
  if (!raw || typeof raw !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (raw)
  const id = typeof r.id === 'string' ? r.id : ''
  const salesOrderId =
    typeof r.salesOrderId === 'string'
      ? r.salesOrderId
      : typeof r.orderId === 'string'
        ? r.orderId
        : ''
  if (!id || !salesOrderId) return null

  const plannedRaw =
    r.plannedShipDate ?? r.plannedDate ?? r.plannedShipmentDate ?? null
  const plannedShipDate =
    typeof plannedRaw === 'string' && plannedRaw.length >= 8 ? plannedRaw.slice(0, 10) : null

  const linesRaw = Array.isArray(r.lines) ? r.lines : []
  const lines = linesRaw.map(normalizeLine).filter((l) => l != null)

  return {
    id,
    salesOrderId,
    shipmentNumber:
      typeof r.shipmentNumber === 'string' ? r.shipmentNumber : id,
    status: normalizeShipmentStatusValue(String(r.status ?? 'PLANNED')),
    originLocationId:
      typeof r.originLocationId === 'string' ? r.originLocationId : 'WH-1',
    plannedShipDate,
    actualShipDate:
      typeof r.actualShipDate === 'string' ? r.actualShipDate.slice(0, 10) : null,
    version: typeof r.version === 'number' ? r.version : 1,
    crewName: typeof r.crewName === 'string' ? r.crewName : null,
    vehicleNote: typeof r.vehicleNote === 'string' ? r.vehicleNote : null,
    note: typeof r.note === 'string' ? r.note : null,
    lines,
  }
}

/**
 * @param {unknown[]} rows
 * @returns {ShipmentDto[]}
 */
export function sanitizeShipmentsList(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map(normalizeShipmentDto).filter((s) => s != null)
}

/**
 * @param {unknown} result
 * @returns {ShipmentDto | null}
 */
export function pickShipmentFromMutationResult(result) {
  if (!result || typeof result !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (result)
  if (r.shipment != null) return normalizeShipmentDto(r.shipment)
  return normalizeShipmentDto(result)
}
