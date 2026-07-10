import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchOptimizationEngineFromApi, applyOptimizationEngineFromApi } from './realOptimizationEngineApi.js'
import { mockGetOptimizationEngine, mockApplyOptimizationEngine } from './mockOptimizationEngineApi.js'

/**
 * @returns {Promise<import('../contracts/v1/optimizationEngine.js').OptimizationEngineResponseDto>}
 */
export async function getOptimizationEngine() {
  const base = getApiBaseUrl()
  if (base) return fetchOptimizationEngineFromApi(base)
  return mockGetOptimizationEngine()
}

/**
 * @returns {Promise<import('../contracts/v1/optimizationEngine.js').OptimizationApplyResponseDto>}
 */
export async function applyOptimizationEngine() {
  const base = getApiBaseUrl()
  if (base) return applyOptimizationEngineFromApi(base)
  return mockApplyOptimizationEngine()
}
