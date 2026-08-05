import { useCallback, useEffect, useState } from 'react'
import LoadingBlock from '../components/LoadingBlock.jsx'
import ApiTimeoutPanel from '../components/ApiTimeoutPanel.jsx'
import { collectGoLiveReadinessSnapshot } from '../services/goLiveClient.js'
import {
  getAppMode,
  getEnvAppMode,
  isRuntimeModeAllowed,
  listAvailableAppModes,
  setRuntimeModeOverride,
} from '../config/appMode.js'
import { APP_MODE } from '../config/appMode.js'
import { runSimulatedBackup, runSimulatedRestoreTest } from '../services/backupClient.js'
import '../styles/go-live.css'

const POLL_MS = 15_000

/**
 * @param {'pass' | 'warn' | 'fail'} status
 */
function checkClass(status) {
  if (status === 'pass') return 'is-pass'
  if (status === 'warn') return 'is-warn'
  return 'is-fail'
}

/**
 * @param {boolean} checked
 */
function checkBox(checked) {
  return checked ? '☑' : '☐'
}

/** @param {{ onNavigate?: (pageId: string) => void }} props */
export default function GoLivePage({ onNavigate }) {
  const [view, setView] = useState(
    /** @type {Awaited<ReturnType<typeof collectGoLiveReadinessSnapshot>> | null} */ (null),
  )
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState(/** @type {unknown} */ (null))
  const [modeVersion, setModeVersion] = useState(0)

  const refresh = useCallback(async () => {
    setError(null)
    setRetrying(true)
    try {
      const next = await collectGoLiveReadinessSnapshot()
      setView(next)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
      setRetrying(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), POLL_MS)
    const onMode = () => setModeVersion((v) => v + 1)
    window.addEventListener('mobilya:runtime-mode', onMode)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('mobilya:runtime-mode', onMode)
    }
  }, [refresh])

  void modeVersion

  if (loading && !view) {
    return (
      <div className="mos-go-live">
        <LoadingBlock label="Go Live hazırlık kontrolü yükleniyor…" />
      </div>
    )
  }

  if (error && !view) {
    return (
      <div className="mos-go-live">
        <ApiTimeoutPanel error={error} onRetry={() => void refresh()} retrying={retrying} />
      </div>
    )
  }

  const checklist = view?.checklist
  const score = view?.score

  return (
    <div className="mos-go-live">
      <header className="mos-go-live__head">
        <div>
          <h1 className="mos-go-live__title">GO LIVE</h1>
          <p className="mos-go-live__sub">Evtrend canli magaza hazirlik kontrol listesi.</p>
        </div>
        <div className="mos-go-live__score-ring">
          <span className="mos-go-live__score-value">{score?.totalScore ?? 0}</span>
          <span className="mos-go-live__score-label">{score?.label ?? '—'}</span>
        </div>
      </header>

      {error ? (
        <ApiTimeoutPanel error={error} onRetry={() => void refresh()} retrying={retrying} />
      ) : null}

      <div className="mos-go-live__grid">
        <section className="mos-go-live__panel">
          <h2 className="mos-go-live__panel-title">Go Live Checklist</h2>
          <ul className="mos-go-live__checklist">
            {checklist?.checks.map((item) => (
              <li key={item.id} className={`mos-go-live__check ${checkClass(item.status)}`}>
                <span className="mos-go-live__check-box" aria-hidden>
                  {checkBox(item.checked)}
                </span>
                <div className="mos-go-live__check-body">
                  <div className="mos-go-live__check-label">{item.label}</div>
                  <div className="mos-go-live__check-detail">{item.detail}</div>
                </div>
              </li>
            ))}
          </ul>
          <div
            className={`mos-go-live__verdict ${checklist?.readyForGoLive ? 'is-ready' : 'is-blocked'}`}
          >
            {checklist?.readyForGoLive
              ? `Canlıya hazır — ${checklist.passCount}/${checklist.checks.length} kontrol geçti`
              : `${checklist?.failCount ?? 0} kritik · ${checklist?.warnCount ?? 0} uyarı — düzeltme gerekli`}
          </div>
        </section>

        <div>
          <section className="mos-go-live__panel">
            <h2 className="mos-go-live__panel-title">Production Readiness Score</h2>
            <div className="mos-go-live__dim-grid">
              {score?.dimensions.map((d) => (
                <div key={d.id} className="mos-go-live__dim">
                  <strong>{d.score}</strong>
                  {d.label}
                </div>
              ))}
            </div>
          </section>

          <section className="mos-go-live__panel" style={{ marginTop: '1rem' }}>
            <h2 className="mos-go-live__panel-title">Production Mode</h2>
            <p className="mos-go-live__sub" style={{ margin: 0 }}>
              Env: <code>{getEnvAppMode()}</code> · Aktif: <strong>{getAppMode()}</strong>
            </p>
            {isRuntimeModeAllowed() ? (
              <div className="mos-go-live__mode-row">
                {listAvailableAppModes().map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`mos-btn mos-btn-ghost mos-btn-sm mos-go-live__mode-btn ${getAppMode() === mode ? 'is-active' : ''}`}
                    onClick={() => {
                      setRuntimeModeOverride(mode === getEnvAppMode() ? null : mode)
                      setModeVersion((v) => v + 1)
                      void refresh()
                    }}
                  >
                    {mode === APP_MODE.DEMO
                      ? 'Demo'
                      : mode === APP_MODE.DEVELOPMENT
                        ? 'Development'
                        : 'Production'}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mos-go-live__sub" style={{ marginTop: '0.5rem' }}>
                Runtime mod değişimi kapalı. <code>VITE_ALLOW_RUNTIME_MODE=true</code> ile açılabilir.
              </p>
            )}
          </section>

          <section className="mos-go-live__panel" style={{ marginTop: '1rem' }}>
            <h2 className="mos-go-live__panel-title">Performance</h2>
            <div className="mos-go-live__perf-row">
              <span>İlk açılış</span>
              <span>
                {view?.performance.initialLoadMs ?? '—'} ms{' '}
                {view?.performance.initialLoadOk ? '✓' : '(hedef &lt;2s)'}
              </span>
            </div>
            <div className="mos-go-live__perf-row">
              <span>Son sayfa geçişi</span>
              <span>
                {view?.performance.lastTransitionMs ?? '—'} ms{' '}
                {view?.performance.transitionOk ? '✓' : '(hedef &lt;500ms)'}
              </span>
            </div>
          </section>

          <section className="mos-go-live__panel" style={{ marginTop: '1rem' }}>
            <h2 className="mos-go-live__panel-title">Backup</h2>
            <p className="mos-go-live__sub" style={{ margin: '0 0 0.5rem' }}>
              Son yedek:{' '}
              {view?.backup.lastBackupAt
                ? new Date(view.backup.lastBackupAt).toLocaleString('tr-TR')
                : '—'}
            </p>
            <div className="mos-go-live__mode-row">
              <button
                type="button"
                className="mos-btn mos-btn-ghost mos-btn-sm"
                onClick={() => {
                  runSimulatedBackup()
                  void refresh()
                }}
              >
                Export / Yedek al
              </button>
              <button
                type="button"
                className="mos-btn mos-btn-ghost mos-btn-sm"
                onClick={() => {
                  runSimulatedRestoreTest()
                  void refresh()
                }}
              >
                Restore testi
              </button>
            </div>
          </section>

          <div className="mos-go-live__links">
            <button
              type="button"
              className="mos-btn mos-btn-ghost mos-btn-sm"
              onClick={() => onNavigate?.('system-health')}
            >
              System Health →
            </button>
            <button
              type="button"
              className="mos-btn mos-btn-ghost mos-btn-sm"
              onClick={() => onNavigate?.('error-center')}
            >
              Error Center →
            </button>
            <button
              type="button"
              className="mos-btn mos-btn-primary mos-btn-sm"
              onClick={() => void refresh()}
              disabled={retrying}
            >
              {retrying ? 'Yenileniyor…' : 'Yenile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
