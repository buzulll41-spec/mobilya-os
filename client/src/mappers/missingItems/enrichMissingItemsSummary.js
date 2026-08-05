import {
  MISSING_ITEM_STATUS,
  isMissingItemBlockingShipment,
  normalizeMissingItemStatusValue,
} from '../../contracts/v1/missingItemStatuses.js'

/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @param {SalesOrderListItemDto} dto
 * @param {{ status: string }[]} items
 * @returns {SalesOrderListItemDto}
 */
export function enrichSalesOrderListItemWithMissingItemsSummary(dto, items) {
  let openMissingItemsCount = 0
  let resolvedMissingItemsCount = 0
  let missingItemsOpenStatusCount = 0
  for (const item of items) {
    const status = normalizeMissingItemStatusValue(item.status)
    if (status === MISSING_ITEM_STATUS.RESOLVED) {
      resolvedMissingItemsCount += 1
    } else if (isMissingItemBlockingShipment(status)) {
      openMissingItemsCount += 1
    }
    if (status === MISSING_ITEM_STATUS.OPEN) {
      missingItemsOpenStatusCount += 1
    }
  }
  return {
    ...dto,
    missingItemsCount: items.length,
    openMissingItemsCount,
    resolvedMissingItemsCount,
    missingItemsOpenStatusCount,
  }
}
