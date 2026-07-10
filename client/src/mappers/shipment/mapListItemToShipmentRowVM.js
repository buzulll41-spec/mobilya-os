import { mapListItemToRowVM } from '../mapListItemToRowVM.js'

/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */

/**
 * Sevk tablosu satırı — OrdersTableFull variant `shipment` ile uyumlu + derived sevk alanları.
 * @param {SalesOrderListItemDto} dto
 * @returns {ShipmentRowVM}
 */
export function mapListItemToShipmentRowVM(dto) {
  const base = mapListItemToRowVM(dto)
  const nextShip =
    dto.shipmentSummaryNextPlannedDate ?? dto.plannedShipmentDate ?? undefined
  const remaining = Number.parseFloat(dto.remainingQty ?? '0')
  const rem = Number.isFinite(remaining) ? remaining : 0

  return {
    ...base,
    shipmentDate: nextShip,
    remainingQty: rem,
    partiallyShipped: Boolean(dto.partiallyShipped),
    qtyOrderedTotal: dto.qtyOrderedTotal,
    qtyShippedTotal: dto.qtyShippedTotal,
    shipmentSummaryOpenCount: dto.shipmentSummaryOpenCount ?? 0,
    inTransitShipmentCount: dto.inTransitShipmentCount ?? 0,
    hasShipmentIssue: Boolean(dto.hasShipmentIssue),
    installationPending: Boolean(dto.installationPending),
    openMissingItemsCount: dto.openMissingItemsCount ?? 0,
  }
}
