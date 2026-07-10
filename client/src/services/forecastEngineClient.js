import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchForecastEngineFromApi } from './realForecastEngineApi.js'
import { mockGetForecastEngine } from './mockForecastEngineApi.js'

/**
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/forecastEngine.js').ForecastEngineResponseDto>}
 */
export async function getForecastEngine(query) {
  const base = getApiBaseUrl()
  if (base) return fetchForecastEngineFromApi(base, query)
  return mockGetForecastEngine(query)
}
