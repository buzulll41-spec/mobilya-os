import { getApiBaseUrl } from '../config/dataSource.js'

import { fetchInvestorIntelligenceFromApi } from './realInvestorIntelligenceApi.js'

import { mockGetInvestorIntelligence } from './mockInvestorIntelligenceApi.js'



/**

 * @returns {Promise<import('../contracts/v1/investorIntelligence.js').InvestorIntelligenceResponseDto>}

 */

export async function getInvestorIntelligence() {

  const base = getApiBaseUrl()

  if (base) return fetchInvestorIntelligenceFromApi(base)

  return mockGetInvestorIntelligence()

}

