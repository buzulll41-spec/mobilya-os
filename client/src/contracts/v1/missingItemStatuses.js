/** @typedef {'OPEN' | 'ORDERED' | 'ARRIVED' | 'READY_FOR_SHIPMENT' | 'RESOLVED'} MissingItemStatus */

export const MISSING_ITEM_STATUS = /** @type {const} */ ({
  OPEN: 'OPEN',
  ORDERED: 'ORDERED',
  ARRIVED: 'ARRIVED',
  READY_FOR_SHIPMENT: 'READY_FOR_SHIPMENT',
  RESOLVED: 'RESOLVED',
})

/** @type {readonly MissingItemStatus[]} */
export const MISSING_ITEM_STATUS_FLOW = [
  MISSING_ITEM_STATUS.OPEN,
  MISSING_ITEM_STATUS.ORDERED,
  MISSING_ITEM_STATUS.ARRIVED,
  MISSING_ITEM_STATUS.READY_FOR_SHIPMENT,
  MISSING_ITEM_STATUS.RESOLVED,
]

/**
 * @param {string} value
 * @returns {value is MissingItemStatus}
 */
export function isMissingItemStatus(value) {
  return Object.values(MISSING_ITEM_STATUS).includes(
    /** @type {MissingItemStatus} */ (normalizeMissingItemStatusValue(value)),
  )
}

/** @param {string} value */
export function normalizeMissingItemStatusValue(value) {
  return String(value ?? '').trim().toUpperCase()
}

/** @param {string} status */
export function isMissingItemResolvedStatus(status) {
  return normalizeMissingItemStatusValue(status) === MISSING_ITEM_STATUS.RESOLVED
}

/** Sevk kilidi ve açık SSH sayımı — READY_FOR_SHIPMENT sevke uygun, kilitlemez. */
export function isMissingItemBlockingShipment(status) {
  const norm = normalizeMissingItemStatusValue(status)
  return (
    norm !== MISSING_ITEM_STATUS.RESOLVED && norm !== MISSING_ITEM_STATUS.READY_FOR_SHIPMENT
  )
}

/**
 * @param {MissingItemStatus} from
 * @param {MissingItemStatus} to
 */
export function canTransitionMissingItemStatus(from, to) {
  if (from === to) return false
  const idx = MISSING_ITEM_STATUS_FLOW.indexOf(from)
  const toIdx = MISSING_ITEM_STATUS_FLOW.indexOf(to)
  return idx >= 0 && toIdx > idx
}
