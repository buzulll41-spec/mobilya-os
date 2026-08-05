import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchProfitabilityAnalyticsFromApi } from './realProfitabilityAnalyticsApi.js'
import {
  mockGetProfitabilityAnalytics,
  mockProfitabilityFacets,
} from './mockProfitabilityAnalyticsApi.js'

/**
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/profitabilityAnalytics.js').ProfitabilityResponseDto>}
 */
export async function getProfitabilityAnalytics(query) {
  const base = getApiBaseUrl()
  if (base) return fetchProfitabilityAnalyticsFromApi(base, query)
  return mockGetProfitabilityAnalytics(query)
}

/** Filtre facet'leri (personel/kategori/tedarikçi). Canlı API'de facet yok → boş. */
export function getProfitabilityFacets() {
  const base = getApiBaseUrl()
  if (base) return { salesPersons: [], categories: [], suppliers: [], brands: [] }
  return mockProfitabilityFacets()
}
