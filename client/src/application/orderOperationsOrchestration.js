import { getApiBaseUrl } from '../config/dataSource.js'
import * as ordersClient from '../services/ordersClient.js'
import { listItemDtoToLegacyOrder } from '../mappers/listItemDtoToLegacyOrder.js'
import { fetchDomainEventsAfterOrderMutation } from './orderSnapshotSync.js'

/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../contracts/v1/task.js').TaskDto} TaskDto */
/** @typedef {import('../data/seedOrders.js').Order} Order */

/**
 * @typedef {Object} OrderOperationResult
 * @property {SalesOrderListItemDto} dto
 * @property {SalesOrderListItemDto[]} salesOrderListItemDtos
 * @property {DomainEventDto[]} domainEvents
 * @property {TaskDto[]} operationalTasks
 */

/**
 * @param {string} orderId
 * @returns {Promise<{ dto: SalesOrderListItemDto, salesOrderListItemDtos: SalesOrderListItemDto[] }>}
 */
export async function reloadOrderListFromSource(orderId) {
  const salesOrderListItemDtos = await ordersClient.getOrders()
  const dto = salesOrderListItemDtos.find((d) => d.id === orderId)
  if (!dto) {
    throw new Error('İşlem kaydedildi ancak sipariş listesinde bulunamadı.')
  }
  return { dto, salesOrderListItemDtos }
}

/**
 * PATCH/POST yanıtındaki projection satırı liste ile birleştir (GET gecikse bile tutarlı).
 * @param {SalesOrderListItemDto[]} list
 * @param {string} orderId
 * @param {SalesOrderListItemDto} orderFromMutation
 */
export function mergeOrderListItemFromMutation(list, orderId, orderFromMutation) {
  const has = list.some((d) => d.id === orderId)
  if (!has) return [...list, orderFromMutation]
  return list.map((d) => (d.id === orderId ? orderFromMutation : d))
}

/**
 * @param {string} orderId
 * @param {{ amount: number, method: string, note?: string }} body
 * @returns {Promise<OrderOperationResult>}
 */
export async function executePostPaymentFlow(orderId, body) {
  await ordersClient.postOrderPayment(orderId, body)
  const { dto, salesOrderListItemDtos } = await reloadOrderListFromSource(orderId)
  const { domainEvents, operationalTasks } = await fetchDomainEventsAfterOrderMutation(orderId)
  return { dto, salesOrderListItemDtos, domainEvents, operationalTasks }
}

/**
 * @param {string} orderId
 * @param {{ committedShipBy: string, reason: string }} body
 * @returns {Promise<OrderOperationResult>}
 */
export async function executePatchTerminFlow(orderId, body) {
  await ordersClient.patchOrderTermin(orderId, body)
  const { dto, salesOrderListItemDtos } = await reloadOrderListFromSource(orderId)
  const { domainEvents, operationalTasks } = await fetchDomainEventsAfterOrderMutation(orderId)
  return { dto, salesOrderListItemDtos, domainEvents, operationalTasks }
}

/**
 * @param {string} orderId
 * @param {{ title: string, quantity: number, reason: string, lineId?: string, supplierNote?: string }} body
 * @returns {Promise<OrderOperationResult & { missingItem: import('../contracts/v1/missingItem.js').MissingItemDto }>}
 */
export async function executePostMissingItemFlow(orderId, body) {
  const { missingItem, order } = await ordersClient.postOrderMissingItem(orderId, body)
  const fromList = await ordersClient.getOrders()
  const salesOrderListItemDtos = mergeOrderListItemFromMutation(fromList, orderId, order)
  const dto = salesOrderListItemDtos.find((d) => d.id === orderId) ?? order
  const { domainEvents, operationalTasks } = await fetchDomainEventsAfterOrderMutation(orderId)
  return { dto, missingItem, salesOrderListItemDtos, domainEvents, operationalTasks }
}

/**
 * @param {string} orderId
 * @param {string} missingItemId
 * @param {{ status: string, supplierNote?: string, resolutionNote?: string }} body
 * @returns {Promise<OrderOperationResult & { missingItem: import('../contracts/v1/missingItem.js').MissingItemDto }>}
 */
export async function executePatchMissingItemStatusFlow(orderId, missingItemId, body) {
  const { missingItem, order } = await ordersClient.patchMissingItemStatus(missingItemId, body)
  const fromList = await ordersClient.getOrders()
  const salesOrderListItemDtos = mergeOrderListItemFromMutation(fromList, orderId, order)
  const dto = salesOrderListItemDtos.find((d) => d.id === orderId) ?? order
  const { domainEvents, operationalTasks } = await fetchDomainEventsAfterOrderMutation(orderId)
  return { dto, missingItem, salesOrderListItemDtos, domainEvents, operationalTasks }
}

