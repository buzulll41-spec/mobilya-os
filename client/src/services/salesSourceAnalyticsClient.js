import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchSalesSourceAnalyticsFromApi } from './realSalesSourceAnalyticsApi.js'
import {
  mockGetSalesSourceAnalytics,
  mockSalesSourceAnalyticsFacets,
} from './mockSalesSourceAnalyticsApi.js'

/**
 * @param {{
 *   from?: string
 *   to?: string
 *   salesPerson?: string
 *   salesSourceType?: string
 *   displayFloor?: string
 *   externalSupplyType?: string
 *   category?: string
 *   supplierId?: string
 * }} [query]
 * @returns {Promise<import('../contracts/v1/salesSourceAnalytics.js').SalesSourceAnalyticsResponseDto>}
 */
export async function getSalesSourceAnalytics(query) {
  const base = getApiBaseUrl()
  if (base) return fetchSalesSourceAnalyticsFromApi(base, query)
  return mockGetSalesSourceAnalytics(query)
}

/**
 * Filtre facet'leri (personel/kategori/tedarikçi seçenekleri).
 * Canlı API'de henüz facet endpoint'i yok → boş döner, UI metin girişi kullanır.
 */
export function getSalesSourceAnalyticsFacets() {
  const base = getApiBaseUrl()
  if (base) return { salesPersons: [], categories: [], suppliers: [] }
  return mockSalesSourceAnalyticsFacets()
}
