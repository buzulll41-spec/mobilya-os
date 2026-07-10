import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getEnterpriseFutureEngine } from '../services/futureEngineClient.js'
import '../styles/mos-erp-ops.css'

const VERDICT_TONE = { RECOMMENDED: 'positive', NEUTRAL: 'warning', AVOID: 'critical' }

export default function FutureEnginePage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [horizon, setHorizon] = useState(365)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getEnterpriseFutureEngine()
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Gelecek motoru yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const metrics = useMemo(() => {
    if (!data?.summary) return []
    const s = data.summary
    return [
      {
        id: 'score',
        label: 'Gelecek Skoru',
        value: String(s.futureScore),
        valueTone: s.futureScore < 55 ? 'critical' : s.futureScore < 70 ? 'warning' : 'positive',
      },
      { id: 'band', label: 'Bant', value: s.futureScoreBand },
      { id: 'best', label: 'En İyi', value: s.bestScenarioId },
      { id: 'worst', label: 'En Kötü', value: s.worstScenarioId },
      { id: 'ceo', label: 'CEO', value: s.ceoDecision },
      { id: 'chairman', label: 'Başkan', value: s.chairmanDecision },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Kurumsal Gelecek Motoru yükleniyor…</p>
      </div>
    )
  }

  const scenarios = data?.scenarios ?? []
  const best = data?.bestScenario
  const worst = data?.worstScenario
  const briefing = data?.managementBriefing ?? []

  function metricsAt(s, days) {
    return s.horizons?.find((h) => h.days === days)?.metrics
  }

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Kurumsal Gelecek Motoru</h1>
          <p className="mos-erp-ops__subtitle">
            6 senaryo × 4 ufuk (30/90/180/365 gün) · {data?.today ?? '—'}
          </p>
        </div>
        <div className="mos-erp-form-inline">
          <label className="mos-erp-field">
            <span className="mos-erp-field__label">Ufuk</span>
            <select className="mos-erp-input" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
              <option value={30}>30 gün</option>
              <option value={90}>90 gün</option>
              <option value={180}>180 gün</option>
              <option value={365}>365 gün</option>
            </select>
          </label>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Senaryo Tablosu ({horizon} gün)</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Senaryo</th>
              <th>Karar</th>
              <th>Ciro</th>
              <th>Kâr</th>
              <th>Nakit</th>
              <th>Risk</th>
              <th>Tahsilat %</th>
              <th>Sağlık</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => {
              const m = metricsAt(s, horizon)
              if (!m) return null
              return (
                <tr key={s.scenarioId}>
                  <td>{s.scenarioName}</td>
                  <td>
                    <span className={`mos-erp-tag mos-erp-tag--${VERDICT_TONE[s.verdict]}`}>{s.verdictLabel}</span>
                  </td>
                  <td>{m.revenue}</td>
                  <td>{m.profit}</td>
                  <td>{m.cashFlow}</td>
                  <td>{m.risk}</td>
                  <td>{m.collectionRate}</td>
                  <td>{m.companyHealth}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">En İyi / En Kötü Senaryo (365 gün)</h2>
        <div className="mos-erp-panel__grid">
          {best ? (
            <div className="mos-erp-panel__section">
              <h3 className="mos-erp-panel__subtitle">En İyi: {best.scenarioName}</h3>
              <p className="mos-erp-muted">{best.basis}</p>
              <p>
                Sağlık: {metricsAt(best, 365)?.companyHealth} · {best.verdictLabel}
              </p>
            </div>
          ) : null}
          {worst ? (
            <div className="mos-erp-panel__section">
              <h3 className="mos-erp-panel__subtitle">En Kötü: {worst.scenarioName}</h3>
              <p className="mos-erp-muted">{worst.basis}</p>
              <p>
                Sağlık: {metricsAt(worst, 365)?.companyHealth} · {worst.verdictLabel}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yönetim Brifingi</h2>
        {briefing.map((p, i) => (
          <p key={i} className="mos-erp-panel__body">
            {p}
          </p>
        ))}
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Karar Paneli</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Senaryo</th>
              <th>Öneri</th>
              <th>Sevk Yükü</th>
              <th>Personel Yükü</th>
              <th>Tedarikçi Risk</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => {
              const m = metricsAt(s, 365)
              if (!m) return null
              return (
                <tr key={s.scenarioId}>
                  <td>{s.scenarioName}</td>
                  <td>
                    <span className={`mos-erp-tag mos-erp-tag--${VERDICT_TONE[s.verdict]}`}>{s.verdictLabel}</span>
                  </td>
                  <td>{m.shipmentLoad}</td>
                  <td>{m.staffLoad}</td>
                  <td>{m.supplierRisk}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
