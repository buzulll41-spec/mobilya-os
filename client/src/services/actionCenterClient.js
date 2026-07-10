import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchActionCenterFromApi, patchActionStatusOnApi } from './realActionCenterApi.js'
import { mockGetActionCenter, mockUpdateActionStatus } from './mockActionCenterApi.js'

/**
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/actionCenter.js').ActionCenterResponseDto>}
 */
export async function getActionCenter(query) {
  const base = getApiBaseUrl()
  if (base) return fetchActionCenterFromApi(base, query)
  return mockGetActionCenter(query)
}

/**
 * @param {string} id
 * @param {import('../contracts/v1/actionCenter.js').ActionStatus} status
 * @returns {Promise<{ status: string, lastActionAt: string }>}
 */
export async function updateActionStatus(id, status) {
  const base = getApiBaseUrl()
  if (base) return patchActionStatusOnApi(base, id, status)
  return mockUpdateActionStatus(id, status)
}
