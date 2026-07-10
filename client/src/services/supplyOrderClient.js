import { getApiBaseUrl } from '../config/dataSource.js'
import { createApiClient } from '../lib/apiClient.js'
import { authRequestHeaders } from '../lib/operationActor.js'
import * as mockApi from './mockApi.js'

/** @typedef {'MAIL' | 'WHATSAPP'} SupplyChannelWire */

/**
 * @param {string} baseUrl
 */
function supplyApiClient(baseUrl) {
  return createApiClient(baseUrl, { headers: authRequestHeaders() })
}

/**
 * @param {string} orderId
 * @param {{ lineIds: string[], channel: SupplyChannelWire }} body
 */
export async function confirmOrderLineSupplySent(orderId, body) {
  const base = getApiBaseUrl()
  if (base) {
    const client = supplyApiClient(base)
    return client.post(`/v1/orders/${encodeURIComponent(orderId)}/supply-order/confirm`, body)
  }
  return mockApi.confirmOrderLineSupplySent(orderId, body)
}

/**
 * @param {string} orderId
 * @param {string} lineId
 */
export async function revertOrderLineWarehouseArrival(orderId, lineId) {
  const base = getApiBaseUrl()
  if (base) {
    const client = supplyApiClient(base)
    return client.post(
      `/v1/orders/${encodeURIComponent(orderId)}/order-lines/${encodeURIComponent(lineId)}/revert-arrival`,
      {},
    )
  }
  return mockApi.revertOrderLineWarehouseArrival(orderId, lineId)
}

/**
 * @param {string} orderId
 * @param {string} lineId
 */
export async function markOrderLineShipmentReady(orderId, lineId) {
  const base = getApiBaseUrl()
  if (base) {
    const client = supplyApiClient(base)
    return client.post(
      `/v1/orders/${encodeURIComponent(orderId)}/order-lines/${encodeURIComponent(lineId)}/mark-shipment-ready`,
      {},
    )
  }
  return mockApi.markOrderLineShipmentReady(orderId, lineId)
}

/**
 * @param {string} orderId
 * @param {string} lineId
 */
export async function revertOrderLineShipmentReady(orderId, lineId) {
  const base = getApiBaseUrl()
  if (base) {
    const client = supplyApiClient(base)
    return client.post(
      `/v1/orders/${encodeURIComponent(orderId)}/order-lines/${encodeURIComponent(lineId)}/revert-shipment-ready`,
      {},
    )
  }
  return mockApi.revertOrderLineShipmentReady(orderId, lineId)
}

/**
 * @param {string} orderId
 * @param {string} lineId
 */
export async function revertOrderLineSupplySent(orderId, lineId) {
  const base = getApiBaseUrl()
  if (base) {
    const client = supplyApiClient(base)
    return client.post(
      `/v1/orders/${encodeURIComponent(orderId)}/order-lines/${encodeURIComponent(lineId)}/revert-supply`,
      {},
    )
  }
  return mockApi.revertOrderLineSupplySent(orderId, lineId)
}

/**
 * @param {string} orderId
 * @param {string} lineId
 */
export async function reconcileOrderLineSupplyState(orderId, lineId) {
  const base = getApiBaseUrl()
  if (base) {
    const client = supplyApiClient(base)
    return client.post(
      `/v1/orders/${encodeURIComponent(orderId)}/order-lines/${encodeURIComponent(lineId)}/reconcile-state`,
      {},
    )
  }
  return mockApi.reconcileOrderLineSupplyState(orderId, lineId)
}