/**
 * @param {string} orderId
 * @param {string} missingItemId
 * @param {{ note?: string }} [body]
 * @returns {Promise<OrderOperationResult & { missingItem: import('../contracts/v1/missingItem.js').MissingItemDto }>}
 */
export async function executeMarkMissingItemReadyForShipmentFlow(orderId, missingItemId, body = {}) {
  const { missingItem, order } = await ordersClient.markMissingItemReadyForShipment(
    orderId,
    missingItemId,
    body,
  )
  const fromList = await ordersClient.getOrders()
  const salesOrderListItemDtos = mergeOrderListItemFromMutation(fromList, orderId, order)
  const dto = salesOrderListItemDtos.find((d) => d.id === orderId) ?? order
  const { domainEvents, operationalTasks } = await fetchDomainEventsAfterOrderMutation(orderId)
  return { dto, missingItem, salesOrderListItemDtos, domainEvents, operationalTasks }
}

/**
 * @param {string} orderId
 * @param {{ plannedDate: string, crewName?: string, vehicleNote?: string, note?: string }} body
 * @returns {Promise<OrderOperationResult & { shipment: import('../contracts/v1/shipment.js').ShipmentDto }>}
 */
export async function executePostOrderShipmentFlow(orderId, body) {
  const { shipment, order } = await ordersClient.postOrderShipment(orderId, body)
  const [fromList, shipmentQueueRows, eventsBundle] = await Promise.all([
    ordersClient.getOrders(),
    ordersClient.getShipmentQueue(),
    fetchDomainEventsAfterOrderMutation(orderId),
  ])
  const salesOrderListItemDtos = mergeOrderListItemFromMutation(fromList, orderId, order)
  const dto = salesOrderListItemDtos.find((d) => d.id === orderId) ?? order
  return {
    dto,
    shipment,
    salesOrderListItemDtos,
    shipmentQueueRows,
    domainEvents: eventsBundle.domainEvents,
    operationalTasks: eventsBundle.operationalTasks,
  }
}

/**
 * @param {string} orderId
 * @param {string} shipmentId
 * @param {{ status: string, issueNote?: string }} body
 * @returns {Promise<OrderOperationResult & { shipment: import('../contracts/v1/shipment.js').ShipmentDto }>}
 */
export async function executePatchShipmentStatusFlow(orderId, shipmentId, body) {
  const { shipment, order } = await ordersClient.patchShipmentStatus(shipmentId, body)
  const [fromList, shipmentQueueRows, eventsBundle] = await Promise.all([
    ordersClient.getOrders(),
    ordersClient.getShipmentQueue(),
    fetchDomainEventsAfterOrderMutation(orderId),
  ])
  const salesOrderListItemDtos = mergeOrderListItemFromMutation(fromList, orderId, order)
  const dto = salesOrderListItemDtos.find((d) => d.id === orderId) ?? order
  return {
    dto,
    shipment,
    salesOrderListItemDtos,
    shipmentQueueRows,
    domainEvents: eventsBundle.domainEvents,
    operationalTasks: eventsBundle.operationalTasks,
  }
}

/**
 * @typedef {Object} UpdateOrderFlowResult
 * @property {Order} updated
 * @property {SalesOrderListItemDto[]} salesOrderListItemDtos
 * @property {DomainEventDto[]} domainEvents
 * @property {TaskDto[]} operationalTasks
 */

/**
 * @param {string} id
 * @param {Partial<Order>} patch
 * @returns {Promise<UpdateOrderFlowResult>}
 */
export async function executeUpdateOrderFlow(id, patch) {
  if (getApiBaseUrl() && patch.status != null) {
    const dto = await ordersClient.patchOrderStatus(id, { status: patch.status })
    const { salesOrderListItemDtos } = await reloadOrderListFromSource(id)
    const { domainEvents, operationalTasks } = await fetchDomainEventsAfterOrderMutation(id)
    return {
      updated: listItemDtoToLegacyOrder(dto),
      salesOrderListItemDtos,
      domainEvents,
      operationalTasks,
    }
  }

  const updated = await ordersClient.updateOrder(id, patch)
  const salesOrderListItemDtos = await ordersClient.getOrders()
  const { domainEvents, operationalTasks } = await fetchDomainEventsAfterOrderMutation(id)
  return { updated, salesOrderListItemDtos, domainEvents, operationalTasks }
}

/** @returns {boolean} */
export function isApiOperationsMode() {
  return Boolean(getApiBaseUrl())
}
