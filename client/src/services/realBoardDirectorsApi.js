import { createAuthedApiClient } from '../lib/operationActor.js'



/**

 * @param {string} base

 * @returns {Promise<import('../contracts/v1/boardDirectors.js').BoardDirectorsResponseDto>}

 */

export async function fetchBoardDirectorsFromApi(base) {

  const client = createAuthedApiClient(base)

  return client.get('/v1/reports/board-directors')

}


