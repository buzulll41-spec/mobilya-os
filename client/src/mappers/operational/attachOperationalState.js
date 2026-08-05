import { computeOperationalState } from './computeOperationalState.js'

/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../data/seedOrders.js').Order} Order */

/**
 * @param {SalesOrderListItemDto} dto
 * @param {Order} order
 * @param {string} todayIso
 * @returns {SalesOrderListItemDto}
 */
export function attachOperationalState(dto, order, todayIso) {
  return {
    ...dto,
    operationalState: computeOperationalState(dto, order, todayIso),
  }
}
