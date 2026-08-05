import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getInvestorIntelligence } from '../services/investorIntelligenceClient.js'
import '../styles/mos-erp-ops.css'

const DECISION_TONE = {
  STRONG_BUY: 'positive',
  BUY: 'positive',
  WATCH: 'warning',
  AVOID: 'critical',
  CRITICAL: 'critical',
}

const RATING_TONE = {
  EXCELLENT: 'positive',
  GOOD: 'positive',
  AVERAGE: 'warning',
  WEAK: 'critical',
  CRITICAL: 'critical',
}

const LEVEL_TONE = {
  LOW: 'positive',
  MEDIUM: 'warning',
  HIGH: 'critical',
  CRITICAL: 'critical',
}

const TREND_TONE = {
  FAST_GROWING: 'positive',
  GROWING: 'positive',
  STABLE: 'info',
  DECLINING: 'critical',
}

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

export default function InvestorIntelligencePage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let alive = true
    setLoading(true)
    getInvestorIntelligence()
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Yatırımcı Merkezi yüklenemedi')
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
        label: 'Yatırımcı Skoru',
        value: String(s.investorScore),
        valueTone: s.investorScore < 55 ? 'critical' : s.investorScore < 70 ? 'warning' : 'positive',
      },
      { id: 'band', label: 'Bant', value: s.investorScoreBand },
      { id: 'rating', label: 'Derecelendirme', value: s.companyRating },
      { id: 'decision', label: 'Yatırım Kararı', value: s.investmentDecision },
      { id: 'health', label: 'Sağlık', value: String(s.companyHealthScore) },
      { id: 'future', label: 'Gelecek Skoru', value: String(s.futureScore) },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Yatırımcı Merkezi yükleniyor…</p>
      </div>
    )
  }

  const components = data?.scoreComponents ?? {}
  const readiness = data?.newStoreReadiness ?? { status: '—', reasons: [] }
  const briefing = data?.investorBriefing ?? []
  const recommendations = data?.topRecommendations ?? []

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Yatırımcı Merkezi</h1>
          <p className="mos-erp-ops__subtitle">
            Yatırım analizi · SWOT · {data?.today ?? '—'}
          </p>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yatırımcı Skoru</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Bileşen</th>
              <th>Skor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Genel Yatırımcı Skoru</td>
              <td>
                <strong>{data?.investorScore ?? '—'}</strong> ({data?.summary?.investorScoreBand ?? '—'})
              </td>
            </tr>
            <tr>
              <td>Kârlılık</td>
              <td>{components.profitabilityScore ?? '—'}</td>
            </tr>
            <tr>
              <td>Büyüme</td>
              <td>{components.growthScore ?? '—'}</td>
            </tr>
            <tr>
              <td>Tahsilat</td>
              <td>{components.collectionScore ?? '—'}</td>
            </tr>
            <tr>
              <td>Risk</td>
              <td>{components.riskScore ?? '—'}</td>
            </tr>
            <tr>
              <td>Nakit Akış</td>
              <td>{components.cashFlowScore ?? '—'}</td>
            </tr>
            <tr>
              <td>Stabilite</td>
              <td>{components.stabilityScore ?? '—'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yatırım Kararı &amp; Derecelendirme</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Metrik</th>
              <th>Değer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Yatırım Kararı</td>
              <td>
                <Tag tone={DECISION_TONE[data?.investmentDecision]}>{data?.investmentDecision ?? '—'}</Tag>
              </td>
            </tr>
            <tr>
              <td>Şirket Derecelendirmesi</td>
              <td>
                <Tag tone={RATING_TONE[data?.companyRating]}>{data?.companyRating ?? '—'}</Tag>
              </td>
            </tr>
            <tr>
              <td>Büyüme Potansiyeli</td>
              <td>
                <Tag tone={LEVEL_TONE[data?.growthPotential]}>{data?.growthPotential ?? '—'}</Tag>
              </td>
            </tr>
            <tr>
              <td>Finansman İhtiyacı</td>
              <td>
                <Tag tone={LEVEL_TONE[data?.financingNeed]}>{data?.financingNeed ?? '—'}</Tag>
              </td>
            </tr>
            <tr>
              <td>Yatırım Riski</td>
              <td>
                <Tag tone={LEVEL_TONE[data?.investmentRisk]}>{data?.investmentRisk ?? '—'}</Tag>
              </td>
            </tr>
            <tr>
              <td>Değerleme Trendi</td>
              <td>
                <Tag tone={TREND_TONE[data?.valuationTrend]}>{data?.valuationTrend ?? '—'}</Tag>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yeni Mağaza Hazırlığı</h2>
        <p>
          Durum:{' '}
          <Tag tone={readiness.status === 'READY' ? 'positive' : readiness.status === 'PARTIAL' ? 'warning' : 'critical'}>
            {readiness.status ?? '—'}
          </Tag>
        </p>
        <ul className="mos-erp-panel__body">
          {(readiness.reasons ?? []).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">SWOT Analizi</h2>
        <div className="mos-erp-panel__grid">
          <div className="mos-erp-panel__section">
            <h3 className="mos-erp-panel__subtitle">Güçlü Yönler ({data?.strengths?.length ?? 0})</h3>
            <ol className="mos-erp-panel__body">
              {(data?.strengths ?? []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
          <div className="mos-erp-panel__section">
            <h3 className="mos-erp-panel__subtitle">Zayıf Yönler ({data?.weaknesses?.length ?? 0})</h3>
            <ol className="mos-erp-panel__body">
              {(data?.weaknesses ?? []).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ol>
          </div>
          <div className="mos-erp-panel__section">
            <h3 className="mos-erp-panel__subtitle">Fırsatlar ({data?.opportunities?.length ?? 0})</h3>
            <ol className="mos-erp-panel__body">
              {(data?.opportunities ?? []).map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ol>
          </div>
          <div className="mos-erp-panel__section">
            <h3 className="mos-erp-panel__subtitle">Tehditler ({data?.threats?.length ?? 0})</h3>
            <ol className="mos-erp-panel__body">
              {(data?.threats ?? []).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yatırımcı Brifingi</h2>
        {briefing.map((p, i) => (
          <p key={i} className="mos-erp-panel__body">
            {p}
          </p>
        ))}
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Top 10 Öneriler</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>#</th>
              <th>Kategori</th>
              <th>Öneri</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((r) => (
              <tr key={r.id}>
                <td>{r.priority}</td>
                <td>{r.category}</td>
                <td>{r.title}</td>
                <td>{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
