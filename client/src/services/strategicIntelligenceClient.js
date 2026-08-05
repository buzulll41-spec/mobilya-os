import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchStrategicIntelligenceFromApi } from './realStrategicIntelligenceApi.js'
import { mockGetStrategicIntelligence } from './mockStrategicIntelligenceApi.js'

/**
 * @returns {Promise<import('../contracts/v1/strategicIntelligence.js').StrategicIntelligenceResponseDto>}
 */
export async function getStrategicIntelligence() {
  const base = getApiBaseUrl()
  if (base) return fetchStrategicIntelligenceFromApi(base)
  return mockGetStrategicIntelligence()
}
