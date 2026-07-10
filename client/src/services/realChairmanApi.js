import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/chairmanIntelligence.js').ChairmanIntelligenceResponseDto>}
 */
export async function fetchChairmanFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/chairman-intelligence')
}
