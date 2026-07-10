import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/automationJob.js').AutomationJobsResponseDto>}
 */
export async function fetchAutomationJobsFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  for (const k of ['status', 'priority', 'q', 'salesPerson', 'limitedView']) {
    if (query[k]) params.set(k, query[k])
  }
  const qs = params.toString()
  return client.get(qs ? `/v1/reports/automation-jobs?${qs}` : '/v1/reports/automation-jobs')
}

/**
 * @param {string} base
 * @param {string} id
 * @param {{ approvedBy?: string }} [body]
 * @returns {Promise<object>}
 */
export async function patchApproveJobOnApi(base, id, body = {}) {
  const client = createAuthedApiClient(base)
  return client.patch(`/v1/reports/automation-jobs/${encodeURIComponent(id)}/approve`, body)
}

/**
 * @param {string} base
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function patchRunJobOnApi(base, id) {
  const client = createAuthedApiClient(base)
  return client.patch(`/v1/reports/automation-jobs/${encodeURIComponent(id)}/run`)
}

/**
 * @param {string} base
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function patchCancelJobOnApi(base, id) {
  const client = createAuthedApiClient(base)
  return client.patch(`/v1/reports/automation-jobs/${encodeURIComponent(id)}/cancel`)
}

/**
 * @param {string} base
 * @param {string[]} ids
 * @param {{ approvedBy?: string }} [body]
 */
export async function patchBulkApproveOnApi(base, ids, body = {}) {
  const client = createAuthedApiClient(base)
  return client.patch('/v1/reports/automation-jobs/bulk/approve', { ids, ...body })
}

/**
 * @param {string} base
 * @param {string[]} ids
 */
export async function patchBulkRunOnApi(base, ids) {
  const client = createAuthedApiClient(base)
  return client.patch('/v1/reports/automation-jobs/bulk/run', { ids })
}

/**
 * @param {string} base
 * @param {string[]} ids
 */
export async function patchBulkCancelOnApi(base, ids) {
  const client = createAuthedApiClient(base)
  return client.patch('/v1/reports/automation-jobs/bulk/cancel', { ids })
}
