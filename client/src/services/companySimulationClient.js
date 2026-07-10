import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchCompanySimulationFromApi, runCompanySimulationOnApi } from './realCompanySimulationApi.js'
import { mockGetCompanySimulation, mockRunCompanySimulation } from './mockCompanySimulationApi.js'

/**
 * @returns {Promise<import('../contracts/v1/companySimulation.js').CompanySimulationResponseDto>}
 */
export async function getCompanySimulation() {
  const base = getApiBaseUrl()
  if (base) return fetchCompanySimulationFromApi(base)
  return mockGetCompanySimulation()
}

/**
 * @param {import('../contracts/v1/companySimulation.js').SimulationInputDto} input
 * @returns {Promise<import('../contracts/v1/companySimulation.js').CompanySimulationResponseDto>}
 */
export async function runCompanySimulation(input) {
  const base = getApiBaseUrl()
  if (base) return runCompanySimulationOnApi(base, input)
  return mockRunCompanySimulation(input)
}
