import { deriveOrderDisplayStatusFromLines } from '../lib/deriveOrderDisplayStatus.js'
import { countOpenMissingItems } from '../lib/autoShipmentReady.js'
import { getOrderLinesForSalesOrder } from './mockOrderLineStore.js'
import { getMissingItemsForOrder } from './mockMissingItemStore.js'

/**
 * Mock sipariş status alanını satır depo/sevke hazır durumundan günceller.
 * @param {import('../data/seedOrders.js').Order} order
 * @returns {string}
 */
export function deriveMockOrderStatusFromLines(order) {
  const lines = getOrderLinesForSalesOrder(order.id)
  const missingItems = getMissingItemsForOrder(order.id)
  return deriveOrderDisplayStatusFromLines(
    lines.map((line) => ({
      warehouseEntryStatus: line.warehouseEntryStatus ?? 'NOT_SENT',
      shipmentReady: line.shipmentReady ?? false,
    })),
    order.status,
    { openMissingItemsCount: countOpenMissingItems(missingItems) },
  )
}

/**
 * @param {import('../data/seedOrders.js').Order} order
 * @returns {import('../data/seedOrders.js').Order}
 */
export function applyDerivedStatusToMockOrder(order) {
  const nextStatus = deriveMockOrderStatusFromLines(order)
  if (nextStatus === order.status) return order
  return { ...order, status: nextStatus, displayStatus: nextStatus }
}
