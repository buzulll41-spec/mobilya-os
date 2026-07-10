import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchEnterpriseCommandCenterFromApi } from './realEnterpriseCommandCenterApi.js'
import { mockGetEnterpriseCommandCenter } from './mockEnterpriseCommandCenterApi.js'

/**
 * @returns {Promise<import('../contracts/v1/enterpriseCommandCenter.js').EnterpriseCommandCenterResponseDto>}
 */
export async function getEnterpriseCommandCenter() {
  const base = getApiBaseUrl()
  if (base) return fetchEnterpriseCommandCenterFromApi(base)
  return mockGetEnterpriseCommandCenter()
}
