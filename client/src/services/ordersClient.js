import { getApiBaseUrl } from '../config/dataSource.js'

import * as mockApi from './mockApi.js'

import {
  createOrderInApi,
  fetchDomainEventsForOrderFromApi,
  fetchDomainEventsFromApi,
  fetchOrdersListFromApi,
  patchOrderTerminInApi,
  patchMissingItemStatusInApi,
  markMissingItemReadyForShipmentInApi,
  patchOrderStatusInApi,
  postOrderPaymentInApi,
  approveOrderPaymentInApi,
  rejectOrderPaymentInApi,
  fetchOrderMissingItemsFromApi,
  postOrderMissingItemInApi,
  fetchOrderShipmentsFromApi,
  fetchOrderPaymentsFromApi,
  postOrderShipmentInApi,
  fetchShipmentPlanLinesFromApi,
  fetchOrderLinesFromApi,
  patchShipmentStatusInApi,
  fetchShipmentQueueFromApi,
  postDomainEventInApi,
} from './realOrdersApi.js'
import { mapShipmentQueueToRowVMs } from '../mappers/shipment/mapShipmentQueueItemToRowVM.js'
import { mapListItemToShipmentRowVM } from '../mappers/shipment/mapListItemToShipmentRowVM.js'
import { getPaymentTransactionsForSalesOrder } from './mockPaymentStore.js'

/** @returns {string | undefined} */
function apiBase() {
  return getApiBaseUrl()
}

/**
 * @returns {Promise<import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]>}
 */
export async function getOrders() {
  const base = apiBase()
  if (base) return fetchOrdersListFromApi(base)
  return mockApi.getOrders()
}

/**
 * @param {Omit<import('../data/seedOrders.js').Order, 'id' | 'orderDate'>} draft
 * @returns {Promise<import('../data/seedOrders.js').Order>}
 */
export async function createOrder(draft) {
  return mockApi.createOrder(draft)
}

/**
 * @param {import('../contracts/v1/createOrderRequest.js').CreateOrderRequest} body
 * @returns {Promise<import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto>}
 */
export async function createSalesOrderViaApi(body) {
  const base = apiBase()
  if (!base) throw new Error('VITE_API_BASE_URL is not configured')
  return createOrderInApi(base, body)
}

/**
 * @param {string} orderId
 * @param {{ status: string }} body
 */
export async function patchOrderStatus(orderId, body) {
  const base = apiBase()
  if (base) return patchOrderStatusInApi(base, orderId, body)

  const { evaluateOrderStatusChangePolicies, assertPolicyAllowsProceed } = await import(
    '../policy/evaluateOrderPolicies.js'
  )
  const { remainingBalance } = await import('../utils/orderFinance.js')
  const ordersBefore = await mockApi.getOrders()
  const currentDto = ordersBefore.find((d) => d.id === orderId)
  if (!currentDto) throw new Error('Sipariş bulunamadı')
  const missing = await mockApi.getOrderMissingItems(orderId)
  const { MISSING_ITEM_STATUS } = await import('../contracts/v1/missingItemStatuses.js')
  const openMissingCount = missing.filter((m) => m.status !== MISSING_ITEM_STATUS.RESOLVED).length
  const totalAmount = currentDto.totalAmount ?? currentDto.amount ?? 0
  const remainingAmount = remainingBalance(currentDto)
  const policyEval = evaluateOrderStatusChangePolicies({
    targetStatus: body.status,
    order: {
      totalAmount,
      remainingAmount,
      isFullyPaid: currentDto.isFullyPaid === true || remainingAmount <= 0.009,
    },
    openMissingCount,
    policyOverrides: body.policyOverrides,
  })
  assertPolicyAllowsProceed(policyEval)

  await mockApi.updateOrder(orderId, { status: /** @type {import('../data/constants.js').OrderStatus} */ (body.status) })
  const dtos = await mockApi.getOrders()
  const dto = dtos.find((d) => d.id === orderId)
  if (!dto) throw new Error('Sipariş bulunamadı')
  return dto
}

export const updateOrder = mockApi.updateOrder
export const resetMockOrdersStore = mockApi.resetMockOrdersStore
export const appendDomainEvent = mockApi.appendDomainEvent

