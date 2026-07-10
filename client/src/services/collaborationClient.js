import { getApiBaseUrl } from '../config/dataSource.js'
import {
  getCollaborationFeedLocal,
  getCollaborationHistoryLocal,
  getCompanyCollaborationSummaryLocal,
  getWorkerCollaborationLocal,
} from './collaboration/CollaborationService.js'

/**
 * @param {object} runtimeCtx
 */
export async function fetchCollaborationFeed(runtimeCtx, opts = {}) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const qs = opts.limit ? `?limit=${opts.limit}` : ''
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/collaboration/feed${qs}`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Collaboration runtime context required in mock mode')
  return getCollaborationFeedLocal({ todayIso: runtimeCtx.todayIso, limit: opts.limit })
}

/**
 * @param {object} runtimeCtx
 * @param {{ limit?: number }} [opts]
 */
export async function fetchCollaborationHistory(runtimeCtx, opts = {}) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const qs = opts.limit ? `?limit=${opts.limit}` : ''
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/collaboration/history${qs}`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Collaboration runtime context required in mock mode')
  return getCollaborationHistoryLocal(opts)
}

/**
 * @param {object} runtimeCtx
 */
export async function fetchCompanyCollaboration(runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/collaboration/company`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Collaboration runtime context required in mock mode')
  return getCompanyCollaborationSummaryLocal(runtimeCtx)
}

/**
 * @param {string} workerId
 * @param {object} runtimeCtx
 */
export async function fetchWorkerCollaboration(workerId, runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(
        `${base.replace(/\/+$/, '')}/v1/collaboration/worker/${encodeURIComponent(workerId)}`,
        { cache: 'no-store' },
      )
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Collaboration runtime context required in mock mode')
  return getWorkerCollaborationLocal(workerId, runtimeCtx)
}

export {}
