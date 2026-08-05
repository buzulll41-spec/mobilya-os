import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/ceoIntelligence.js').CeoIntelligenceResponseDto>}
 */
export async function fetchCeoIntelligenceFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/ceo-intelligence')
}
