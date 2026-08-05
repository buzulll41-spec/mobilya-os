import { getApiBaseUrl } from '../config/dataSource.js'
import {
  getCompanyLearningLocal,
  getLearningStatisticsLocal,
  getOrderLearningLocal,
} from './learning/LearningEngineService.js'

/**
 * @param {object} runtimeCtx
 */
export async function fetchCompanyLearning(runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/learning/company`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Learning runtime context required in mock mode')
  return getCompanyLearningLocal(runtimeCtx)
}

/**
 * @param {string} orderId
 * @param {object} runtimeCtx
 */
export async function fetchOrderLearning(orderId, runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/learning/order/${encodeURIComponent(orderId)}`, {
        cache: 'no-store',
      })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Learning runtime context required in mock mode')
  const records = getOrderLearningLocal(runtimeCtx, orderId)
  if (!records.length) return { error: 'No learning records for order' }
  return { orderId, records }
}

/**
 * @param {object} runtimeCtx
 */
export async function fetchLearningStatistics(runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/learning/statistics`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Learning runtime context required in mock mode')
  return getLearningStatisticsLocal(runtimeCtx)
}

export {}
