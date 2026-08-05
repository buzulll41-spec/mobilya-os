import { createAuthedApiClient } from '../lib/operationActor.js'
import {
  normalizeIncomingGoodsKpisDto,
  normalizeIncomingGoodsRecordDto,
  normalizeOrderLineReceivingResponse,
  normalizePendingOrderLineDto,
} from '../mappers/supply/normalizeIncomingGoodsDto.js'

/**
 * @param {string} baseUrl
 * @param {{ receivedAt?: string, purpose?: string, supplierId?: string }} [query]
 */
export async function fetchIncomingGoodsFromApi(baseUrl, query = {}) {
  const client = createAuthedApiClient(baseUrl)
  const params = new URLSearchParams()
  if (query.receivedAt) params.set('receivedAt', query.receivedAt)
  if (query.purpose) params.set('purpose', query.purpose)
  if (query.supplierId) params.set('supplierId', query.supplierId)
  const qs = params.toString()
  const path = qs ? `/v1/incoming-goods?${qs}` : '/v1/incoming-goods'
  const rows = await client.get(path)
  if (!Array.isArray(rows)) return []
  return rows.map((row) => normalizeIncomingGoodsRecordDto(row))
}

/**
 * @param {string} baseUrl
 * @param {import('../contracts/v1/incomingGoods.js').CreateIncomingGoodsRequest} body
 */
export async function createIncomingGoodsInApi(baseUrl, body) {
  const client = createAuthedApiClient(baseUrl)
  const raw = await client.post('/v1/incoming-goods', body)
  return normalizeIncomingGoodsRecordDto(raw)
}

/**
 * @param {string} baseUrl
 */
export async function fetchIncomingGoodsKpisFromApi(baseUrl) {
  const client = createAuthedApiClient(baseUrl)
  const raw = await client.get('/v1/incoming-goods/kpis')
  return normalizeIncomingGoodsKpisDto(raw)
}

/**
 * @param {string} baseUrl
 * @param {string} [q]
 */
export async function fetchPendingOrderLinesFromApi(baseUrl, q) {
  const client = createAuthedApiClient(baseUrl)
  const params = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  const rows = await client.get(`/v1/incoming-goods/pending-order-lines${params}`)
  if (!Array.isArray(rows)) return []
  return rows.map((row) => normalizePendingOrderLineDto(row))
}

/**
 * @param {string} baseUrl
 * @param {string} orderId
 */
export async function fetchOrderLineReceivingFromApi(baseUrl, orderId) {
  const client = createAuthedApiClient(baseUrl)
  const raw = await client.get(`/v1/orders/${encodeURIComponent(orderId)}/order-line-receiving`)
  return normalizeOrderLineReceivingResponse(raw)
}
