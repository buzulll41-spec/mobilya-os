/** Operasyon sevk workflow (Slice 3) — backend ile uyumlu. */
export const SHIPMENT_OPERATION_STATUS = /** @type {const} */ ({
  PLANNED: 'PLANNED',
  LOADED: 'LOADED',
  DISPATCHED: 'DISPATCHED',
  DELIVERED: 'DELIVERED',
  INSTALLATION_DONE: 'INSTALLATION_DONE',
  ISSUE: 'ISSUE',
})

/** @typedef {(typeof SHIPMENT_OPERATION_STATUS)[keyof typeof SHIPMENT_OPERATION_STATUS]} ShipmentOperationStatus */

const ALL = new Set(Object.values(SHIPMENT_OPERATION_STATUS))

/** @param {string} value */
export function normalizeShipmentStatusValue(value) {
  return String(value ?? '').trim().toUpperCase()
}

/** @param {string} value @returns {value is ShipmentOperationStatus} */
export function isShipmentOperationStatus(value) {
  return ALL.has(normalizeShipmentStatusValue(value))
}

export const OPEN_SHIPMENT_PIPELINE = new Set([
  SHIPMENT_OPERATION_STATUS.PLANNED,
  SHIPMENT_OPERATION_STATUS.LOADED,
  'PICKING',
  'READY_TO_DISPATCH',
  'ON_HOLD',
])

export const IN_TRANSIT_SHIPMENT = new Set([SHIPMENT_OPERATION_STATUS.DISPATCHED])

export const SHIPPED_QTY_STATUSES = new Set([
  SHIPMENT_OPERATION_STATUS.DISPATCHED,
  SHIPMENT_OPERATION_STATUS.DELIVERED,
  SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE,
  'CLOSED',
])

/** @type {readonly ShipmentOperationStatus[]} */
export const SHIPMENT_STATUS_FLOW = [
  SHIPMENT_OPERATION_STATUS.PLANNED,
  SHIPMENT_OPERATION_STATUS.LOADED,
  SHIPMENT_OPERATION_STATUS.DISPATCHED,
  SHIPMENT_OPERATION_STATUS.DELIVERED,
  SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE,
]

/** @type {Record<ShipmentOperationStatus, readonly ShipmentOperationStatus[]>} */
const ALLOWED_NEXT = {
  PLANNED: ['LOADED', 'ISSUE'],
  LOADED: ['DISPATCHED', 'ISSUE'],
  DISPATCHED: ['DELIVERED', 'ISSUE'],
  DELIVERED: ['INSTALLATION_DONE', 'ISSUE'],
  INSTALLATION_DONE: [],
  ISSUE: [],
}

/**
 * @param {string} from
 * @param {ShipmentOperationStatus} to
 */
export function canTransitionShipmentStatus(from, to) {
  const fromNorm = normalizeShipmentStatusValue(from)
  if (!isShipmentOperationStatus(fromNorm) || fromNorm === to) return false
  if (to === SHIPMENT_OPERATION_STATUS.ISSUE) {
    return (
      fromNorm !== SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE &&
      fromNorm !== SHIPMENT_OPERATION_STATUS.ISSUE
    )
  }
  return ALLOWED_NEXT[fromNorm]?.includes(to) ?? false
}

/**
 * @param {string} from
 * @returns {ShipmentOperationStatus | null}
 */
export function nextShipmentOperationStatus(from) {
  const fromNorm = normalizeShipmentStatusValue(from)
  if (!isShipmentOperationStatus(fromNorm)) return null
  const idx = SHIPMENT_STATUS_FLOW.indexOf(fromNorm)
  if (idx < 0 || idx >= SHIPMENT_STATUS_FLOW.length - 1) return null
  return SHIPMENT_STATUS_FLOW[idx + 1] ?? null
}

/**
 * @param {ShipmentOperationStatus} status
 * @returns {string | null}
 */
export function shipmentEventTypeForStatus(status) {
  switch (status) {
    case SHIPMENT_OPERATION_STATUS.PLANNED:
      return 'shipment.planned'
    case SHIPMENT_OPERATION_STATUS.LOADED:
      return 'shipment.loaded'
    case SHIPMENT_OPERATION_STATUS.DISPATCHED:
      return 'shipment.dispatched'
    case SHIPMENT_OPERATION_STATUS.DELIVERED:
      return 'shipment.delivered'
    case SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE:
      return 'installation.completed'
    case SHIPMENT_OPERATION_STATUS.ISSUE:
      return 'installation.issue'
    default:
      return null
  }
}
