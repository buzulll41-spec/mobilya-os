import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {{
 *   from?: string
 *   to?: string
 *   salesPerson?: string
 *   salesSourceType?: string
 *   displayFloor?: string
 *   externalSupplyType?: string
 *   category?: string
 *   supplierId?: string
 * }} [query]
 * @returns {Promise<import('../contracts/v1/salesSourceAnalytics.js').SalesSourceAnalyticsResponseDto>}
 */
export async function fetchSalesSourceAnalyticsFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  if (query.salesPerson) params.set('salesPerson', query.salesPerson)
  if (query.salesSourceType) params.set('salesSourceType', query.salesSourceType)
  if (query.displayFloor) params.set('displayFloor', query.displayFloor)
  if (query.externalSupplyType) params.set('externalSupplyType', query.externalSupplyType)
  if (query.category) params.set('category', query.category)
  if (query.supplierId) params.set('supplierId', query.supplierId)
  const qs = params.toString()
  return client.get(
    qs ? `/v1/reports/sales-source-analytics?${qs}` : '/v1/reports/sales-source-analytics',
  )
}
