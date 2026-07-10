import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getCeoIntelligence } from '../services/ceoIntelligenceClient.js'
import '../styles/mos-erp-ops.css'

const SEVERITY_TONE = { CRITICAL: 'critical', WARNING: 'warning', INFO: 'info' }

const CEO_HEADLINE = {
  FOCUS_COLLECTION: 'Önümüzdeki 90 gün boyunca tahsilata odaklan.',
  FOCUS_GROWTH: 'Önümüzdeki 90 gün boyunca kontrollü büyümeyi hızlandır.',
  FOCUS_PROFITABILITY: 'Önümüzdeki 90 gün boyunca kârlılık ve marj optimizasyonuna odaklan.',
  FOCUS_OPERATIONS: 'Önümüzdeki 90 gün boyunca operasyon disiplinini güçlendir.',
  FOCUS_RISK_REDUCTION: 'Önümüzdeki 90 gün boyunca risk azaltma programını uygula.',
  OPEN_NEW_STORE: 'Yeni mağaza yatırımını onayla; sevk kapasitesini planla.',
  DELAY_NEW_STORE: 'Yeni mağaza açılışını 90 gün ertele; nakit akışını koru.',
  HIRE_SALES_TEAM: 'Satış ekibini kademeli büyüt; hedef ve eğitim planı hazırla.',
  INCREASE_CAPACITY: 'Sevk ve operasyon kapasitesini artır; gecikmeleri azalt.',
  OPTIMIZE_SUPPLIERS: 'Tedarikçi portföyünü optimize et; maliyet ve teslim performansını iyileştir.',
}

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

export default function CeoIntelligencePage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let alive = true
    setLoading(true)
    getCeoIntelligence()
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Otonom CEO raporu yüklenemedi')
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
        label: 'CEO Skoru',
        value: String(s.ceoScore),
        valueTone: s.ceoScore < 55 ? 'critical' : s.ceoScore < 70 ? 'warning' : 'positive',
      },
      { id: 'band', label: 'Bant', value: s.ceoScoreBand },
      { id: 'health', label: 'Şirket Sağlığı', value: String(s.companyHealthScore) },
      { id: 'board', label: 'Kurul Skoru', value: String(s.boardScore) },
      { id: 'decision', label: 'CEO Kararı', value: s.ceoDecision },
      { id: 'sources', label: 'Kaynak', value: String(s.sourcesRead) },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Otonom CEO yükleniyor…</p>
      </div>
    )
  }

  const headline = CEO_HEADLINE[data?.ceoDecision] ?? data?.ceoDecision ?? '—'
  const reasons = data?.ceoReason ?? []
  const problems = data?.topProblems ?? []
  const opportunities = data?.topOpportunities ?? []
  const actions = data?.todayActions ?? []
  const plan30 = data?.next30Days ?? []
  const plan90 = data?.next90Days ?? []

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Otonom CEO</h1>
          <p className="mos-erp-ops__subtitle">
            Nihai karar mercii — 12 faz sentezi · {data?.today ?? '—'}
          </p>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">CEO Skoru</h2>
        <p className="mos-erp-panel__body">
          CEO skoru: <strong>{data?.ceoScore ?? '—'}</strong> ({data?.summary?.ceoScoreBand ?? '—'})
          {' · '}
          Kurul: {data?.summary?.boardDecision ?? '—'} ({data?.summary?.boardScore ?? '—'})
        </p>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">CEO Kararı</h2>
        <p className="mos-erp-ops__decision-headline">{headline}</p>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">CEO Gerekçesi</h2>
        <ol className="mos-erp-panel__body">
          {reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ol>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">En Büyük Problemler</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Problem</th>
              <th>Önem</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>
                  <Tag tone={SEVERITY_TONE[p.severity]}>{p.severity}</Tag>
                </td>
                <td>{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">En Büyük Fırsatlar</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Fırsat</th>
              <th>Etki</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => (
              <tr key={o.id}>
                <td>{o.title}</td>
                <td>{o.impact}</td>
                <td>{o.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Bugün CEO Ne Yapardı?</h2>
        <ol className="mos-erp-panel__body">
          {actions.map((action, i) => (
            <li key={i}>{action}</li>
          ))}
        </ol>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">30 Günlük Plan</h2>
        <ul className="mos-erp-panel__body">
          {plan30.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">90 Günlük Plan</h2>
        <ul className="mos-erp-panel__body">
          {plan90.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
