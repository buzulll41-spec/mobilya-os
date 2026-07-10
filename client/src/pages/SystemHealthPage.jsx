import { useCallback, useEffect, useState } from 'react'
import LoadingBlock from '../components/LoadingBlock.jsx'
import ApiTimeoutPanel from '../components/ApiTimeoutPanel.jsx'
import { buildLiveSystemHealthView } from '../mappers/pilot/systemHealthModel.js'
import { collectSystemHealthSnapshot } from '../services/systemHealthClient.js'
import { getDataSourceDisplay } from '../config/dataSource.js'
import { isProductionMode } from '../config/appMode.js'
import '../styles/system-health.css'

const POLL_MS = 10_000

/**
 * @param {'success' | 'warning' | 'critical'} tone
 */
function toneClass(tone) {
  if (tone === 'success') return 'is-success'
  if (tone === 'warning') return 'is-warning'
  return 'is-critical'
}

export default function SystemHealthPage() {
  const [snapshot, setSnapshot] = useState(/** @type {Awaited<ReturnType<typeof collectSystemHealthSnapshot>> | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState(/** @type {unknown} */ (null))

  const refresh = useCallback(async () => {
    setError(null)
    setRetrying(true)
    try {
      const next = await collectSystemHealthSnapshot()
      setSnapshot(next)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
      setRetrying(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => {
      void refresh()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  const view = snapshot ? buildLiveSystemHealthView(snapshot) : null
  const dataSource = getDataSourceDisplay()

  if (loading && !snapshot) {
    return (
      <div className="mos-system-health">
        <LoadingBlock label="Sistem sağlığı yükleniyor…" />
      </div>
    )
  }

  if (error && !snapshot) {
    return (
      <div className="mos-system-health">
        <header className="mos-system-health__head">
          <h1 className="mos-system-health__title">System Health</h1>
        </header>
        <ApiTimeoutPanel error={error} onRetry={() => void refresh()} retrying={retrying} />
      </div>
    )
  }

  return (
    <div className="mos-system-health">
      <header className="mos-system-health__head">
        <div>
          <h1 className="mos-system-health__title">System Health</h1>
          <p className="mos-system-health__sub">
            Canlı mağaza altyapısı — API, Database, Redis, AI, Memory, Queue, Tool Engine, LLM Provider.
          </p>
        </div>
        <div className="mos-system-health__meta">
          <span className={`mos-system-health__badge ${view?.healthy ? 'is-ok' : 'is-warn'}`}>
            {view?.healthy ? 'Sağlıklı' : 'Dikkat gerekli'}
          </span>
          <span className="mos-system-health__mode">
            {view?.modeLabel} · {view?.dataSourceLabel}
          </span>
          {view?.polledAt ? (
            <span className="mos-system-health__polled">
              Son güncelleme: {new Date(view.polledAt).toLocaleTimeString('tr-TR')}
            </span>
          ) : null}
          <button
            type="button"
            className="mos-btn mos-btn-ghost mos-btn-sm"
            onClick={() => void refresh()}
            disabled={retrying}
          >
            {retrying ? 'Yenileniyor…' : 'Yenile'}
          </button>
        </div>
      </header>

      {isProductionMode() && dataSource.mode === 'mock' ? (
        <div className="mos-system-health__alert" role="alert">
          Production modunda mock veri kullanılıyor. <code>VITE_API_BASE_URL</code> ayarlayın.
        </div>
      ) : null}

      {error ? (
        <ApiTimeoutPanel error={error} onRetry={() => void refresh()} retrying={retrying} />
      ) : null}

      <div className="mos-exec-health mos-system-health__grid">
        {view?.items.map((item) => (
          <div key={item.id} className={`mos-exec-health__item ${toneClass(item.tone)}`}>
            <span className="mos-exec-health__label">{item.label}</span>
            <span className="mos-exec-health__detail">{item.detail}</span>
          </div>
        ))}
      </div>

      <p className="mos-system-health__foot">
        Otomatik yenileme: {POLL_MS / 1000}s · Kritik: {view?.summary.criticalCount ?? 0} · Uyarı:{' '}
        {view?.summary.warningCount ?? 0}
      </p>
    </div>
  )
}
