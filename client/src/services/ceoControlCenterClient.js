import { getApiBaseUrl } from '../config/dataSource.js'

import { fetchCeoControlCenterFromApi } from './realCeoControlCenterApi.js'

import { mockGetCeoControlCenter } from './mockCeoControlCenterApi.js'



/**

 * @returns {Promise<import('../contracts/v1/ceoControlCenter.js').CeoControlCenterResponseDto>}

 */

export async function getCeoControlCenter() {

  const base = getApiBaseUrl()

  if (base) return fetchCeoControlCenterFromApi(base)

  return mockGetCeoControlCenter()

}


