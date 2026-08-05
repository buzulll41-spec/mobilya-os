import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/holdingCenter.js').HoldingCenterResponseDto>}
 */
export async function fetchHoldingCenterFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/holding-center')
}
