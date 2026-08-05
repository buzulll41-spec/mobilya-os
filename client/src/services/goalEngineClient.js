import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchGoalEngineFromApi, patchGoalProgressFromApi } from './realGoalEngineApi.js'
import { mockGetGoalEngine, mockPatchGoalProgress } from './mockGoalEngineApi.js'

/**
 * @returns {Promise<import('../contracts/v1/goalEngine.js').GoalEngineResponseDto>}
 */
export async function getGoalEngine() {
  const base = getApiBaseUrl()
  if (base) return fetchGoalEngineFromApi(base)
  return mockGetGoalEngine()
}

/**
 * @param {string} goalId
 */
export async function updateGoalProgress(goalId) {
  const base = getApiBaseUrl()
  if (base) return patchGoalProgressFromApi(base, goalId)
  return mockPatchGoalProgress(goalId)
}
