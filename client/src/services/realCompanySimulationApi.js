import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/companySimulation.js').CompanySimulationResponseDto>}
 */
export async function fetchCompanySimulationFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/company-simulation')
}

/**
 * @param {string} base
 * @param {import('../contracts/v1/companySimulation.js').SimulationInputDto} input
 * @returns {Promise<import('../contracts/v1/companySimulation.js').CompanySimulationResponseDto>}
 */
export async function runCompanySimulationOnApi(base, input) {
  const client = createAuthedApiClient(base)
  return client.post('/v1/reports/company-simulation/run', input ?? {})
}
