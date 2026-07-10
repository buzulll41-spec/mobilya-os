import { getApiBaseUrl } from '../config/dataSource.js'
import {
  ensureDefaultBoardMeeting,
  getBoardMeetingHistoryLocal,
  getLatestBoardMeetingLocal,
  runBoardMeeting,
} from './board/BoardMeetingService.js'

/**
 * @param {string} question
 * @param {object} runtimeCtx
 */
export async function fetchRunBoardMeeting(question, runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/board/meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Board runtime context required in mock mode')
  return runBoardMeeting(question, runtimeCtx)
}

/**
 * @param {object} runtimeCtx
 */
export async function fetchLatestBoardMeeting(runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/board/latest`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Board runtime context required in mock mode')
  return ensureDefaultBoardMeeting(runtimeCtx)
}

/**
 * @param {object} runtimeCtx
 * @param {{ limit?: number }} [opts]
 */
export async function fetchBoardMeetingHistory(runtimeCtx, opts = {}) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const qs = opts.limit ? `?limit=${opts.limit}` : ''
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/board/history${qs}`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Board runtime context required in mock mode')
  return getBoardMeetingHistoryLocal(opts)
}

export { getLatestBoardMeetingLocal, runBoardMeeting }

export {}
