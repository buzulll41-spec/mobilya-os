import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/optimizationEngine.js').OptimizationEngineResponseDto>}
 */
export async function fetchOptimizationEngineFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/optimization-engine')
}

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/optimizationEngine.js').OptimizationApplyResponseDto>}
 */
export async function applyOptimizationEngineFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.post('/v1/reports/optimization-engine/apply', {})
}
