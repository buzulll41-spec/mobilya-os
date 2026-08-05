import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchChairmanFromApi } from './realChairmanApi.js'
import { mockGetChairmanIntelligence } from './mockChairmanApi.js'

/**
 * @returns {Promise<import('../contracts/v1/chairmanIntelligence.js').ChairmanIntelligenceResponseDto>}
 */
export async function getChairmanIntelligence() {
  const base = getApiBaseUrl()
  if (base) return fetchChairmanFromApi(base)
  return mockGetChairmanIntelligence()
}
