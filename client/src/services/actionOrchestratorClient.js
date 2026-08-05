import { getApiBaseUrl } from '../config/dataSource.js'

import {

  fetchActionOrchestratorFromApi,

  runActionOrchestratorFromApi,

} from './realActionOrchestratorApi.js'

import {

  mockGetActionOrchestrator,

  mockRunActionOrchestrator,

} from './mockActionOrchestratorApi.js'



/**

 * @returns {Promise<import('../contracts/v1/actionOrchestrator.js').ActionOrchestratorResponseDto>}

 */

export async function getActionOrchestrator() {

  const base = getApiBaseUrl()

  if (base) return fetchActionOrchestratorFromApi(base)

  return mockGetActionOrchestrator()

}



/**

 * @returns {Promise<import('../contracts/v1/actionOrchestrator.js').ActionOrchestratorResponseDto>}

 */

export async function runActionOrchestrator() {

  const base = getApiBaseUrl()

  if (base) return runActionOrchestratorFromApi(base)

  return mockRunActionOrchestrator()

}

