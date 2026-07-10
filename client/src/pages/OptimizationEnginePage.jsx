import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { applyOptimizationEngine, getOptimizationEngine } from '../services/optimizationEngineClient.js'
import '../styles/mos-erp-ops.css'

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

export default function OptimizationEnginePage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [applyMsg, setApplyMsg] = useState(/** @type {string | null} */ (null))

  const load = useCallback(() => {
    setLoading(true)
    return getOptimizationEngine()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message ?? 'Optimizasyon Motoru yüklenemedi')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleApply = () => {
    setApplying(true)
    setError(null)
    setApplyMsg(null)
    applyOptimizationEngine()
      .then((res) => {
        setApplyMsg(`${res.appliedChanges} değişiklik sanal olarak uygulandı (${res.runAt})`)
        setApplying(false)
        return load()
      })
      .catch((err) => {
        setError(err?.message ?? 'Optimizasyon uygulanamadı')
        setApplying(false)
      })
  }

  const metrics = useMemo(() => {
    if (!data) return []
    return [
      {
        id: 'score',
        label: 'Optimization Score',
        value: String(data.optimizationScore),
        valueTone: data.optimizationScore < 55 ? 'critical' : data.optimizationScore < 70 ? 'warning' : 'positive',
      },
      { id: 'decision', label: 'Karar', value: data.optimizationDecision },
      {
        id: 'status',
        label: 'Uygulama',
        value: data.applyStatus,
        valueTone: data.applyStatus === 'APPLIED' ? 'positive' : 'info',
      },
      {
        id: 'changes',
        label: 'Önerilen Değişiklik',
        value: String(data.recommendedChanges?.length ?? 0),
      },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Otonom Optimizasyon Motoru yükleniyor…</p>
      </div>
    )
  }

  const strategies = data?.strategyOptimizations ?? []
  const agents = data?.agentOptimizations ?? []
  const changes = data?.recommendedChanges ?? []
  const briefing = data?.managementBriefing ?? []

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Otonom Optimizasyon Motoru</h1>
          <p className="mos-erp-ops__subtitle">
            Öğrenme → Optimizasyon · {data?.today ?? '—'}
          </p>
        </div>
        <button
          type="button"
          className="mos-erp-btn mos-erp-btn--primary"
          onClick={handleApply}
          disabled={applying}
        >
          {applying ? 'Uygulanıyor…' : 'Optimizasyonu Uygula'}
        </button>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {applyMsg ? <div className="mos-erp-banner mos-erp-banner--success">{applyMsg}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Strateji Optimizasyonu</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr>
              <th>Strateji</th>
              <th>Mevcut</th>
              <th>Önerilen</th>
              <th>Başarı %</th>
              <th>Gerekçe</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((s) => (
              <tr key={s.strategy}>
                <td>{s.strategy}</td>
                <td>{s.currentWeight}</td>
                <td>
                  <Tag tone={s.recommendedWeight > s.currentWeight ? 'positive' : s.recommendedWeight < s.currentWeight ? 'critical' : 'info'}>
                    {s.recommendedWeight}
                  </Tag>
                </td>
                <td>%{s.successRate}</td>
                <td>{s.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Ajan Optimizasyonu</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr>
              <th>Ajan</th>
              <th>Mevcut</th>
              <th>Önerilen</th>
              <th>Başarı %</th>
              <th>Etki</th>
              <th>Gerekçe</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.agent}>
                <td>{a.agent}</td>
                <td>{a.currentWeight}</td>
                <td>{a.recommendedWeight}</td>
                <td>%{a.successRate}</td>
                <td>{a.impactScore}</td>
                <td>{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Önerilen Değişiklikler</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Hedef</th>
              <th>Tür</th>
              <th>Mevcut</th>
              <th>Önerilen</th>
              <th>Etki</th>
              <th>Öncelik</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.id}>
                <td>{c.target}</td>
                <td>{c.targetType}</td>
                <td>{c.currentValue}</td>
                <td>{c.recommendedValue}</td>
                <td>{c.impact}</td>
                <td><Tag tone={c.priority === 'P1' ? 'critical' : c.priority === 'P2' ? 'warning' : 'info'}>{c.priority}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
