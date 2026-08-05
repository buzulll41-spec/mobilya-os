import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/operationCase.js').OperationCasesResponseDto>}
 */
export async function fetchOperationCasesFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  for (const k of ['priority', 'status', 'q', 'salesPerson', 'limitedView']) {
    if (query[k]) params.set(k, query[k])
  }
  const qs = params.toString()
  return client.get(qs ? `/v1/reports/operation-cases?${qs}` : '/v1/reports/operation-cases')
}

/**
 * @param {string} base
 * @param {string} id
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/operationCase.js').OperationCaseDetailDto>}
 */
export async function fetchOperationCaseDetailFromApi(base, id, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  for (const k of ['salesPerson', 'limitedView']) {
    if (query[k]) params.set(k, query[k])
  }
  const qs = params.toString()
  const path = `/v1/reports/operation-cases/${encodeURIComponent(id)}`
  return client.get(qs ? `${path}?${qs}` : path)
}

/**
 * @param {string} base
 * @param {string} id
 * @param {{ status?: string, ownerUserId?: string|null, ownerRole?: string|null }} patch
 * @returns {Promise<{ status?: string, ownerUserId?: string|null, ownerRole?: string|null, updatedAt: string, closedAt?: string|null }>}
 */
export async function patchOperationCaseOnApi(base, id, patch) {
  const client = createAuthedApiClient(base)
  return client.patch(`/v1/reports/operation-cases/${encodeURIComponent(id)}`, patch)
}
