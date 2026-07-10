import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/enterpriseCommandCenter.js').EnterpriseCommandCenterResponseDto>}
 */
export async function fetchEnterpriseCommandCenterFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/enterprise-command-center')
}