/**
 * @param {{ type: string, salesOrderId: string, metadata?: Record<string, unknown> }} body
 * @returns {Promise<import('../contracts/v1/domainEvent.js').DomainEventDto>}
 */
export async function postDomainEvent(body) {
  const base = apiBase()
  if (base) return postDomainEventInApi(base, body)

  const { contractPrintedMetadata, buildOperationActorPayload, dispatchSheetPrintedMetadata, dispatchAdviceGeneratedMetadata, dispatchAutoPlannedMetadata, dispatchRiskDetectedMetadata } =
    await import('../lib/operationActor.js')
  const occurredAt = new Date().toISOString()
  const orderId = body.salesOrderId
  let payload
  if (body.type === 'sales.contract_printed') {
    payload = {
      ...contractPrintedMetadata(
        body.metadata?.source ? { source: String(body.metadata.source) } : {},
      ),
      ...(body.metadata ?? {}),
    }
  } else if (body.type === 'shipment.dispatch_sheet_printed') {
    payload = {
      ...dispatchSheetPrintedMetadata({
        vehicleName: String(body.metadata?.vehicleName ?? ''),
        plannedDate: String(body.metadata?.plannedDate ?? ''),
        orderIds: Array.isArray(body.metadata?.orderIds)
          ? body.metadata.orderIds.map(String)
          : [],
        ...(body.metadata?.source ? { source: String(body.metadata.source) } : {}),
      }),
      ...(body.metadata ?? {}),
    }
  } else if (body.type === 'dispatch.advice.generated') {
    payload = {
      ...dispatchAdviceGeneratedMetadata({
        selectedDate: String(body.metadata?.selectedDate ?? ''),
        healthScore: Number(body.metadata?.healthScore ?? 0),
        savingsCount: Number(body.metadata?.savingsCount ?? 0),
        waitCount: Number(body.metadata?.waitCount ?? 0),
        riskCount: Number(body.metadata?.riskCount ?? 0),
        orderIds: Array.isArray(body.metadata?.orderIds)
          ? body.metadata.orderIds.map(String)
          : [],
      }),
      ...(body.metadata ?? {}),
    }
  } else if (body.type === 'dispatch.auto_planned') {
    payload = {
      ...dispatchAutoPlannedMetadata({
        vehicleName: String(body.metadata?.vehicleName ?? ''),
        plannedDate: String(body.metadata?.plannedDate ?? ''),
        orderIds: Array.isArray(body.metadata?.orderIds)
          ? body.metadata.orderIds.map(String)
          : [],
        region: String(body.metadata?.region ?? ''),
        estimatedSaving: Number(body.metadata?.estimatedSaving ?? 0),
      }),
      ...(body.metadata ?? {}),
    }
  } else if (body.type === 'dispatch.risk_detected') {
    payload = {
      ...dispatchRiskDetectedMetadata({
        riskType: String(body.metadata?.riskType ?? ''),
        title: String(body.metadata?.title ?? ''),
        recommendation: String(body.metadata?.recommendation ?? ''),
        selectedDate: String(body.metadata?.selectedDate ?? ''),
      }),
      ...(body.metadata ?? {}),
    }
  } else {
    payload = buildOperationActorPayload(body.type, body.metadata ?? {})
  }

  /** @type {import('../contracts/v1/domainEvent.js').DomainEventDto} */
  const ev = {
    id: `DOM-${body.type}-${orderId}-${Date.now()}`,
    type: /** @type {import('../contracts/v1/domainEvent.js').DomainEventDto['type']} */ (body.type),
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt,
    correlationId: `corr-${orderId}-${body.type}-${Date.now()}`,
    payloadSchemaVersion: '1',
    payload,
  }
  await mockApi.appendDomainEvent(ev)
  return ev
}

/**
 * Tüm domain event’ler (API: GET /v1/domain-events).
 * @returns {Promise<import('../contracts/v1/domainEvent.js').DomainEventDto[]>}
 */
export async function getDomainEvents() {
  const base = apiBase()
  if (base) return fetchDomainEventsFromApi(base)
  return mockApi.getDomainEvents()
}

