import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchOperationsAdvisorFromApi } from './realOperationsAdvisorApi.js'
import { mockGetOperationsAdvisor } from './mockOperationsAdvisorApi.js'

/**
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/operationsAdvisor.js').OperationsAdvisorResponseDto>}
 */
export async function getOperationsAdvisor(query) {
  const base = getApiBaseUrl()
  if (base) return fetchOperationsAdvisorFromApi(base, query)
  return mockGetOperationsAdvisor(query)
}
