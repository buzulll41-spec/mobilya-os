import { getApiBaseUrl } from '../config/dataSource.js'
import * as mockApi from './mockIncomingGoodsApi.js'
import {
  createIncomingGoodsInApi,
  fetchIncomingGoodsFromApi,
  fetchIncomingGoodsKpisFromApi,
  fetchOrderLineReceivingFromApi,
  fetchPendingOrderLinesFromApi,
} from './realIncomingGoodsApi.js'

/** @returns {string | undefined} */
function apiBase() {
  return getApiBaseUrl()
}

/**
 * @param {{ receivedAt?: string, purpose?: string, supplierId?: string }} [query]
 */
export async function listIncomingGoods(query) {
  const base = apiBase()
  if (base) return fetchIncomingGoodsFromApi(base, query)
  return mockApi.mockListIncomingGoods(query)
}

/**
 * @param {import('../contracts/v1/incomingGoods.js').CreateIncomingGoodsRequest} body
 */
export async function createIncomingGoods(body) {
  const base = apiBase()
  if (base) return createIncomingGoodsInApi(base, body)
  return mockApi.mockCreateIncomingGoods(body)
}

export async function getIncomingGoodsKpis() {
  const base = apiBase()
  if (base) return fetchIncomingGoodsKpisFromApi(base)
  return mockApi.mockGetIncomingGoodsKpis()
}

/**
 * @param {string} [q]
 */
export async function listPendingOrderLines(q) {
  const base = apiBase()
  if (base) return fetchPendingOrderLinesFromApi(base, q)
  return mockApi.mockListPendingOrderLines(q)
}

/**
 * @param {string} orderId
 */
export async function listOrderLineReceiving(orderId) {
  const base = apiBase()
  if (base) return fetchOrderLineReceivingFromApi(base, orderId)
  return mockApi.mockListOrderLineReceiving(orderId)
}
