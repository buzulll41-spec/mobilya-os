import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/strategicIntelligence.js').StrategicIntelligenceResponseDto>}
 */
export async function fetchStrategicIntelligenceFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/strategic-intelligence')
}
