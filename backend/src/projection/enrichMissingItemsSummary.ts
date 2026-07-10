import {
  isMissingItemBlockingShipment,
  MISSING_ITEM_STATUS,
  normalizeMissingItemStatusValue,
} from '../constants/missingItemStatuses.js'
import type { SalesOrderListItemDto } from './salesOrderListItemProjection.js'

export type MissingItemCountRow = {
  status: string
}

/** READY_FOR_SHIPMENT ve RESOLVED dışındaki durumlar “açık / sevk kilidi” sayılır. */
export function countOpenMissingItemsFromRows(items: MissingItemCountRow[]): number {
  return items.filter((item) => isMissingItemBlockingShipment(item.status)).length
}

export function enrichSalesOrderListItemWithMissingItemsSummary(
  dto: SalesOrderListItemDto,
  items: MissingItemCountRow[],
): SalesOrderListItemDto {
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
