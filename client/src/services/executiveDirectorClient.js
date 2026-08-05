import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchExecutiveDirectorFromApi, runExecutiveDirectorOnApi } from './realExecutiveDirectorApi.js'
import { mockGetExecutiveDirector, mockRunExecutiveDirector } from './mockExecutiveDirectorApi.js'

/**
 * @returns {Promise<import('../contracts/v1/executiveDirector.js').ExecutiveDirectorResponseDto>}
 */
export async function getExecutiveDirector() {
  const base = getApiBaseUrl()
  if (base) return fetchExecutiveDirectorFromApi(base)
  return mockGetExecutiveDirector()
}

/**
 * @returns {Promise<import('../contracts/v1/executiveDirector.js').ExecutiveDirectorResponseDto>}
 */
export async function runExecutiveDirector() {
  const base = getApiBaseUrl()
  if (base) return runExecutiveDirectorOnApi(base)
  return mockRunExecutiveDirector()
}
