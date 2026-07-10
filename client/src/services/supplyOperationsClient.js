import { getApiBaseUrl } from '../config/dataSource.js'
import * as mockApi from './mockSupplierOperationsApi.js'
import { createAuthedApiClient } from '../lib/operationActor.js'

function apiBase() {
  return getApiBaseUrl()
}

/**
 * @param {{ q?: string, activeOnly?: boolean, city?: string, health?: string, sort?: string }} [query]
 */
export async function getSupplyOperationsBoard(query) {
  const base = apiBase()
  if (base) {
    const client = createAuthedApiClient(base)
    const params = new URLSearchParams()
    if (query?.q) params.set('q', query.q)
    if (query?.activeOnly === false) params.set('activeOnly', 'false')
    if (query?.city) params.set('city', query.city)
    if (query?.health) params.set('health', query.health)
    if (query?.sort) params.set('sort', query.sort)
    const qs = params.toString()
    return client.get(qs ? `/v1/supply/operations-board?${qs}` : '/v1/supply/operations-board')
  }
  return mockApi.mockGetSupplyOperationsBoard(query)
}

/**
 * @param {string} supplierId
 */
export async function getSupplierOperations(supplierId) {
  const base = apiBase()
  if (base) {
    const client = createAuthedApiClient(base)
    return client.get(`/v1/suppliers/${encodeURIComponent(supplierId)}/operations`)
  }
  return mockApi.mockGetSupplierOperations(supplierId)
}

/**
 * @param {{ q?: string, activeOnly?: boolean, sort?: string }} [query]
 */
export async function getSupplierLedgerCenter(query) {
  const base = apiBase()
  if (base) {
    const client = createAuthedApiClient(base)
    const params = new URLSearchParams()
    if (query?.q) params.set('q', query.q)
    if (query?.activeOnly === false) params.set('activeOnly', 'false')
    if (query?.sort) params.set('sort', query.sort)
    const qs = params.toString()
    return client.get(qs ? `/v1/supply/ledger-center?${qs}` : '/v1/supply/ledger-center')
  }
  return mockApi.mockGetSupplierLedgerCenter(query)
}
