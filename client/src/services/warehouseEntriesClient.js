import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchWarehouseEntriesFromApi } from './realWarehouseEntriesApi.js'
import { mockListWarehouseEntries } from './mockWarehouseEntriesApi.js'

/**
 * @param {{ supplierId?: string, physicalLocation?: string, stockStatus?: string, q?: string }} [query]
 * @returns {Promise<import('../contracts/v1/warehouseEntry.js').WarehouseEntryDto[]>}
 */
export async function listWarehouseEntries(query) {
  const base = getApiBaseUrl()
  if (base) return fetchWarehouseEntriesFromApi(base, query)
  return mockListWarehouseEntries(query)
}
