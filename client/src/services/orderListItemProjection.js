import { DEMO_TODAY } from '../data/constants.js'
import { projectSalesOrderListItemDtoFromReadModels } from '../application/projectSalesOrderListItemDto.js'
import {
  getLineSeedsForSalesOrder,
  getShipmentsForSalesOrder,
} from './mockShipmentStore.js'
import { getPaymentTransactionsForSalesOrder } from './mockPaymentStore.js'
import { getMissingItemsForOrder } from './mockMissingItemStore.js'
import { getOrderLinesForSalesOrder } from './mockOrderLineStore.js'
import { getShipmentPlan } from '../state/shipmentPlanStore.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * IO: mock store’lardan read model okur; saf projection `application/projectSalesOrderListItemDto`.
 * @param {Order} order
 * @param {string} [todayIso]
 * @returns {SalesOrderListItemDto}
 */
export function projectLegacyOrderToListItemDto(order, todayIso = DEMO_TODAY) {
  const lineRows = getOrderLinesForSalesOrder(order.id)
  const plan = getShipmentPlan(order.id)
  return projectSalesOrderListItemDtoFromReadModels(order, todayIso, {
    shipments: getShipmentsForSalesOrder(order.id),
    lineSeeds: getLineSeedsForSalesOrder(order.id),
    lineDisplayInputs: lineRows.map((line) => ({
      warehouseEntryStatus: line.warehouseEntryStatus ?? 'NOT_SENT',
      shipmentReady: line.shipmentReady ?? false,
    })),
    paymentTransactions: getPaymentTransactionsForSalesOrder(order.id),
    missingItems: getMissingItemsForOrder(order.id),
    shipmentPlan: plan ? { status: plan.status ?? 'PLANNED' } : null,
  })
}
