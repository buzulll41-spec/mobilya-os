import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/actionOrchestrator.js').ActionOrchestratorResponseDto>}
 */
export async function fetchActionOrchestratorFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/action-orchestrator')
}

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/actionOrchestrator.js').ActionOrchestratorResponseDto>}
 */
export async function runActionOrchestratorFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.post('/v1/reports/action-orchestrator/run')
}
