import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchManagerCockpitFromApi } from './realManagerCockpitApi.js'
import { mockGetManagerCockpit } from './mockManagerCockpitApi.js'

/**
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/managerCockpit.js').ManagerCockpitResponseDto>}
 */
export async function getManagerCockpit(query) {
  const base = getApiBaseUrl()
  if (base) return fetchManagerCockpitFromApi(base, query)
  return mockGetManagerCockpit(query)
}
