import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getGoalEngine, updateGoalProgress } from '../services/goalEngineClient.js'
import '../styles/mos-erp-ops.css'

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

function statusTone(status) {
  if (status === 'ACHIEVED' || status === 'ON_TRACK') return 'positive'
  if (status === 'AT_RISK') return 'warning'
  return 'critical'
}

function trendTone(trend) {
  if (trend === 'UP') return 'positive'
  if (trend === 'DOWN') return 'critical'
  return 'info'
}

export default function GoalEnginePage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(/** @type {string | null} */ (null))
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const load = useCallback(() => {
    setLoading(true)
    return getGoalEngine()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message ?? 'Hedef Motoru yüklenemedi')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleUpdate = (goalId) => {
    setUpdatingId(goalId)
    setError(null)
    updateGoalProgress(goalId)
      .then(() => load())
      .catch((err) => setError(err?.message ?? 'Hedef güncellenemedi'))
      .finally(() => setUpdatingId(null))
  }

  const metrics = useMemo(() => {
    if (!data) return []
    return [
      {
        id: 'score',
        label: 'Goal Score',
        value: String(data.goalScore),
        valueTone: data.goalScore < 55 ? 'critical' : data.goalScore < 70 ? 'warning' : 'positive',
      },
      { id: 'decision', label: 'Goal Decision', value: data.goalDecision },
      { id: 'goals', label: 'Aktif Hedef', value: String(data.activeGoals?.length ?? 0) },
      { id: 'risks', label: 'Risk', value: String(data.goalRisks?.length ?? 0) },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Otonom Hedef Motoru yükleniyor…</p>
      </div>
    )
  }

  const goals = data?.activeGoals ?? []
  const progress = data?.goalProgress ?? []
  const risks = data?.goalRisks ?? []
  const opportunities = data?.goalOpportunities ?? []
  const briefing = data?.managementBriefing ?? []

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Otonom Hedef Motoru</h1>
          <p className="mos-erp-ops__subtitle">
            Optimizasyon → Hedef · {data?.today ?? '—'}
          </p>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Aktif Hedefler</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr>
              <th>Hedef</th>
              <th>Kategori</th>
              <th>Öncelik</th>
              <th>Mevcut</th>
              <th>Hedef</th>
              <th>İlerleme</th>
              <th>Durum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {goals.map((g) => (
              <tr key={g.id}>
                <td>{g.title}</td>
                <td>{g.category}</td>
                <td><Tag tone={g.priority === 'P1' ? 'critical' : g.priority === 'P2' ? 'warning' : 'info'}>{g.priority}</Tag></td>
                <td>{g.currentValue}</td>
                <td>{g.targetValue}</td>
                <td>%{g.progressPercent}</td>
                <td><Tag tone={statusTone(g.status)}>{g.status}</Tag></td>
                <td>
                  <button
                    type="button"
                    className="mos-erp-btn mos-erp-btn--ghost"
                    disabled={updatingId === g.id}
                    onClick={() => handleUpdate(g.id)}
                  >
                    {updatingId === g.id ? '…' : 'İlerlet'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Hedef İlerlemesi</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Hedef</th>
              <th>Başlangıç</th>
              <th>Mevcut</th>
              <th>Hedef</th>
              <th>İlerleme</th>
              <th>Tahmini</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {progress.map((p) => (
              <tr key={p.goalId}>
                <td>{p.goalId}</td>
                <td>{p.startValue}</td>
                <td>{p.currentValue}</td>
                <td>{p.targetValue}</td>
                <td>%{p.progressPercent}</td>
                <td>{p.estimatedCompletion}</td>
                <td><Tag tone={trendTone(p.trend)}>{p.trend}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mos-erp-ops__grid mos-erp-ops__grid--2">
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Hedef Riskleri</h2>
          <table className="mos-erp-tbl mos-erp-tbl--compact">
            <thead>
              <tr>
                <th>Şiddet</th>
                <th>Hedef</th>
                <th>Etki</th>
                <th>Öneri</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.id}>
                  <td><Tag tone={r.severity === 'HIGH' ? 'critical' : r.severity === 'MEDIUM' ? 'warning' : 'info'}>{r.severity}</Tag></td>
                  <td>{r.goal}</td>
                  <td>{r.impact}</td>
                  <td>{r.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Hedef Fırsatları</h2>
          <table className="mos-erp-tbl mos-erp-tbl--compact">
            <thead>
              <tr>
                <th>Hedef</th>
                <th>Fırsat</th>
                <th>Etki</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.id}>
                  <td>{o.goal}</td>
                  <td>{o.opportunity}</td>
                  <td>{o.expectedImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yönetici Özeti</h2>
        <ol className="mos-erp-prose">
          {briefing.map((item, i) => (
            <li key={`brief-${i}`}>{item}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
