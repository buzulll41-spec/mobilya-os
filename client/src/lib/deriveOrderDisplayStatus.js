import { WAREHOUSE_ENTRY_STATUS } from '../constants/supplyOrderStatus.js'
import { orderQualifiesForAutoShipmentReady } from './autoShipmentReady.js'

export const ORDER_FULFILLMENT_DISPLAY_STATUS = /** @type {const} */ ({
  WAITING: 'Bekleniyor',
  PARTIAL_ARRIVED: 'Kısmi Geldi',
  ARRIVED: 'Geldi',
  SHIPMENT_READY: 'Sevke Hazır',
  DELIVERED: 'Teslim Edildi',
})

/**
 * @typedef {Object} OrderLineDisplayStatusInput
 * @property {string} warehouseEntryStatus
 * @property {boolean} shipmentReady
 */

/**
 * @param {OrderLineDisplayStatusInput} line
 */
export function isLineWarehouseArrived(line) {
  return line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED
}

function isLineWarehouseInProgress(line) {
  return (
    line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED ||
    line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED
  )
}

/**
 * @typedef {import('./autoShipmentReady.js').AutoShipmentReadyContext} AutoShipmentReadyContext
 */

/**
 * @param {OrderLineDisplayStatusInput[]} lines
 * @param {string | null | undefined} [storedDisplayStatus]
 * @param {AutoShipmentReadyContext} [autoReadyContext]
 */
export function deriveOrderDisplayStatusFromLines(lines, storedDisplayStatus, autoReadyContext) {
  if (storedDisplayStatus === ORDER_FULFILLMENT_DISPLAY_STATUS.DELIVERED) {
    return ORDER_FULFILLMENT_DISPLAY_STATUS.DELIVERED
  }

  if (!lines.length) {
    return storedDisplayStatus ?? ORDER_FULFILLMENT_DISPLAY_STATUS.WAITING
  }

  const arrivedCount = lines.filter(isLineWarehouseArrived).length
  const inProgressCount = lines.filter(isLineWarehouseInProgress).length
  const total = lines.length

  if (inProgressCount === 0) {
    return ORDER_FULFILLMENT_DISPLAY_STATUS.WAITING
  }

  if (arrivedCount < total) {
    return ORDER_FULFILLMENT_DISPLAY_STATUS.PARTIAL_ARRIVED
  }

  if (orderQualifiesForAutoShipmentReady(lines, autoReadyContext)) {
    return ORDER_FULFILLMENT_DISPLAY_STATUS.SHIPMENT_READY
  }

  return ORDER_FULFILLMENT_DISPLAY_STATUS.ARRIVED
}

/**
 * @param {string} status
 */
export function fulfillmentProgressFromDerivedDisplayStatus(status) {
  switch (status) {
    case ORDER_FULFILLMENT_DISPLAY_STATUS.DELIVERED:
      return 1
    case ORDER_FULFILLMENT_DISPLAY_STATUS.SHIPMENT_READY:
      return 0.85
    case ORDER_FULFILLMENT_DISPLAY_STATUS.ARRIVED:
      return 0.7
    case ORDER_FULFILLMENT_DISPLAY_STATUS.PARTIAL_ARRIVED:
      return 0.5
    case ORDER_FULFILLMENT_DISPLAY_STATUS.WAITING:
      return 0.15
    default:
      return 0.2
  }
}

/**
 * @param {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} dto
 * @param {OrderLineDisplayStatusInput[]} lines
 * @param {string | null | undefined} [storedDisplayStatus]
 * @param {AutoShipmentReadyContext} [autoReadyContext]
 */
export function enrichSalesOrderListItemWithDerivedDisplayStatus(
  dto,
  lines,
  storedDisplayStatus,
  autoReadyContext,
) {
  const displayStatus = deriveOrderDisplayStatusFromLines(
    lines,
    storedDisplayStatus ?? dto.displayStatus,
    autoReadyContext,
  )
  return {
    ...dto,
    displayStatus,
    fulfillmentProgress: fulfillmentProgressFromDerivedDisplayStatus(displayStatus),
  }
}
