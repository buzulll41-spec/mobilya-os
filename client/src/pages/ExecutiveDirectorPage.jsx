import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getExecutiveDirector, runExecutiveDirector } from '../services/executiveDirectorClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import { USER_ROLE } from '../contracts/v1/user.js'
import '../styles/mos-erp-ops.css'

const PRIORITY_TONE = { P1: 'critical', P2: 'warning', P3: 'info' }
const PRIORITY_LABEL = { P1: 'P1', P2: 'P2', P3: 'P3' }
const SEVERITY_TONE = { CRITICAL: 'critical', WARNING: 'warning', INFO: 'info' }

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

function canRunDirector(role) {
  return role === USER_ROLE.ADMIN || role === USER_ROLE.MANAGER
}

export default function ExecutiveDirectorPage() {
  const user = getCurrentAuthUser()
  const runAllowed = canRunDirector(user?.role)

  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    return getExecutiveDirector()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message ?? 'AI Operasyon Direktörü yüklenemedi')
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

  const handleRun = async () => {
    if (!runAllowed) return
    setRunning(true)
    setError(null)
    try {
      const res = await runExecutiveDirector()
      setData(res)
    } catch (err) {
      setError(err?.message ?? 'Plan yenilenemedi')
    } finally {
      setRunning(false)
    }
  }

  const summaryMetrics = useMemo(() => {
    if (!data?.summary) return []
    const s = data.summary
    return [
      { id: 'score', label: 'Yönetici Skoru', value: String(s.managerScore), valueTone: s.managerScore < 55 ? 'critical' : 'warning' },
      { id: 'band', label: 'Bant', value: s.managerScoreBand },
      { id: 'p1', label: 'P1 Konu', value: String(s.p1Count), valueTone: s.p1Count > 0 ? 'critical' : 'neutral' },
      { id: 'p2', label: 'P2 Konu', value: String(s.p2Count), valueTone: s.p2Count > 0 ? 'warning' : 'neutral' },
      { id: 'risks', label: 'Risk', value: String(s.riskCount) },
      { id: 'actions', label: 'Tavsiye', value: String(s.recommendedActionCount) },
      { id: 'sections', label: 'Plan Bölümü', value: String(s.planSectionCount) },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">AI Operasyon Direktörü yükleniyor…</p>
      </div>
    )
  }

  const briefing = data?.executiveBriefing
  const plan = data?.dailyPlan ?? []
  const agenda = data?.executiveAgenda ?? []
  const queue = data?.priorityQueue ?? []
  const impacts = data?.impactAnalysis ?? []
  const risks = data?.riskMap ?? []
  const recs = data?.recommendedActions ?? []

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">AI Operasyon Direktörü</h1>
          <p className="mos-erp-ops__subtitle">
            Bugün ne yapmalıyım? — {data?.today ?? '—'} · {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('tr-TR') : '—'}
          </p>
        </div>
        {runAllowed ? (
          <button type="button" className="mos-erp-btn mos-erp-btn--primary" onClick={handleRun} disabled={running}>
            {running ? 'Plan hazırlanıyor…' : 'Planı Yenile'}
          </button>
        ) : null}
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}

      {summaryMetrics.length > 0 ? <ErpOpsSummaryStrip metrics={summaryMetrics} /> : null}

      {/* Dijital Sabah Toplantısı */}
      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Dijital Sabah Toplantısı</h2>
        {briefing ? (
          <div className="mos-erp-panel__body">
            <p className="mos-erp-lead">{briefing.headline}</p>
            {briefing.criticalTopics?.length > 0 ? (
              <ul className="mos-erp-list">
                {briefing.criticalTopics.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : null}
            {briefing.recommendedActions?.length > 0 ? (
              <p className="mos-erp-muted">
                <strong>Önerilen ilk iş:</strong> {briefing.recommendedActions[0]}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="mos-erp-ops__grid mos-erp-ops__grid--2">
        {/* Günlük Operasyon Planı */}
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Günlük Operasyon Planı</h2>
          <div className="mos-erp-panel__body">
            {plan.map((section, idx) => (
              <div key={section.id} className="mos-erp-plan-section">
                <h3 className="mos-erp-plan-section__title">
                  {idx + 1}. {section.categoryLabel}
                </h3>
                <ul className="mos-erp-list">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <Tag tone={PRIORITY_TONE[item.priority]}>{PRIORITY_LABEL[item.priority]}</Tag>{' '}
                      <strong>{item.title}</strong>
                      {item.detail ? <span className="mos-erp-muted"> — {item.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Yönetici Ajandası */}
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Yönetici Ajandası</h2>
          <table className="mos-erp-tbl">
            <thead>
              <tr>
                <th>Saat</th>
                <th>Odak</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {agenda.map((slot) => (
                <tr key={slot.timeRange + slot.focus}>
                  <td>{slot.timeRange}</td>
                  <td>{slot.focus}</td>
                  <td>{slot.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mos-erp-muted mos-erp-panel__foot">Öneri niteliğindedir; takvim entegrasyonu yok.</p>
        </section>
      </div>

      {/* Öncelik Kuyruğu */}
      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Öncelik Kuyruğu (İlk 20)</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr>
              <th>Öncelik</th>
              <th>Konu</th>
              <th>Neden</th>
              <th>Kaynak</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((p) => (
              <tr key={p.id}>
                <td>
                  <Tag tone={PRIORITY_TONE[p.priority]}>{PRIORITY_LABEL[p.priority]}</Tag>
                </td>
                <td>{p.title}</td>
                <td>{p.reason}</td>
                <td>{p.sourceModule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mos-erp-ops__grid mos-erp-ops__grid--2">
        {/* Etki Analizi */}
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Etki Analizi</h2>
          <div className="mos-erp-panel__body">
            {impacts.map((item) => (
              <div key={item.id} className="mos-erp-impact-block">
                <h3 className="mos-erp-impact-block__title">{item.actionTitle}</h3>
                <p className="mos-erp-muted">{item.actionDescription}</p>
                <table className="mos-erp-tbl mos-erp-tbl--compact">
                  <thead>
                    <tr>
                      <th>Metrik</th>
                      <th>Önce</th>
                      <th>Sonra</th>
                      <th>Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.metrics.map((m) => (
                      <tr key={m.label}>
                        <td>{m.label}</td>
                        <td>{m.before}</td>
                        <td>{m.after}</td>
                        <td>
                          <Tag tone={m.direction === 'UP' ? 'success' : m.direction === 'DOWN' ? 'critical' : 'muted'}>
                            {m.delta}
                          </Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

        {/* Risk Haritası */}
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Risk Haritası</h2>
          <table className="mos-erp-tbl">
            <thead>
              <tr>
                <th>Şiddet</th>
                <th>Risk</th>
                <th>Etki</th>
                <th>Öneri</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Tag tone={SEVERITY_TONE[r.severity]}>{r.severity}</Tag>
                  </td>
                  <td>{r.riskTitle}</td>
                  <td>{r.impact}</td>
                  <td>{r.suggestedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Tavsiye Edilen Aksiyonlar */}
      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Tavsiye Edilen Aksiyonlar</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr>
              <th>Öncelik</th>
              <th>Aksiyon</th>
              <th>Neden</th>
            </tr>
          </thead>
          <tbody>
            {recs.map((r) => (
              <tr key={r.id}>
                <td>
                  <Tag tone={PRIORITY_TONE[r.priority]}>{PRIORITY_LABEL[r.priority]}</Tag>
                </td>
                <td>{r.title}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
