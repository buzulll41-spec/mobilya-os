import { useEffect, useState } from 'react'
import { isDemoMode, isDevelopmentMode } from '../../config/appMode.js'
import { getPerformanceSnapshot } from '../../lib/performanceMonitor.js'

export default function DeveloperPerformancePanel() {
  const visible = isDevelopmentMode() || isDemoMode()
  const [open, setOpen] = useState(false)
  const [snap, setSnap] = useState(getPerformanceSnapshot)

  useEffect(() => {
    if (!visible) return
    const id = window.setInterval(() => setSnap(getPerformanceSnapshot()), 3000)
    return () => window.clearInterval(id)
  }, [visible])

  if (!visible) return null

  const memoryMb =
    typeof performance !== 'undefined' &&
    /** @type {Performance & { memory?: { usedJSHeapSize: number } }} */ (performance).memory?.usedJSHeapSize
      ? Math.round(
          /** @type {Performance & { memory: { usedJSHeapSize: number } }} */ (performance).memory
            .usedJSHeapSize /
            (1024 * 1024),
        )
      : null

  return (
    <div className={`mos-dev-perf${open ? ' mos-dev-perf--open' : ''}`}>
      <button
        type="button"
        className="mos-dev-perf__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Perf
      </button>
      {open ? (
        <div className="mos-dev-perf__panel" role="region" aria-label="Performance panel">
          <strong>Performance Panel</strong>
          <dl>
            <div>
              <dt>İlk yükleme</dt>
              <dd>{snap.initialLoadMs != null ? `${snap.initialLoadMs} ms` : '—'}</dd>
            </div>
            <div>
              <dt>Son sayfa</dt>
              <dd>{snap.pageId ?? '—'}</dd>
            </div>
            <div>
              <dt>Geçiş süresi</dt>
              <dd>{snap.lastTransitionMs != null ? `${snap.lastTransitionMs} ms` : '—'}</dd>
            </div>
            <div>
              <dt>Bellek (heap)</dt>
              <dd>{memoryMb != null ? `${memoryMb} MB` : '—'}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  )
}
