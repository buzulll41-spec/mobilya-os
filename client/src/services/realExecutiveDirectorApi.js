import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/executiveDirector.js').ExecutiveDirectorResponseDto>}
 */
export async function fetchExecutiveDirectorFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/executive-director')
}

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/executiveDirector.js').ExecutiveDirectorResponseDto>}
 */
export async function runExecutiveDirectorOnApi(base) {
  const client = createAuthedApiClient(base)
  return client.post('/v1/reports/executive-director/run', {})
}
