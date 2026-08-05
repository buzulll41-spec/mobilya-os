import { getApiBaseUrl } from '../config/dataSource.js'
import {
  getCompanyDecisionSummaryLocal,
  getDecisionHistoryLocal,
  getWorkerDecisionSummaryLocal,
} from './decision/DecisionQualityService.js'

/**
 * @param {object} runtimeCtx
 */
export async function fetchCompanyDecisionQuality(runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/decision/company`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Decision quality runtime context required in mock mode')
  return getCompanyDecisionSummaryLocal(runtimeCtx)
}

/**
 * @param {string} workerId
 * @param {object} runtimeCtx
 */
export async function fetchWorkerDecisionQuality(workerId, runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/decision/worker/${encodeURIComponent(workerId)}`, {
        cache: 'no-store',
      })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Decision quality runtime context required in mock mode')
  const local = getWorkerDecisionSummaryLocal(workerId, runtimeCtx)
  if (!local) return { error: 'No decisions for worker' }
  return local
}

/**
 * @param {object} runtimeCtx
 * @param {{ limit?: number }} [opts]
 */
export async function fetchDecisionHistory(runtimeCtx, opts = {}) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const qs = opts.limit ? `?limit=${opts.limit}` : ''
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/decision/history${qs}`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Decision quality runtime context required in mock mode')
  return { records: getDecisionHistoryLocal(opts) }
}

export {}
