import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/futureEngine.js').FutureEngineResponseDto>}
 */
export async function fetchFutureEngineFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/future-engine')
}
