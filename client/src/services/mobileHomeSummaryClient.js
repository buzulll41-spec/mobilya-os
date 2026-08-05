import { getApiBaseUrl } from '../config/dataSource.js'
import { ApiClientError, createApiClient } from '../lib/apiClient.js'
import { authRequestHeaders } from '../lib/operationActor.js'

export const MOBILE_HOME_SUMMARY_ENDPOINTS = /** @type {const} */ ({
  collection: '/collections/summary',
  shipment: '/shipments/today',
  service: '/service/open',
  orders: '/orders/summary',
  customers: '/customers/summary',
  reports: '/reports/summary',
})

/** @typedef {'collection' | 'shipment' | 'service' | 'orders' | 'customers' | 'reports'} MobileHomeSummaryModuleId */

/**
 * @typedef {{
 *   moduleId: MobileHomeSummaryModuleId
 *   endpoint: string
 *   status: 'ok' | 'missing' | 'error' | 'unconfigured'
 *   httpStatus?: number
 *   durationMs: number
 *   data?: unknown
 *   message?: string
 * }} MobileHomeSummaryResult
 */

/** @param {unknown} value */
function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** @param {unknown} value */
function asNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {Record<string, unknown>} record
 * @param {string[]} keys
 */
function numberFromKeys(record, keys) {
  for (const key of keys) {
    const n = asNumber(record[key])
    if (n != null) return n
  }
  return null
}

/**
 * @param {unknown} payload
 * @returns {Record<string, unknown>}
 */
function toRecord(payload) {
  if (!isObject(payload)) return {}
  return /** @type {Record<string, unknown>} */ (payload)
}

/**
 * @param {MobileHomeSummaryModuleId} moduleId
 * @param {unknown} payload
 */
export function parseSummaryMetrics(moduleId, payload) {
  const record = toRecord(payload)

  if (moduleId === 'collection') {
    return {
      amount: numberFromKeys(record, ['pendingAmount', 'pendingCollection', 'totalPending', 'amount', 'value']),
      count: numberFromKeys(record, ['pendingCount', 'openCount', 'count', 'total']),
    }
  }

  if (moduleId === 'shipment') {
    return {
      count: numberFromKeys(record, ['todayCount', 'count', 'plannedCount', 'openCount', 'total']),
    }
  }

  if (moduleId === 'service') {
    return {
      count: numberFromKeys(record, ['openCount', 'count', 'activeCount', 'total']),
    }
  }

  if (moduleId === 'orders') {
    return {
      count: numberFromKeys(record, ['orderCount', 'count', 'totalOrders', 'total']),
    }
  }

  if (moduleId === 'customers') {
    return {
      count: numberFromKeys(record, ['customerCount', 'count', 'activeCount', 'total']),
    }
  }

  return {
    count: numberFromKeys(record, ['reportCount', 'count', 'total']),
    amount: numberFromKeys(record, ['dailySales', 'revenue', 'amount', 'value']),
  }
}

/** @returns {Promise<MobileHomeSummaryResult[]>} */
export async function fetchMobileHomeSummaries() {
  const apiBase = getApiBaseUrl()

  /** @type {[MobileHomeSummaryModuleId, string][]} */
  const entries = [
    ['collection', MOBILE_HOME_SUMMARY_ENDPOINTS.collection],
    ['shipment', MOBILE_HOME_SUMMARY_ENDPOINTS.shipment],
    ['service', MOBILE_HOME_SUMMARY_ENDPOINTS.service],
    ['orders', MOBILE_HOME_SUMMARY_ENDPOINTS.orders],
    ['customers', MOBILE_HOME_SUMMARY_ENDPOINTS.customers],
    ['reports', MOBILE_HOME_SUMMARY_ENDPOINTS.reports],
  ]

  if (!apiBase) {
    return entries.map(([moduleId, endpoint]) => ({
      moduleId,
      endpoint,
      status: 'unconfigured',
      durationMs: 0,
      message: 'API base URL bulunamadı',
    }))
  }

  const client = createApiClient(apiBase, { headers: authRequestHeaders() })

  return Promise.all(
    entries.map(async ([moduleId, endpoint]) => {
      const startedAt = Date.now()
      try {
        const data = await client.get(endpoint, { timeoutMs: 4500 })
        return {
          moduleId,
          endpoint,
          status: 'ok',
          durationMs: Date.now() - startedAt,
          data,
        }
      } catch (error) {
        const durationMs = Date.now() - startedAt
        if (error instanceof ApiClientError && error.kind === 'http' && error.status === 404) {
          return {
            moduleId,
            endpoint,
            status: 'missing',
            httpStatus: error.status,
            durationMs,
            message: 'API eksik',
          }
        }
        return {
          moduleId,
          endpoint,
          status: 'error',
          httpStatus: error instanceof ApiClientError ? error.status : undefined,
          durationMs,
          message: error instanceof Error ? error.message : 'Bilinmeyen hata',
        }
      }
    }),
  )
}
