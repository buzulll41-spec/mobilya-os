/**
 * FAZ 101 — Client performance telemetry (initial load + page transitions).
 */

/** @type {{ initialLoadMs: number | null, lastTransitionMs: number | null, pageId: string | null, measuredAt: string | null }} */
const snapshot = {
  initialLoadMs: null,
  lastTransitionMs: null,
  pageId: null,
  measuredAt: null,
}

let bootMarked = false

export function markInitialLoadComplete() {
  if (bootMarked) return
  bootMarked = true
  if (typeof performance !== 'undefined' && performance.timing?.loadEventEnd) {
    const ms = performance.timing.loadEventEnd - performance.timing.navigationStart
    snapshot.initialLoadMs = ms > 0 ? ms : null
  } else if (typeof performance !== 'undefined' && performance.now) {
    snapshot.initialLoadMs = Math.round(performance.now())
  }
  snapshot.measuredAt = new Date().toISOString()
}

/**
 * @param {string} pageId
 * @param {number} durationMs
 */
export function recordPageTransition(pageId, durationMs) {
  snapshot.lastTransitionMs = Math.round(durationMs)
  snapshot.pageId = pageId
  snapshot.measuredAt = new Date().toISOString()
}

export function getPerformanceSnapshot() {
  return { ...snapshot }
}

export function resetPerformanceMonitorForTests() {
  snapshot.initialLoadMs = null
  snapshot.lastTransitionMs = null
  snapshot.pageId = null
  snapshot.measuredAt = null
  bootMarked = false
}
