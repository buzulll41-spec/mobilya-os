import { getApiBaseUrl } from '../config/dataSource.js'



import { fetchLearningEngineFromApi } from './realLearningEngineApi.js'



import { mockGetLearningEngine } from './mockLearningEngineApi.js'



/**

 * @returns {Promise<import('../contracts/v1/learningEngine.js').LearningEngineResponseDto>}

 */

export async function getLearningEngine() {

  const base = getApiBaseUrl()

  if (base) return fetchLearningEngineFromApi(base)

  return mockGetLearningEngine()

}


