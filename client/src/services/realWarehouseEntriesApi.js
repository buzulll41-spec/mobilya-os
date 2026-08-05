import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {{ supplierId?: string, physicalLocation?: string, stockStatus?: string, q?: string }} [query]
 * @returns {Promise<import('../contracts/v1/warehouseEntry.js').WarehouseEntryDto[]>}
 */
export async function fetchWarehouseEntriesFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  if (query.supplierId) params.set('supplierId', query.supplierId)
  if (query.physicalLocation) params.set('physicalLocation', query.physicalLocation)
  if (query.stockStatus) params.set('stockStatus', query.stockStatus)
  if (query.q) params.set('q', query.q)
  const qs = params.toString()
  return client.get(qs ? `/v1/reports/warehouse-entries?${qs}` : '/v1/reports/warehouse-entries')
}
