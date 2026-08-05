import { getApiBaseUrl } from '../config/dataSource.js'
import {
  fetchOperationsAgentDetailFromApi,
  fetchOperationsAgentsFromApi,
  runOperationsAgentsOnApi,
} from './realOperationsAgentsApi.js'
import { mockGetOperationsAgentDetail, mockGetOperationsAgents, mockRunOperationsAgents } from './mockOperationsAgentsApi.js'

/**
 * @returns {Promise<import('../contracts/v1/operationsAgent.js').OperationsAgentsResponseDto>}
 */
export async function getOperationsAgents() {
  const base = getApiBaseUrl()
  if (base) return fetchOperationsAgentsFromApi(base)
  return mockGetOperationsAgents()
}

/**
 * @param {import('../contracts/v1/operationsAgent.js').AgentCode} agentCode
 * @returns {Promise<import('../contracts/v1/operationsAgent.js').OperationsAgentDetailDto>}
 */
export async function getOperationsAgentDetail(agentCode) {
  const base = getApiBaseUrl()
  if (base) return fetchOperationsAgentDetailFromApi(base, agentCode)
  return mockGetOperationsAgentDetail(agentCode)
}

/**
 * @param {import('../contracts/v1/operationsAgent.js').AgentCode} [agentCode]
 * @returns {Promise<import('../contracts/v1/operationsAgent.js').OperationsAgentsResponseDto>}
 */
export async function runOperationsAgents(agentCode) {
  const base = getApiBaseUrl()
  if (base) return runOperationsAgentsOnApi(base, agentCode)
  return mockRunOperationsAgents(agentCode)
}