/**
 * Tek sipariş domain event’leri (API: GET /v1/orders/:id/domain-events).
 * @param {string} orderId
 * @returns {Promise<import('../contracts/v1/domainEvent.js').DomainEventDto[]>}
 */
export async function getDomainEventsForOrder(orderId) {
  const base = apiBase()
  if (base) return fetchDomainEventsForOrderFromApi(base, orderId)
  const all = await mockApi.getDomainEvents()
  return all.filter((e) => e.aggregateId === orderId)
}

/**
 * @param {string} orderId
 * @param {{ amount: number, method: string, note?: string }} body
 */
export async function postOrderPayment(orderId, body) {
  const base = apiBase()
  if (base) return postOrderPaymentInApi(base, orderId, body)
  return mockApi.postOrderPayment(orderId, body)
}

/**
 * @param {string} orderId
 * @param {string} paymentId
 * @param {{ approvalNote?: string }} [body]
 */
export async function approveOrderPayment(orderId, paymentId, body = {}) {
  const base = apiBase()
  if (base) return approveOrderPaymentInApi(base, orderId, paymentId, body)
  return mockApi.approveOrderPayment(orderId, paymentId, body)
}

/**
 * @param {string} orderId
 * @param {string} paymentId
 * @param {{ rejectionNote?: string }} [body]
 */
export async function rejectOrderPayment(orderId, paymentId, body = {}) {
  const base = apiBase()
  if (base) return rejectOrderPaymentInApi(base, orderId, paymentId, body)
  return mockApi.rejectOrderPayment(orderId, paymentId, body)
}

/**
 * @param {string} orderId
 * @param {{ committedShipBy: string, reason: string }} body
 */
export async function patchOrderTermin(orderId, body) {
  const base = apiBase()
  if (base) return patchOrderTerminInApi(base, orderId, body)
  return mockApi.patchOrderTermin(orderId, body)
}

/**
 * @param {string} orderId
 * @returns {Promise<import('../contracts/v1/missingItem.js').MissingItemDto[]>}
 */
export async function getOrderMissingItems(orderId) {
  const base = apiBase()
  if (base) return fetchOrderMissingItemsFromApi(base, orderId)
  return mockApi.getOrderMissingItems(orderId)
}

/**
 * @param {string} orderId
 * @param {{ title: string, quantity: number, reason: string, lineId?: string, supplierNote?: string }} body
 */
export async function postOrderMissingItem(orderId, body) {
  const base = apiBase()
  if (base) return postOrderMissingItemInApi(base, orderId, body)
  return mockApi.postOrderMissingItem(orderId, body)
}

/**
 * @param {string} missingItemId
 * @param {{ status: string, supplierNote?: string, resolutionNote?: string }} body
 */
export async function patchMissingItemStatus(missingItemId, body) {
  const base = apiBase()
  if (base) return patchMissingItemStatusInApi(base, missingItemId, body)
  return mockApi.patchMissingItemStatus(missingItemId, body)
}

/**
 * @param {string} orderId
 * @param {string} missingItemId
 * @param {{ note?: string }} [body]
 */
export async function markMissingItemReadyForShipment(orderId, missingItemId, body = {}) {
  const base = apiBase()
  if (base) return markMissingItemReadyForShipmentInApi(base, orderId, missingItemId, body)
  return mockApi.markMissingItemReadyForShipment(orderId, missingItemId, body)
}

/**
 * @param {string} orderId
 * @returns {Promise<import('../contracts/v1/shipment.js').ShipmentDto[]>}
 */
export async function getOrderShipments(orderId) {
  const base = apiBase()
  if (base) return fetchOrderShipmentsFromApi(base, orderId)
  return mockApi.getOrderShipments(orderId)
}

/**
 * @param {string} orderId
 * @returns {Promise<import('../contracts/v1/payment.js').PaymentTransactionDto[]>}
 */
export async function getOrderPayments(orderId) {
  const base = apiBase()
  if (base) return fetchOrderPaymentsFromApi(base, orderId)
  return getPaymentTransactionsForSalesOrder(orderId)
}

