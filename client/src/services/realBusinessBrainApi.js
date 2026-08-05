import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/businessBrain.js').BusinessBrainResponseDto>}
 */
export async function fetchBusinessBrainFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/business-brain')
}
