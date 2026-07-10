import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/goalEngine.js').GoalEngineResponseDto>}
 */
export async function fetchGoalEngineFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/goal-engine')
}

/**
 * @param {string} base
 * @param {string} goalId
 */
export async function patchGoalProgressFromApi(base, goalId) {
  const client = createAuthedApiClient(base)
  return client.patch(`/v1/reports/goal-engine/${goalId}`, {})
}
