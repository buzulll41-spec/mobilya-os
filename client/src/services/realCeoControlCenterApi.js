import { createAuthedApiClient } from '../lib/operationActor.js'



/**

 * @param {string} base

 * @returns {Promise<import('../contracts/v1/ceoControlCenter.js').CeoControlCenterResponseDto>}

 */

export async function fetchCeoControlCenterFromApi(base) {

  const client = createAuthedApiClient(base)

  return client.get('/v1/reports/ceo-control-center')

}


