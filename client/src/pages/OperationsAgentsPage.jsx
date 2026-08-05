import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getOperationsAgents, runOperationsAgents } from '../services/operationsAgentsClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import { USER_ROLE } from '../contracts/v1/user.js'
import { AGENT_LABELS } from '../contracts/v1/operationsAgent.js'
import OperationsAgentDetailPage from './OperationsAgentDetailPage.jsx'
import '../styles/mos-erp-ops.css'

const PRIORITY_TONE = { P1: 'critical', P2: 'warning', P3: 'info' }
const PRIORITY_LABEL = { P1: 'P1 · Acil', P2: 'P2 · Yüksek', P3: 'P3 · Orta' }
const STATUS_LABEL = { IDLE: 'Bekliyor', RUNNING: 'Çalışıyor', COMPLETED: 'Tamamlandı', ERROR: 'Hata' }
const STATUS_TONE = { IDLE: 'muted', RUNNING: 'warning', COMPLETED: 'success', ERROR: 'critical' }

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

function canRunAgents(role) {
  return role === USER_ROLE.ADMIN || role === USER_ROLE.MANAGER
}

export default function OperationsAgentsPage() {
  const user = getCurrentAuthUser()
  const runAllowed = canRunAgents(user?.role)

  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [selectedAgent, setSelectedAgent] = useState(/** @type {string | null} */ (null))

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    return getOperationsAgents()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message ?? 'Operasyon ajanları yüklenemedi')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let alive = true
    load().then(() => {
      if (!alive) return
    })
    return () => {
      alive = false
    }
  }, [load])

  const handleRunAll = async () => {
    if (!runAllowed) return
    setRunning(true)
    setError(null)
    try {
      const res = await runOperationsAgents()
      setData(res)
    } catch (err) {
      setError(err?.message ?? 'Ajanlar çalıştırılamadı')
    } finally {
      setRunning(false)
    }
  }

  const summaryMetrics = useMemo(() => {
    if (!data?.summary) return []
    const s = data.summary
    return [
      { id: 'agents', label: 'Toplam Ajan', value: String(s.totalAgents) },
      { id: 'active', label: 'Aktif', value: String(s.activeAgents), valueTone: 'success' },
      { id: 'p1', label: 'P1 Konu', value: String(s.p1Issues), valueTone: s.p1Issues > 0 ? 'critical' : 'neutral' },
      { id: 'p2', label: 'P2 Konu', value: String(s.p2Issues), valueTone: s.p2Issues > 0 ? 'warning' : 'neutral' },
      { id: 'p3', label: 'P3 Konu', value: String(s.p3Issues) },
      { id: 'cases', label: 'Üretilen Vaka', value: String(s.generatedCases) },
      { id: 'actions', label: 'Üretilen Görev', value: String(s.generatedActions) },
      { id: 'jobs', label: 'Üretilen İş', value: String(s.generatedJobs) },
    ]
  }, [data])

  if (selectedAgent) {
    return (
      <OperationsAgentDetailPage
        agentCode={selectedAgent}
        onBack={() => setSelectedAgent(null)}
        runAllowed={runAllowed}
        onRunComplete={() => load()}
      />
    )
  }

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Otonom Operasyon Ajanları</h1>
          <span className="mos-erp-ops__sub">
            Deterministik kural tabanlı ajanlar · Günlük brifing ve öncelik listesi
            {data?.today ? ` · ${data.today}` : ''}
          </span>
        </div>
        {runAllowed && (
          <div className="mos-erp-ops__head-actions">
            <button
              type="button"
              className="mos-btn mos-btn--primary"
              disabled={loading || running}
              onClick={() => void handleRunAll()}
            >
              {running ? 'Çalışıyor…' : 'Tüm Ajanları Çalıştır'}
            </button>
          </div>
        )}
      </header>

      {loading && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">Yükleniyor…</span></div>}
      {!loading && error && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">{error}</span></div>}

      {!loading && !error && data && (
        <>
          <ErpOpsSummaryStrip metrics={summaryMetrics} ariaLabel="Ajan özeti" summaryClassName="mos-erp-summary--cols-8" />

          {data.briefing && (
            <section className="mos-erp-cockpit-section" aria-label="Günlük brifing">
              <h2 className="mos-erp-cockpit-section__title">Günlük Brifing</h2>
              <div className="mos-erp-panel" style={{ padding: '0.75rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>{data.briefing.headline}</p>
                {data.briefing.paragraphs.map((p, i) => (
                  <p key={i} style={{ margin: '0 0 0.35rem', fontSize: '0.85rem' }}>{p}</p>
                ))}
                {data.briefing.whatToDoToday?.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem' }}>Bugün ne yapmalıyım?</strong>
                    <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                      {data.briefing.whatToDoToday.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="mos-erp-cockpit-section" aria-label="Öncelik listesi">
            <h2 className="mos-erp-cockpit-section__title">Öncelik Listesi</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Öncelik</th>
                    <th>Konu</th>
                    <th>Açıklama</th>
                    <th>Ajan</th>
                    <th>Kategori</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.priorities ?? []).length === 0 && (
                    <tr className="mos-erp-tbl-empty"><td colSpan={5}>Öncelik yok.</td></tr>
                  )}
                  {(data.priorities ?? []).map((p) => (
                    <tr key={p.id} className={`mos-erp-tbl-row${p.priority === 'P1' ? ' is-critical' : ''}`}>
                      <td className="mos-erp-tbl-td--prio"><Tag tone={PRIORITY_TONE[p.priority]}>{PRIORITY_LABEL[p.priority] ?? p.priority}</Tag></td>
                      <td className="mos-erp-tbl-td--customer">{p.title}</td>
                      <td className="mos-erp-tbl-td--muted">{p.reason}</td>
                      <td>{AGENT_LABELS[p.agentCode] ?? p.agentCode}</td>
                      <td className="mos-erp-tbl-td--muted">{p.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mos-erp-cockpit-section" aria-label="Ajan listesi">
            <h2 className="mos-erp-cockpit-section__title">Ajan Listesi</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Öncelik</th>
                    <th>Ajan</th>
                    <th>Açıklama</th>
                    <th>Durum</th>
                    <th>Son Çalışma</th>
                    <th className="is-num">Vaka</th>
                    <th className="is-num">Görev</th>
                    <th className="is-num">İş</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.agents ?? []).map((a) => (
                    <tr
                      key={a.id}
                      className={`mos-erp-tbl-row mos-erp-tbl-row--clickable${a.priority === 'P1' ? ' is-critical' : ''}`}
                      onClick={() => setSelectedAgent(a.agentCode)}
                    >
                      <td className="mos-erp-tbl-td--prio"><Tag tone={PRIORITY_TONE[a.priority]}>{a.priority}</Tag></td>
                      <td className="mos-erp-tbl-td--customer">{a.agentName}</td>
                      <td className="mos-erp-tbl-td--muted">{a.description}</td>
                      <td><Tag tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status] ?? a.status}</Tag></td>
                      <td className="mos-erp-tbl-td--muted">{(a.lastRunAt ?? '—').slice(0, 16).replace('T', ' ')}</td>
                      <td className="is-num">{a.generatedCases}</td>
                      <td className="is-num">{a.generatedActions}</td>
                      <td className="is-num">{a.generatedJobs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mos-erp-cockpit-section" aria-label="Öneriler">
            <h2 className="mos-erp-cockpit-section__title">Öneriler</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Öncelik</th>
                    <th>Ajan</th>
                    <th>Öneri</th>
                    <th>Gerekçe</th>
                    <th>Önerilen Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.recommendations ?? []).length === 0 && (
                    <tr className="mos-erp-tbl-empty"><td colSpan={5}>Öneri yok.</td></tr>
                  )}
                  {(data.recommendations ?? []).map((r) => (
                    <tr key={r.id} className="mos-erp-tbl-row">
                      <td className="mos-erp-tbl-td--prio"><Tag tone={PRIORITY_TONE[r.priority]}>{r.priority}</Tag></td>
                      <td>{AGENT_LABELS[r.agentCode] ?? r.agentCode}</td>
                      <td className="mos-erp-tbl-td--customer">{r.title}</td>
                      <td className="mos-erp-tbl-td--muted">{r.reason}</td>
                      <td className="mos-erp-tbl-td--action">{r.recommendedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mos-erp-cockpit-section" aria-label="Üretilen özet">
            <h2 className="mos-erp-cockpit-section__title">Üretilen Vaka / Görev / İş Özeti</h2>
            <ErpOpsSummaryStrip
              metrics={[
                { id: 'gc', label: 'Toplam Vaka', value: String(data.generatedCases) },
                { id: 'ga', label: 'Toplam Görev', value: String(data.generatedActions) },
                { id: 'gj', label: 'Toplam İş', value: String(data.generatedJobs) },
              ]}
              ariaLabel="Üretilen kayıtlar"
              summaryClassName="mos-erp-summary--cols-3"
            />
          </section>
        </>
      )}
    </div>
  )
}
