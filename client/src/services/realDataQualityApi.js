import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {{
 *   from?: string
 *   to?: string
 *   salesPerson?: string
 *   status?: string
 *   issueCode?: string
 *   q?: string
 * }} [query]
 * @returns {Promise<import('../contracts/v1/dataQuality.js').DataQualityResponseDto>}
 */
export async function fetchDataQualityFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  if (query.salesPerson) params.set('salesPerson', query.salesPerson)
  if (query.status) params.set('status', query.status)
  if (query.issueCode) params.set('issueCode', query.issueCode)
  if (query.q) params.set('q', query.q)
  const qs = params.toString()
  return client.get(qs ? `/v1/reports/data-quality?${qs}` : '/v1/reports/data-quality')
}
