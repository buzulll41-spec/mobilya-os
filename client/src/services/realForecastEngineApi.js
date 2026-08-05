import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/forecastEngine.js').ForecastEngineResponseDto>}
 */
export async function fetchForecastEngineFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  for (const k of ['month', 'salesPerson', 'salesSourceType', 'limitedView']) {
    if (query[k]) params.set(k, query[k])
  }
  const qs = params.toString()
  return client.get(qs ? `/v1/reports/forecast-engine?${qs}` : '/v1/reports/forecast-engine')
}
