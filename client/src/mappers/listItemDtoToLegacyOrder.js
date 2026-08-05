import { listRowVmToLegacyOrder } from './listRowVmToLegacyOrder.js'
import { mapListItemToRowVM } from './mapListItemToRowVM.js'

/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../data/seedOrders.js').Order} Order */

/**
 * @param {SalesOrderListItemDto} dto
 * @returns {import('../data/seedOrders.js').Order}
 */
export function listItemDtoToLegacyOrder(dto) {
  return listRowVmToLegacyOrder(mapListItemToRowVM(dto))
}
