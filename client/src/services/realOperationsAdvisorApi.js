import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/operationsAdvisor.js').OperationsAdvisorResponseDto>}
 */
export async function fetchOperationsAdvisorFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  for (const k of ['category', 'severity', 'date', 'q', 'salesPerson', 'limitedView']) {
    if (query[k]) params.set(k, query[k])
  }
  const qs = params.toString()
  return client.get(qs ? `/v1/reports/operations-advisor?${qs}` : '/v1/reports/operations-advisor')
}
