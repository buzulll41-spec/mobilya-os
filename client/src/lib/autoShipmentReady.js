import { WAREHOUSE_ENTRY_STATUS } from '../constants/supplyOrderStatus.js'
import { isMissingItemBlockingShipment } from '../contracts/v1/missingItemStatuses.js'

/**
 * @typedef {Object} AutoShipmentReadyLineInput
 * @property {string} warehouseEntryStatus
 */

/**
 * @typedef {Object} AutoShipmentReadyContext
 * @property {number} [openMissingItemsCount]
 */

/**
 * @param {{ status: string }[]} items
 */
export function countOpenMissingItems(items) {
  return items.filter((item) => isMissingItemBlockingShipment(item.status)).length
}

/**
 * @param {AutoShipmentReadyLineInput[]} lines
 * @param {AutoShipmentReadyContext} [context]
 */
export function hasAutoShipmentReadyBlockers(lines, context) {
  if ((context?.openMissingItemsCount ?? 0) > 0) return true
  if (lines.some((line) => line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED)) {
    return true
  }
  return false
}

/**
 * @param {AutoShipmentReadyLineInput[]} lines
 * @param {AutoShipmentReadyContext} [context]
 */
export function orderQualifiesForAutoShipmentReady(lines, context) {
  if (!lines.length) return false
  if (!lines.every((line) => line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED)) {
    return false
  }
  return !hasAutoShipmentReadyBlockers(lines, context)
}
