import { getApiBaseUrl } from '../config/dataSource.js'
import { GRAPH_QUERY } from '../contracts/v1/knowledgeGraph.js'
import {
  buildKnowledgeGraphFromMock,
  getCustomerSubgraphLocal,
  getOrderSubgraphLocal,
  queryKnowledgeGraphLocal,
} from './graph/KnowledgeGraphService.js'

/**
 * @param {string} queryName
 * @param {Record<string, string>} [params]
 * @param {object} [runtimeCtx]
 */
export async function fetchGraphQuery(queryName, params = {}, runtimeCtx = null) {
  const base = getApiBaseUrl()
  if (base) {
    const qs = new URLSearchParams({ q: queryName, ...params })
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/graph/query?${qs}`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback local */
    }
  }
  if (!runtimeCtx) throw new Error('Graph runtime context required in mock mode')
  buildKnowledgeGraphFromMock(runtimeCtx)
  return queryKnowledgeGraphLocal(runtimeCtx, queryName, params)
}

/**
 * @param {string} customerId
 * @param {object} runtimeCtx
 */
export async function fetchCustomerGraph(customerId, runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/graph/customer/${encodeURIComponent(customerId)}`)
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  buildKnowledgeGraphFromMock(runtimeCtx)
  return getCustomerSubgraphLocal(runtimeCtx, customerId)
}

/**
 * @param {string} orderId
 * @param {object} runtimeCtx
 */
export async function fetchOrderGraph(orderId, runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/graph/order/${encodeURIComponent(orderId)}`)
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  buildKnowledgeGraphFromMock(runtimeCtx)
  return getOrderSubgraphLocal(runtimeCtx, orderId)
}

export { GRAPH_QUERY }
