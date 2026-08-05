import { getApiBaseUrl } from '../config/dataSource.js'

import { fetchGroupChairmanFromApi } from './realGroupChairmanApi.js'

import { mockGetGroupChairman } from './mockGroupChairmanApi.js'



/**

 * @returns {Promise<import('../contracts/v1/groupChairman.js').GroupChairmanResponseDto>}

 */

export async function getGroupChairman() {

  const base = getApiBaseUrl()

  if (base) return fetchGroupChairmanFromApi(base)

  return mockGetGroupChairman()

}