/**
 * @param {string} orderId
 * @returns {Promise<import('../mappers/shipment/computeShipmentPlanLines.js').ShipmentPlanLineDto[]>}
 */
export async function getShipmentPlanLines(orderId) {
  const base = apiBase()
  if (base) return fetchShipmentPlanLinesFromApi(base, orderId)
  return mockApi.getShipmentPlanLines(orderId)
}

/**
 * @typedef {Object} OrderLineDetailDto
 * @property {string} id
 * @property {string} salesOrderId
 * @property {string} title
 * @property {string | null} productId
 * @property {string | null} productGroup
 * @property {string} qtyOrdered
 * @property {string} qtyReceived
 * @property {string | null} [productTitleSnapshot]
 * @property {string | null} [productGroupSnapshot]
 * @property {number | null} [unitPrice]
 * @property {number | null} [lineTotal]
 * @property {string | null} [supplierId]
 * @property {string | null} [supplierNameSnapshot]
 * @property {Record<string, string> | null} configuration
 * @property {string[] | null} [configurationSummary]
 * @property {number | null} [soldUnitCost]
 * @property {string} [supplyStatus]
 * @property {string | null} [supplyChannel]
 * @property {string | null} [supplySentAt]
 * @property {string | null} [supplySentByUserId]
 * @property {string | null} [supplySentByName]
 * @property {string} [warehouseEntryStatus]
 * @property {boolean} [shipmentReady]
 */

/**
 * @param {string} orderId
 * @returns {Promise<OrderLineDetailDto[]>}
 */
export async function getOrderLines(orderId) {
  const base = apiBase()
  if (base) return fetchOrderLinesFromApi(base, orderId)
  return mockApi.getOrderLines(orderId)
}

/**
 * @param {string} orderId
 * @param {{ plannedDate: string, crewName?: string, vehicleNote?: string, note?: string, lines?: { orderLineId: string, qty: number }[] }} body
 */
export async function postOrderShipment(orderId, body) {
  const base = apiBase()
  if (base) return postOrderShipmentInApi(base, orderId, body)
  return mockApi.postOrderShipment(orderId, body)
}

/**
 * @param {string} shipmentId
 * @param {{ status: string, issueNote?: string }} body
 */
export async function patchShipmentStatus(shipmentId, body) {
  const base = apiBase()
  if (base) return patchShipmentStatusInApi(base, shipmentId, body)
  return mockApi.patchShipmentStatus(shipmentId, body)
}

/**
 * Sevk sayfası — shipment kaynaklı kuyruk (API: GET /v1/shipments).
 * @returns {Promise<import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM[]>}
 */
export async function getShipmentQueue() {
  const base = apiBase()
  const orders = await getOrders()
  if (base) {
    try {
      const items = await fetchShipmentQueueFromApi(base)
      return mapShipmentQueueToRowVMs(items, orders)
    } catch {
      // Sales vb. roller sevk kuyruğu okuyamaz — sipariş projection'dan türet
      return orders.map((dto) => mapListItemToShipmentRowVM(dto))
    }
  }
  return mockApi.getShipmentQueue()
}

/**
 * READ-ONLY görev projection — mock ve API aynı motor.
 * @returns {Promise<import('../contracts/v1/task.js').TaskDto[]>}
 */
export async function getTasks() {
  const { DEMO_TODAY } = await import('../data/constants.js')
  const { projectOperationalTasksFromReadModels } = await import(
    '../mappers/tasks/projectOperationalTasks.js'
  )
  const base = apiBase()
  const dtos = await getOrders()
  const events = base ? await fetchDomainEventsFromApi(base) : await mockApi.getDomainEvents()
  const projected = projectOperationalTasksFromReadModels({
    dtos,
    events,
    todayIso: DEMO_TODAY,
  })
  const { fetchTaskStateMapFromApi } = await import('./taskStateClient.js')
  const { filterActiveOperationalTasks } = await import('../mappers/tasks/applyTaskStateOverlay.js')
  const stateMap = await fetchTaskStateMapFromApi()
  return filterActiveOperationalTasks(projected, stateMap)
}

/** @returns {void} */
export function syncAllOperationalTasks() {
  if (apiBase()) return
  mockApi.syncAllOperationalTasks()
}
