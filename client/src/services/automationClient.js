import { getApiBaseUrl } from '../config/dataSource.js'
import {
  fetchAutomationJobsFromApi,
  patchApproveJobOnApi,
  patchBulkApproveOnApi,
  patchBulkCancelOnApi,
  patchBulkRunOnApi,
  patchCancelJobOnApi,
  patchRunJobOnApi,
} from './realAutomationApi.js'
import {
  mockApproveAutomationJob,
  mockBulkApproveAutomationJobs,
  mockBulkCancelAutomationJobs,
  mockBulkRunAutomationJobs,
  mockCancelAutomationJob,
  mockGetAutomationJobs,
  mockRunAutomationJob,
} from './mockAutomationApi.js'

/**
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/automationJob.js').AutomationJobsResponseDto>}
 */
export async function getAutomationJobs(query) {
  const base = getApiBaseUrl()
  if (base) return fetchAutomationJobsFromApi(base, query)
  return mockGetAutomationJobs(query)
}

export async function approveAutomationJob(id, body = {}) {
  const base = getApiBaseUrl()
  if (base) return patchApproveJobOnApi(base, id, body)
  return mockApproveAutomationJob(id, body)
}

export async function runAutomationJob(id) {
  const base = getApiBaseUrl()
  if (base) return patchRunJobOnApi(base, id)
  return mockRunAutomationJob(id)
}

export async function cancelAutomationJob(id) {
  const base = getApiBaseUrl()
  if (base) return patchCancelJobOnApi(base, id)
  return mockCancelAutomationJob(id)
}

export async function bulkApproveAutomationJobs(ids, body = {}) {
  const base = getApiBaseUrl()
  if (base) return patchBulkApproveOnApi(base, ids, body)
  return mockBulkApproveAutomationJobs(ids, body)
}

export async function bulkRunAutomationJobs(ids) {
  const base = getApiBaseUrl()
  if (base) return patchBulkRunOnApi(base, ids)
  return mockBulkRunAutomationJobs(ids)
}

export async function bulkCancelAutomationJobs(ids) {
  const base = getApiBaseUrl()
  if (base) return patchBulkCancelOnApi(base, ids)
  return mockBulkCancelAutomationJobs(ids)
}
