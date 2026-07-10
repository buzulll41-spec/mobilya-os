import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchDataQualityFromApi } from './realDataQualityApi.js'
import { mockGetDataQuality, mockDataQualityFacets } from './mockDataQualityApi.js'

/**
 * @param {{
 *   from?: string
 *   to?: string
 *   salesPerson?: string
 *   status?: string
 *   issueCode?: string
 *   q?: string
 * }} [query]
 * @returns {Promise<import('../contracts/v1/dataQuality.js').DataQualityResponseDto>}
 */
export async function getDataQuality(query) {
  const base = getApiBaseUrl()
  if (base) return fetchDataQualityFromApi(base, query)
  return mockGetDataQuality(query)
}

/** Filtre facet'leri (personel). Canlı API'de facet endpoint'i yok → boş döner. */
export function getDataQualityFacets() {
  const base = getApiBaseUrl()
  if (base) return { salesPersons: [] }
  return mockDataQualityFacets()
}
