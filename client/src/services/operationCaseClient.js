import { getApiBaseUrl } from '../config/dataSource.js'
import {
  fetchOperationCasesFromApi,
  fetchOperationCaseDetailFromApi,
  patchOperationCaseOnApi,
} from './realOperationCaseApi.js'
import {
  mockGetOperationCases,
  mockGetOperationCaseDetail,
  mockUpdateOperationCase,
} from './mockOperationCaseApi.js'

/**
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/operationCase.js').OperationCasesResponseDto>}
 */
export async function getOperationCases(query) {
  const base = getApiBaseUrl()
  if (base) return fetchOperationCasesFromApi(base, query)
  return mockGetOperationCases(query)
}

/**
 * @param {string} id
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/operationCase.js').OperationCaseDetailDto>}
 */
export async function getOperationCaseDetail(id, query) {
  const base = getApiBaseUrl()
  if (base) return fetchOperationCaseDetailFromApi(base, id, query)
  return mockGetOperationCaseDetail(id, query)
}

/**
 * @param {string} id
 * @param {{ status?: string, ownerUserId?: string|null, ownerRole?: string|null }} patch
 */
export async function updateOperationCase(id, patch) {
  const base = getApiBaseUrl()
  if (base) return patchOperationCaseOnApi(base, id, patch)
  return mockUpdateOperationCase(id, patch)
}
