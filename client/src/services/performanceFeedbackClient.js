import { getApiBaseUrl } from '../config/dataSource.js'

import { fetchPerformanceFeedbackFromApi } from './realPerformanceFeedbackApi.js'

import { mockGetPerformanceFeedback } from './mockPerformanceFeedbackApi.js'



/**

 * @returns {Promise<import('../contracts/v1/performanceFeedback.js').PerformanceFeedbackResponseDto>}

 */

export async function getPerformanceFeedback() {

  const base = getApiBaseUrl()

  if (base) return fetchPerformanceFeedbackFromApi(base)

  return mockGetPerformanceFeedback()

}

