import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchCeoIntelligenceFromApi } from './realCeoIntelligenceApi.js'
import { mockGetCeoIntelligence } from './mockCeoIntelligenceApi.js'

/**
 * @returns {Promise<import('../contracts/v1/ceoIntelligence.js').CeoIntelligenceResponseDto>}
 */
export async function getCeoIntelligence() {
  const base = getApiBaseUrl()
  if (base) return fetchCeoIntelligenceFromApi(base)
  return mockGetCeoIntelligence()
}
