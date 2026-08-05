import { getApiBaseUrl } from '../config/dataSource.js'

import { fetchBoardDirectorsFromApi } from './realBoardDirectorsApi.js'

import { mockGetBoardDirectors } from './mockBoardDirectorsApi.js'



/**

 * @returns {Promise<import('../contracts/v1/boardDirectors.js').BoardDirectorsResponseDto>}

 */

export async function getBoardDirectors() {

  const base = getApiBaseUrl()

  if (base) return fetchBoardDirectorsFromApi(base)

  return mockGetBoardDirectors()

}


