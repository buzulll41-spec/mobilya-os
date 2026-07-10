import { WAREHOUSE_ENTRY_STATUS } from '../constants/supplyOrderStatus.js'
import { isMissingItemResolvedStatus } from '../constants/missingItemStatuses.js'

export type AutoShipmentReadyLineInput = {
  warehouseEntryStatus: string
}

export type AutoShipmentReadyContext = {
  openMissingItemsCount?: number
}

type MissingStatusRow = { status: string }

/**
 * Acik SSH / eksik parca kaydi sayisi.
 */
export function countOpenMissingItems(items: Array<MissingStatusRow>): number {
  return items.filter((item) => !isMissingItemResolvedStatus(item.status)).length
}

/**
 * Otomatik sevke hazir engeli var mi (eksik parca, kismi depo vb.).
 */
export function hasAutoShipmentReadyBlockers(
  lines: Array<AutoShipmentReadyLineInput>,
  context?: AutoShipmentReadyContext,
): boolean {
  if ((context?.openMissingItemsCount ?? 0) > 0) return true
  if (lines.some((line) => line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED)) {
    return true
  }
  return false
}

/**
 * Tum satirlar depoda + engel yok -> otomatik Sevke Hazir.
 */
export function orderQualifiesForAutoShipmentReady(
  lines: Array<AutoShipmentReadyLineInput>,
  context?: AutoShipmentReadyContext,
): boolean {
  if (!lines.length) return false
  if (!lines.every((line) => line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED)) {
    return false
  }
  return !hasAutoShipmentReadyBlockers(lines, context)
}
