import { createAuthedApiClient } from '../lib/operationActor.js'



/**

 * @param {string} base

 * @returns {Promise<import('../contracts/v1/groupChairman.js').GroupChairmanResponseDto>}

 */

export async function fetchGroupChairmanFromApi(base) {

  const client = createAuthedApiClient(base)

  return client.get('/v1/reports/group-chairman')

}


