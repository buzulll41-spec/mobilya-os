import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/actionCenter.js').ActionCenterResponseDto>}
 */
export async function fetchActionCenterFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  for (const k of ['priority', 'category', 'status', 'q', 'salesPerson', 'limitedView']) {
    if (query[k]) params.set(k, query[k])
  }
  const qs = params.toString()
  return client.get(qs ? `/v1/reports/action-center?${qs}` : '/v1/reports/action-center')
}

/**
 * @param {string} base
 * @param {string} id
 * @param {import('../contracts/v1/actionCenter.js').ActionStatus} status
 * @returns {Promise<{ status: string, lastActionAt: string }>}
 */
export async function patchActionStatusOnApi(base, id, status) {
  const client = createAuthedApiClient(base)
  return client.patch(`/v1/reports/action-center/${encodeURIComponent(id)}`, { status })
}
