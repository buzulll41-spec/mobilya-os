import { getApiBaseUrl } from '../config/dataSource.js'
import { fetchHoldingCenterFromApi } from './realHoldingCenterApi.js'
import { mockGetHoldingCenter } from './mockHoldingCenterApi.js'

/**
 * @returns {Promise<import('../contracts/v1/holdingCenter.js').HoldingCenterResponseDto>}
 */
export async function getHoldingCenter() {
  const base = getApiBaseUrl()
  if (base) return fetchHoldingCenterFromApi(base)
  return mockGetHoldingCenter()
}
