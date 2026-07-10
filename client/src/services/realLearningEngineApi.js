import { createAuthedApiClient } from '../lib/operationActor.js'



/**

 * @param {string} base

 * @returns {Promise<import('../contracts/v1/learningEngine.js').LearningEngineResponseDto>}

 */

export async function fetchLearningEngineFromApi(base) {

  const client = createAuthedApiClient(base)

  return client.get('/v1/reports/learning-engine')

}


