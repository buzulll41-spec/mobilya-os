import { createApiClient } from '../lib/apiClient.js'
import { authRequestHeaders } from '../lib/operationActor.js'
import { parseLineConfiguration } from '../constants/productConfigurationSchema.js'
import { toCreateOrderWireBody } from './createOrderWireBody.js'
import { mapDomainEventWireRow } from '../mappers/domainEventWire.js'
import { normalizeMissingItemDto } from '../mappers/missingItems/normalizeMissingItemDto.js'
import { normalizeSalesOrderListItemDto } from '../mappers/normalizeSalesOrderListItemDto.js'
import {
  normalizeShipmentDto,
  sanitizeShipmentsList,
} from '../mappers/shipment/normalizeShipmentDto.js'
import { sanitizeShipmentQueueItems } from '../mappers/shipment/mapShipmentQueueItemToRowVM.js'

/** @param {string} baseUrl */
function ordersApiClient(baseUrl) {
  return createApiClient(baseUrl, { headers: authRequestHeaders() })
}

/**
 * Gerçek READ API — `VITE_API_BASE_URL` set iken `ordersClient` bunu kullanır.
 * @param {string} baseUrl Örn. http://localhost:4000 (sondaki / opsiyonel)
 * @returns {Promise<import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]>}
 */
export async function fetchOrdersListFromApi(baseUrl) {
  const client = ordersApiClient(baseUrl)
  const rows = await client.get('/v1/orders')
  if (!Array.isArray(rows)) return []
  return rows.map((row) => normalizeSalesOrderListItemDto(row))
}

/**
 * @param {string} baseUrl
 * @param {import('../contracts/v1/createOrderRequest.js').CreateOrderRequest} body
 * @returns {Promise<import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto>}
 */
export async function createOrderInApi(baseUrl, body) {
  const client = ordersApiClient(baseUrl)
  const wireBody = toCreateOrderWireBody(body)
  const raw = await client.post('/v1/orders', wireBody)
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid create order response')
  }
  const record = /** @type {Record<string, unknown>} */ ({ ...raw })
  delete record.meta
  return normalizeSalesOrderListItemDto(record)
}

/**
 * @param {string} baseUrl
 * @returns {Promise<import('../contracts/v1/domainEvent.js').DomainEventDto[]>}
 */
export async function fetchDomainEventsFromApi(baseUrl) {
  const client = ordersApiClient(baseUrl)
  const rows = await client.get('/v1/domain-events')
  if (!Array.isArray(rows)) return []
  return rows.map((row) => mapDomainEventWireRow(row))
}

/** @alias fetchDomainEventsFromApi */
export const getDomainEvents = fetchDomainEventsFromApi

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @returns {Promise<import('../contracts/v1/domainEvent.js').DomainEventDto[]>}
 */
