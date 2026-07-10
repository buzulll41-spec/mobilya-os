import { getApiBaseUrl } from '../config/dataSource.js'
import {
  getCompanyOptimizationSummaryLocal,
  getOptimizationHistoryLocal,
  getWorkerOptimizationLocal,
} from './optimization/SelfOptimizationService.js'

/**
 * @param {object} runtimeCtx
 */
export async function fetchCompanyOptimization(runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/optimization/company`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Optimization runtime context required in mock mode')
  return getCompanyOptimizationSummaryLocal(runtimeCtx)
}

/**
 * @param {string} workerId
 * @param {object} runtimeCtx
 */
export async function fetchWorkerOptimization(workerId, runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(
        `${base.replace(/\/+$/, '')}/v1/optimization/worker/${encodeURIComponent(workerId)}`,
        { cache: 'no-store' },
      )
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Optimization runtime context required in mock mode')
  const local = getWorkerOptimizationLocal(workerId, runtimeCtx)
  if (!local) return { error: 'Worker not found' }
  return local
}

/**
 * @param {object} runtimeCtx
 * @param {{ limit?: number }} [opts]
 */
export async function fetchOptimizationHistory(runtimeCtx, opts = {}) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const qs = opts.limit ? `?limit=${opts.limit}` : ''
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/optimization/history${qs}`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Optimization runtime context required in mock mode')
  return { records: getOptimizationHistoryLocal(opts) }
}

export {}
