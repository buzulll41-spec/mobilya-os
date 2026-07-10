import { createAuthedApiClient } from '../lib/operationActor.js'



/**

 * @param {string} base

 * @returns {Promise<import('../contracts/v1/investorIntelligence.js').InvestorIntelligenceResponseDto>}

 */

export async function fetchInvestorIntelligenceFromApi(base) {

  const client = createAuthedApiClient(base)

  return client.get('/v1/reports/investor-intelligence')

}