export async function fetchDomainEventsForOrderFromApi(baseUrl, orderId) {
  const client = ordersApiClient(baseUrl)
  const rows = await client.get(`/v1/orders/${encodeURIComponent(orderId)}/domain-events`)
  if (!Array.isArray(rows)) return []
  return rows.map((row) => mapDomainEventWireRow(row))
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @param {{ amount: number, method: string, note?: string, idempotencyKey?: string }} body
 */
export async function postOrderPaymentInApi(baseUrl, orderId, body) {
  const client = ordersApiClient(baseUrl)
  const raw = await client.post(`/v1/orders/${encodeURIComponent(orderId)}/payments`, body)
  return normalizeSalesOrderListItemDto(raw)
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @param {string} paymentId
 * @param {{ approvalNote?: string }} [body]
 */
export async function approveOrderPaymentInApi(baseUrl, orderId, paymentId, body = {}) {
  const client = ordersApiClient(baseUrl)
  const raw = await client.post(
    `/v1/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}/approve`,
    body,
  )
  return normalizeSalesOrderListItemDto(raw)
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @param {string} paymentId
 * @param {{ rejectionNote?: string }} [body]
 */
export async function rejectOrderPaymentInApi(baseUrl, orderId, paymentId, body = {}) {
  const client = ordersApiClient(baseUrl)
  const raw = await client.post(
    `/v1/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}/reject`,
    body,
  )
  return normalizeSalesOrderListItemDto(raw)
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @param {{ committedShipBy: string, reason: string }} body
 */
export async function patchOrderTerminInApi(baseUrl, orderId, body) {
  const client = ordersApiClient(baseUrl)
  const raw = await client.patch(`/v1/orders/${encodeURIComponent(orderId)}/termin`, body)
  return normalizeSalesOrderListItemDto(raw)
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @returns {Promise<import('../contracts/v1/missingItem.js').MissingItemDto[]>}
 */
export async function fetchOrderMissingItemsFromApi(baseUrl, orderId) {
  const client = ordersApiClient(baseUrl)
  const rows = await client.get(`/v1/orders/${encodeURIComponent(orderId)}/missing-items`)
  if (!Array.isArray(rows)) return []
  return rows.map((row) => normalizeMissingItemDto(row))
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @param {{ title: string, quantity: number, reason: string, lineId?: string, supplierNote?: string }} body
 */
export async function postOrderMissingItemInApi(baseUrl, orderId, body) {
  const client = ordersApiClient(baseUrl)
  const raw = await client.post(`/v1/orders/${encodeURIComponent(orderId)}/missing-items`, body)
  const record = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  const order = record.order != null ? normalizeSalesOrderListItemDto(record.order) : null
  const missingItem =
    record.missingItem != null ? normalizeMissingItemDto(record.missingItem) : null
  if (!order || !missingItem) throw new Error('Invalid missing item response')
  return { missingItem, order }
}

/**
 * @param {string} baseUrl
 * @param {string} missingItemId
 * @param {{ status: string, supplierNote?: string, resolutionNote?: string }} body
 */
/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @param {{ status: string }} body
 */
export async function patchOrderStatusInApi(baseUrl, orderId, body) {
  const client = ordersApiClient(baseUrl)
  const raw = await client.patch(`/v1/orders/${encodeURIComponent(orderId)}/status`, body)
  return normalizeSalesOrderListItemDto(raw)
}

export async function patchMissingItemStatusInApi(baseUrl, missingItemId, body) {
  const client = ordersApiClient(baseUrl)
  const raw = await client.patch(`/v1/missing-items/${encodeURIComponent(missingItemId)}/status`, body)
  const record = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  const order = record.order != null ? normalizeSalesOrderListItemDto(record.order) : null
  const missingItem =
    record.missingItem != null ? normalizeMissingItemDto(record.missingItem) : null
  if (!order || !missingItem) throw new Error('Invalid missing item status response')
  return { missingItem, order }
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @param {string} missingItemId
 * @param {{ note?: string }} [body]
 */
export async function markMissingItemReadyForShipmentInApi(baseUrl, orderId, missingItemId, body = {}) {
  const client = ordersApiClient(baseUrl)
  const raw = await client.post(
    `/v1/orders/${encodeURIComponent(orderId)}/missing-items/${encodeURIComponent(missingItemId)}/ready-for-shipment`,
    body,
  )
  const record = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  const order = record.order != null ? normalizeSalesOrderListItemDto(record.order) : null
  const missingItem =
    record.missingItem != null ? normalizeMissingItemDto(record.missingItem) : null
  if (!order || !missingItem) throw new Error('Invalid ready-for-shipment response')
  return { missingItem, order }
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @returns {Promise<import('../contracts/v1/shipment.js').ShipmentDto[]>}
 */
export async function fetchOrderShipmentsFromApi(baseUrl, orderId) {
  const client = ordersApiClient(baseUrl)
  const rows = await client.get(`/v1/orders/${encodeURIComponent(orderId)}/shipments`)
  return sanitizeShipmentsList(Array.isArray(rows) ? rows : [])
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @returns {Promise<import('../contracts/v1/payment.js').PaymentTransactionDto[]>}
 */
export async function fetchOrderPaymentsFromApi(baseUrl, orderId) {
  const client = ordersApiClient(baseUrl)
  const rows = await client.get(`/v1/orders/${encodeURIComponent(orderId)}/payments`)
  if (!Array.isArray(rows)) return []
  return rows
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null
      const r = /** @type {Record<string, unknown>} */ (raw)
      const id = typeof r.id === 'string' ? r.id : ''
      if (!id) return null
      const amount =
        r.amount && typeof r.amount === 'object'
          ? /** @type {import('../contracts/v1/money.js').Money} */ (r.amount)
          : null
      if (!amount) return null
      return {
        id,
        salesOrderId: typeof r.salesOrderId === 'string' ? r.salesOrderId : orderId,
        invoiceId: typeof r.invoiceId === 'string' ? r.invoiceId : null,
        amount,
        kind: typeof r.kind === 'string' ? r.kind : 'CAPTURE',
        method: typeof r.method === 'string' ? r.method : 'TRANSFER',
        status: typeof r.status === 'string' ? r.status : 'POSTED',
        occurredAt: typeof r.occurredAt === 'string' ? r.occurredAt : new Date().toISOString(),
        idempotencyKey: typeof r.idempotencyKey === 'string' ? r.idempotencyKey : id,
        externalRef: typeof r.externalRef === 'string' ? r.externalRef : null,
        mailOrderSupplierId:
          typeof r.mailOrderSupplierId === 'string' ? r.mailOrderSupplierId : null,
        mailOrderSupplierName:
          typeof r.mailOrderSupplierName === 'string' ? r.mailOrderSupplierName : null,
      }
    })
    .filter((r) => r != null)
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @param {{ plannedDate: string, crewName?: string, vehicleNote?: string, note?: string, lines?: { orderLineId: string, qty: number }[] }} body
 */
export async function postOrderShipmentInApi(baseUrl, orderId, body) {
  const client = ordersApiClient(baseUrl)
  const raw = await client.post(`/v1/orders/${encodeURIComponent(orderId)}/shipments`, body)
  const record = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  const order = record.order != null ? normalizeSalesOrderListItemDto(record.order) : null
  const shipment = record.shipment != null ? normalizeShipmentDto(record.shipment) : null
  if (!order || !shipment) throw new Error('Invalid shipment create response')
  return { shipment, order }
}

/**
 * @param {string} baseUrl
 * @param {string} shipmentId
 * @param {{ status: string, issueNote?: string }} body
 */
/**
 * @param {string} baseUrl
 * @returns {Promise<import('../contracts/v1/shipmentQueueItem.js').ShipmentQueueItemDto[]>}
 */
/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @returns {Promise<import('../mappers/shipment/computeShipmentPlanLines.js').ShipmentPlanLineDto[]>}
 */
export async function fetchShipmentPlanLinesFromApi(baseUrl, orderId) {
  const client = ordersApiClient(baseUrl)
  const rows = await client.get(`/v1/orders/${encodeURIComponent(orderId)}/shipment-plan-lines`)
  if (!Array.isArray(rows)) return []
  return rows
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null
      const r = /** @type {Record<string, unknown>} */ (raw)
      const orderLineId = typeof r.orderLineId === 'string' ? r.orderLineId : ''
      if (!orderLineId) return null
      return {
        orderLineId,
        title: typeof r.title === 'string' ? r.title : '—',
        qtyOrdered: String(r.qtyOrdered ?? '0'),
        qtyReceived: String(r.qtyReceived ?? '0'),
        qtyPendingReceive: String(r.qtyPendingReceive ?? '0'),
        qtyShippable: String(r.qtyShippable ?? '0'),
        qtyShipped: String(r.qtyShipped ?? '0'),
        qtyRemaining: String(r.qtyRemaining ?? '0'),
        selectable: Boolean(r.selectable),
        readinessStatus:
          r.readinessStatus === 'waiting' ||
          r.readinessStatus === 'partial' ||
          r.readinessStatus === 'ready' ||
          r.readinessStatus === 'missing'
            ? r.readinessStatus
            : 'waiting',
        readinessLabel: typeof r.readinessLabel === 'string' ? r.readinessLabel : '',
        readinessTone:
          r.readinessTone === 'ok' ||
          r.readinessTone === 'caution' ||
          r.readinessTone === 'warn' ||
          r.readinessTone === 'danger'
            ? r.readinessTone
            : 'warn',
        readyForShipmentHint:
          typeof r.readyForShipmentHint === 'string' ? r.readyForShipmentHint : '',
        configuration: parseLineConfiguration(r.configuration) ?? null,
        configurationSummary: Array.isArray(r.configurationSummary)
          ? r.configurationSummary.filter((x) => typeof x === 'string')
          : [],
      }
    })
    .filter((r) => r != null)
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 * @returns {Promise<import('./ordersClient.js').OrderLineDetailDto[]>}
 */
export async function fetchOrderLinesFromApi(baseUrl, orderId) {
  const client = ordersApiClient(baseUrl)
  const rows = await client.get(`/v1/orders/${encodeURIComponent(orderId)}/order-lines`)
  if (!Array.isArray(rows)) return []
  return rows.map((raw) => {
    if (!raw || typeof raw !== 'object') return null
    const r = /** @type {Record<string, unknown>} */ (raw)
    const id = typeof r.id === 'string' ? r.id : ''
    if (!id) return null
    const configurationSummary = Array.isArray(r.configurationSummary)
      ? r.configurationSummary.filter((x) => typeof x === 'string')
      : null
    return {
      id,
      salesOrderId: typeof r.salesOrderId === 'string' ? r.salesOrderId : orderId,
      title: typeof r.title === 'string' ? r.title : '—',
      productTitleSnapshot:
        typeof r.productTitleSnapshot === 'string' ? r.productTitleSnapshot : null,
      productId: typeof r.productId === 'string' ? r.productId : null,
      productGroup: typeof r.productGroup === 'string' ? r.productGroup : null,
      productGroupSnapshot:
        typeof r.productGroupSnapshot === 'string' ? r.productGroupSnapshot : null,
      unitPrice: typeof r.unitPrice === 'number' ? r.unitPrice : null,
      lineTotal: typeof r.lineTotal === 'number' ? r.lineTotal : null,
      qtyOrdered: String(r.qtyOrdered ?? '0'),
      qtyReceived: String(r.qtyReceived ?? '0'),
      supplierId: typeof r.supplierId === 'string' ? r.supplierId : null,
      supplierNameSnapshot:
        typeof r.supplierNameSnapshot === 'string' ? r.supplierNameSnapshot : null,
      configuration: parseLineConfiguration(r.configuration) ?? null,
      configurationSummary,
      soldUnitCost: typeof r.soldUnitCost === 'number' ? r.soldUnitCost : null,
      supplyStatus: typeof r.supplyStatus === 'string' ? r.supplyStatus : 'NOT_SENT',
      supplyChannel: typeof r.supplyChannel === 'string' ? r.supplyChannel : null,
      supplySentAt: typeof r.supplySentAt === 'string' ? r.supplySentAt : null,
      supplySentByUserId: typeof r.supplySentByUserId === 'string' ? r.supplySentByUserId : null,
      supplySentByName: typeof r.supplySentByName === 'string' ? r.supplySentByName : null,
      warehouseEntryStatus:
        typeof r.warehouseEntryStatus === 'string' ? r.warehouseEntryStatus : 'NOT_SENT',
      shipmentReady: Boolean(r.shipmentReady),
    }
  }).filter((r) => r != null)
}

export async function fetchShipmentQueueFromApi(baseUrl) {
  const client = ordersApiClient(baseUrl)
  const rows = await client.get('/v1/shipments')
  return sanitizeShipmentQueueItems(Array.isArray(rows) ? rows : [])
}

export async function patchShipmentStatusInApi(baseUrl, shipmentId, body) {
  const client = ordersApiClient(baseUrl)
  const raw = await client.patch(`/v1/shipments/${encodeURIComponent(shipmentId)}/status`, body)
  const record = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  const order = record.order != null ? normalizeSalesOrderListItemDto(record.order) : null
  const shipment = record.shipment != null ? normalizeShipmentDto(record.shipment) : null
  if (!order || !shipment) throw new Error('Invalid shipment status response')
  return { shipment, order }
}

/**
 * @param {string} baseUrl
 * @param {{ type: string, salesOrderId: string, metadata?: Record<string, unknown> }} body
 * @returns {Promise<import('../contracts/v1/domainEvent.js').DomainEventDto>}
 */
export async function postDomainEventInApi(baseUrl, body) {
  const client = ordersApiClient(baseUrl)
  const raw = await client.post('/v1/domain-events', body)
  return mapDomainEventWireRow(raw)
}

