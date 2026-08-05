import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/profitabilityAnalytics.js').ProfitabilityResponseDto>}
 */
export async function fetchProfitabilityAnalyticsFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  const keys = [
    'from',
    'to',
    'salesPerson',
    'salesSourceType',
    'category',
    'brand',
    'supplierId',
    'productId',
    'customer',
    'paymentStatus',
    'riskLevel',
    'groupBy',
  ]
  for (const k of keys) {
    if (query[k]) params.set(k, query[k])
  }
  const qs = params.toString()
  return client.get(
    qs ? `/v1/reports/profitability-analytics?${qs}` : '/v1/reports/profitability-analytics',
  )
}
