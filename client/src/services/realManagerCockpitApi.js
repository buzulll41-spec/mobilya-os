import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/managerCockpit.js').ManagerCockpitResponseDto>}
 */
export async function fetchManagerCockpitFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  const keys = [
    'from',
    'to',
    'month',
    'year',
    'salesPerson',
    'riskLevel',
    'paymentStatus',
    'shipmentStatus',
    'salesSourceType',
    'limitedView',
  ]
  for (const k of keys) {
    if (query[k]) params.set(k, query[k])
  }
  const qs = params.toString()
  return client.get(qs ? `/v1/reports/manager-cockpit?${qs}` : '/v1/reports/manager-cockpit')
}
