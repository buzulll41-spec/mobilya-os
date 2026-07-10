import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getPerformanceFeedback } from '../services/performanceFeedbackClient.js'
import '../styles/mos-erp-ops.css'

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

export default function PerformanceFeedbackPage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let alive = true
    setLoading(true)
    getPerformanceFeedback()
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Performans Takip Motoru yüklenemedi')
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
        id: 'score',
        label: 'Feedback Score',
        value: String(data.feedbackScore),
        valueTone: data.feedbackScore < 55 ? 'critical' : data.feedbackScore < 70 ? 'warning' : 'positive',
      },
      { id: 'strategy', label: 'Aktif Strateji', value: data.activeStrategy },
      {
        id: 'top',
        label: 'En Başarılı',
        value: data.successfulStrategies?.[0]?.strategy ?? '—',
      },
      {
        id: 'topRate',
        label: 'En Yüksek Oran',
        value: data.successfulStrategies?.[0] ? `%${data.successfulStrategies[0].successRate}` : '—',
      },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Performans Takip Motoru yükleniyor…</p>
      </div>
    )
  }

  const impact = data?.impactAnalysis
  const successful = data?.successfulStrategies ?? []
  const failed = data?.failedStrategies ?? []
  const lessons = data?.lessonsLearned ?? []
  const allPerf = data?.strategyPerformance ?? []

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Otonom Performans Takip Motoru</h1>
          <p className="mos-erp-ops__subtitle">
            Karar → Aksiyon → Sonuç Ölçümü · {data?.today ?? '—'}
          </p>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Öneri</h2>
        <p className="mos-erp-prose">{data?.recommendation}</p>
      </section>

      {impact ? (
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Etki Analizi</h2>
          <table className="mos-erp-tbl mos-erp-tbl--compact">
            <thead>
              <tr>
                <th>Boyut</th>
                <th>Etki</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Tahsilat</td><td>{impact.collectionImpact > 0 ? '+' : ''}{impact.collectionImpact}</td></tr>
              <tr><td>Kâr</td><td>{impact.profitImpact > 0 ? '+' : ''}{impact.profitImpact}</td></tr>
              <tr><td>Risk</td><td>{impact.riskImpact > 0 ? '+' : ''}{impact.riskImpact}</td></tr>
              <tr><td>Sevk</td><td>{impact.shipmentImpact > 0 ? '+' : ''}{impact.shipmentImpact}</td></tr>
              <tr><td>Operasyon</td><td>{impact.operationsImpact > 0 ? '+' : ''}{impact.operationsImpact}</td></tr>
            </tbody>
          </table>
          <p className="mos-erp-muted" style={{ marginTop: '0.75rem' }}>{impact.summary}</p>
        </section>
      ) : null}

      <div className="mos-erp-ops__grid mos-erp-ops__grid--2">
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Başarılı Stratejiler</h2>
          <table className="mos-erp-tbl mos-erp-tbl--compact">
            <thead>
              <tr>
                <th>Strateji</th>
                <th>Başarı %</th>
                <th>Uygulama</th>
              </tr>
            </thead>
            <tbody>
              {successful.map((s) => (
                <tr key={`ok-${s.strategy}`}>
                  <td>{s.strategy}</td>
                  <td><Tag tone="positive">%{s.successRate}</Tag></td>
                  <td>{s.executionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Başarısız Stratejiler</h2>
          <table className="mos-erp-tbl mos-erp-tbl--compact">
            <thead>
              <tr>
                <th>Strateji</th>
                <th>Başarı %</th>
                <th>Uygulama</th>
              </tr>
            </thead>
            <tbody>
              {failed.map((s) => (
                <tr key={`fail-${s.strategy}`}>
                  <td>{s.strategy}</td>
                  <td><Tag tone={s.successRate < 50 ? 'critical' : 'warning'}>%{s.successRate}</Tag></td>
                  <td>{s.executionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Tüm Strateji Performansı</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr>
              <th>Strateji</th>
              <th>Başarı %</th>
              <th>Uygulama</th>
              <th>Ort. Etki</th>
            </tr>
          </thead>
          <tbody>
            {allPerf.map((p) => (
              <tr key={p.strategy}>
                <td>{p.strategy}</td>
                <td>%{p.successRate}</td>
                <td>{p.executionCount}</td>
                <td>{p.avgImpact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Öğrenilen Dersler</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr>
              <th>Strateji</th>
              <th>Ders</th>
              <th>Oran</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.strategy}>
                <td>{l.strategy}</td>
                <td>{l.lesson}</td>
                <td>%{l.successRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
