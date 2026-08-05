import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/operationsAgent.js').OperationsAgentsResponseDto>}
 */
export async function fetchOperationsAgentsFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/reports/operations-agents')
}

/**
 * @param {string} base
 * @param {import('../contracts/v1/operationsAgent.js').AgentCode} agentCode
 * @returns {Promise<import('../contracts/v1/operationsAgent.js').OperationsAgentDetailDto>}
 */
export async function fetchOperationsAgentDetailFromApi(base, agentCode) {
  const client = createAuthedApiClient(base)
  return client.get(`/v1/reports/operations-agents/${encodeURIComponent(agentCode)}`)
}

/**
 * @param {string} base
 * @param {import('../contracts/v1/operationsAgent.js').AgentCode} [agentCode]
 * @returns {Promise<import('../contracts/v1/operationsAgent.js').OperationsAgentsResponseDto>}
 */
export async function runOperationsAgentsOnApi(base, agentCode) {
  const client = createAuthedApiClient(base)
  const path = agentCode
    ? `/v1/reports/operations-agents/run/${encodeURIComponent(agentCode)}`
    : '/v1/reports/operations-agents/run'
  return client.post(path, {})
}
