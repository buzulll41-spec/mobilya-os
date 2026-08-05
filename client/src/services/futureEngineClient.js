import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchFutureEngineFromApi } from './realFutureEngineApi.js'
import { mockGetFutureEngine } from './mockFutureEngineApi.js'

/**
 * @returns {Promise<import('../contracts/v1/futureEngine.js').FutureEngineResponseDto>}
 */
export async function getEnterpriseFutureEngine() {
  const base = getApiBaseUrl()
  if (base) return fetchFutureEngineFromApi(base)
  return mockGetFutureEngine()
}
