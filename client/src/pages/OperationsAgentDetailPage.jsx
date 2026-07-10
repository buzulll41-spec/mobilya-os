import { useEffect, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getOperationsAgentDetail, runOperationsAgents } from '../services/operationsAgentsClient.js'
import { AGENT_LABELS } from '../contracts/v1/operationsAgent.js'
import '../styles/mos-erp-ops.css'

const PRIORITY_TONE = { P1: 'critical', P2: 'warning', P3: 'info' }
const PRIORITY_LABEL = { P1: 'P1 · Acil', P2: 'P2 · Yüksek', P3: 'P3 · Orta' }
const STATUS_LABEL = { IDLE: 'Bekliyor', RUNNING: 'Çalışıyor', COMPLETED: 'Tamamlandı', ERROR: 'Hata' }
const STATUS_TONE = { IDLE: 'muted', RUNNING: 'warning', COMPLETED: 'success', ERROR: 'critical' }

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

/**
 * @param {{
 *   agentCode: string
 *   onBack: () => void
 *   runAllowed?: boolean
 *   onRunComplete?: () => void
 * }} props
 */
export default function OperationsAgentDetailPage({ agentCode, onBack, runAllowed = false, onRunComplete }) {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getOperationsAgentDetail(agentCode)
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Ajan detayı yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [agentCode])

  const handleRun = async () => {
    if (!runAllowed) return
    setRunning(true)
    setError(null)
    try {
      await runOperationsAgents(agentCode)
      const detail = await getOperationsAgentDetail(agentCode)
      setData(detail)
      onRunComplete?.()
    } catch (err) {
      setError(err?.message ?? 'Ajan çalıştırılamadı')
    } finally {
      setRunning(false)
    }
  }

  const metrics = data
    ? [
        { id: 'prio', label: 'Öncelik', value: data.priority, valueTone: PRIORITY_TONE[data.priority] },
        { id: 'status', label: 'Durum', value: STATUS_LABEL[data.status] ?? data.status, valueTone: STATUS_TONE[data.status] },
        { id: 'cases', label: 'Vaka', value: String(data.generatedCases) },
        { id: 'actions', label: 'Görev', value: String(data.generatedActions) },
        { id: 'jobs', label: 'İş', value: String(data.generatedJobs) },
        { id: 'outputs', label: 'Çıktı', value: String((data.outputs ?? []).length) },
        { id: 'last', label: 'Son Çalışma', value: (data.lastRunAt ?? '—').slice(0, 16).replace('T', ' ') },
        { id: 'next', label: 'Sonraki', value: (data.nextRunAt ?? '—').slice(0, 16).replace('T', ' ') },
      ]
    : []

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <button type="button" className="mos-btn mos-btn--ghost" onClick={onBack} style={{ marginBottom: '0.35rem' }}>
            ← Ajan listesine dön
          </button>
          <h1 className="mos-erp-ops__title">{AGENT_LABELS[agentCode] ?? agentCode}</h1>
          <span className="mos-erp-ops__sub">{data?.description ?? 'Ajan detayı ve çıktıları'}</span>
        </div>
        {runAllowed && (
          <div className="mos-erp-ops__head-actions">
            <button
              type="button"
              className="mos-btn mos-btn--primary"
              disabled={loading || running}
              onClick={() => void handleRun()}
            >
              {running ? 'Çalışıyor…' : 'Ajanı Çalıştır'}
            </button>
          </div>
        )}
      </header>

      {loading && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">Yükleniyor…</span></div>}
      {!loading && error && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">{error}</span></div>}

      {!loading && !error && data && (
        <>
          <ErpOpsSummaryStrip metrics={metrics} ariaLabel="Ajan metrikleri" summaryClassName="mos-erp-summary--cols-8" />

          {data.summary && (
            <section className="mos-erp-cockpit-section" aria-label="Özet">
              <h2 className="mos-erp-cockpit-section__title">Özet</h2>
              <div className="mos-erp-panel" style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{data.summary}</div>
            </section>
          )}

          <section className="mos-erp-cockpit-section" aria-label="Ajan çıktıları">
            <h2 className="mos-erp-cockpit-section__title">Çıktılar</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Öncelik</th>
                    <th>Başlık</th>
                    <th>Gerekçe</th>
                    <th>Önerilen Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.outputs ?? []).length === 0 && (
                    <tr className="mos-erp-tbl-empty"><td colSpan={4}>Çıktı yok.</td></tr>
                  )}
                  {(data.outputs ?? []).map((o) => (
                    <tr key={o.id} className={`mos-erp-tbl-row${o.priority === 'P1' ? ' is-critical' : ''}`}>
                      <td className="mos-erp-tbl-td--prio"><Tag tone={PRIORITY_TONE[o.priority]}>{PRIORITY_LABEL[o.priority] ?? o.priority}</Tag></td>
                      <td className="mos-erp-tbl-td--customer">{o.title}</td>
                      <td className="mos-erp-tbl-td--muted">{o.reason}</td>
                      <td className="mos-erp-tbl-td--action">{o.recommendedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
