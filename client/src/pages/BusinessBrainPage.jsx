import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getBusinessBrain } from '../services/businessBrainClient.js'
import '../styles/mos-erp-ops.css'

const DECISION_TONE = {
  COLLECTION_FIRST: 'warning',
  AGGRESSIVE_GROWTH: 'positive',
  CONTROLLED_GROWTH: 'positive',
  DEFENSIVE_MODE: 'critical',
  STORE_EXPANSION: 'positive',
  SUPPLIER_RESTRUCTURE: 'warning',
  COST_REDUCTION: 'critical',
  PROFITABILITY_RECOVERY: 'warning',
  INVESTMENT_WINDOW: 'positive',
  WAIT_AND_MONITOR: 'info',
}

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

export default function BusinessBrainPage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let alive = true
    setLoading(true)
    getBusinessBrain()
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Otonom İşletme Beyni yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const metrics = useMemo(() => {
    if (!data) return []
    return [
      {
        id: 'brain',
        label: 'Brain Score',
        value: String(data.brainScore),
        valueTone: data.brainScore < 55 ? 'critical' : data.brainScore < 70 ? 'warning' : 'positive',
      },
      { id: 'decision', label: 'Ana Karar', value: data.primaryDecision },
      { id: 'ops', label: 'Operasyon', value: String(data.operationsScore) },
      { id: 'fin', label: 'Finans', value: String(data.financeScore) },
      { id: 'growth', label: 'Büyüme', value: String(data.growthScore) },
      { id: 'risk', label: 'Risk', value: String(data.riskScore) },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Otonom İşletme Beyni yükleniyor…</p>
      </div>
    )
  }

  const subScores = [
    { label: 'Operasyon', value: data?.operationsScore },
    { label: 'Finans', value: data?.financeScore },
    { label: 'Büyüme', value: data?.growthScore },
    { label: 'Risk', value: data?.riskScore },
    { label: 'Gelecek', value: data?.futureScore },
    { label: 'Yatırım', value: data?.investmentScore },
  ]

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Otonom İşletme Beyni</h1>
          <p className="mos-erp-ops__subtitle">
            Merkezi karar sentezi · Bugün ne yapmalıyız? · {data?.today ?? '—'}
          </p>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Ana Karar</h2>
        <Tag tone={DECISION_TONE[data?.primaryDecision] ?? 'info'}>{data?.primaryDecision ?? '—'}</Tag>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Alt Skorlar</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Boyut</th>
              <th>Skor</th>
            </tr>
          </thead>
          <tbody>
            {subScores.map((s) => (
              <tr key={s.label}>
                <td>{s.label}</td>
                <td>{s.value ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Bugün Yapılacaklar</h2>
        <ol className="mos-erp-list">
          {(data?.todayActions ?? []).map((a, i) => (
            <li key={`today-${i}`}>{a}</li>
          ))}
        </ol>
      </section>

      <div className="mos-erp-ops__grid mos-erp-ops__grid--2">
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">30 Gün Planı</h2>
          <ol className="mos-erp-list">
            {(data?.plan30Days ?? []).map((p, i) => (
              <li key={`30-${i}`}>{p}</li>
            ))}
          </ol>
        </section>
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">90 Gün Planı</h2>
          <ol className="mos-erp-list">
            {(data?.plan90Days ?? []).map((p, i) => (
              <li key={`90-${i}`}>{p}</li>
            ))}
          </ol>
        </section>
      </div>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">365 Gün Planı</h2>
        <ol className="mos-erp-list">
          {(data?.plan365Days ?? []).map((p, i) => (
            <li key={`365-${i}`}>{p}</li>
          ))}
        </ol>
      </section>

      <div className="mos-erp-ops__grid mos-erp-ops__grid--2">
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">En Büyük Riskler</h2>
          <ul className="mos-erp-list">
            {(data?.topRisks ?? []).map((r, i) => (
              <li key={`risk-${i}`}>{r}</li>
            ))}
          </ul>
        </section>
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">En Büyük Fırsatlar</h2>
          <ul className="mos-erp-list">
            {(data?.topOpportunities ?? []).map((o, i) => (
              <li key={`opp-${i}`}>{o}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yönetim Brifingi</h2>
        <ol className="mos-erp-list">
          {(data?.managementBriefing ?? []).map((b, i) => (
            <li key={`brief-${i}`}>{b}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
