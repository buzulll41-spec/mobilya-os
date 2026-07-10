import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/performanceFeedback.js').PerformanceFeedbackResponseDto>}
 */
export async function fetchPerformanceFeedbackFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/performance-feedback')
}
