import { getApiBaseUrl } from '../config/dataSource.js'

import { fetchBusinessBrainFromApi } from './realBusinessBrainApi.js'

import { mockGetBusinessBrain } from './mockBusinessBrainApi.js'



/**

 * @returns {Promise<import('../contracts/v1/businessBrain.js').BusinessBrainResponseDto>}

 */

export async function getBusinessBrain() {

  const base = getApiBaseUrl()

  if (base) return fetchBusinessBrainFromApi(base)

  return mockGetBusinessBrain()

}

