import { mapListItemToRowVM } from '../mapListItemToRowVM.js'

/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */

/**
 * Tahsilat tablosu satırı — OrdersTableFull variant `collection` ile uyumlu.
 * @param {SalesOrderListItemDto} dto
 * @returns {CollectionRowVM}
 */
export function mapListItemToCollectionRowVM(dto) {
  const base = mapListItemToRowVM(dto)
  return {
    ...base,
    paymentProgress: typeof dto.paymentProgress === 'number' ? dto.paymentProgress : 0,
    hasOverdueBalance: Boolean(dto.hasOverdueBalance),
    lastPaymentAt: dto.lastPaymentAt ?? null,
    riskSignalOverduePartialShipment: Boolean(dto.riskSignalOverduePartialShipment),
  }
}
