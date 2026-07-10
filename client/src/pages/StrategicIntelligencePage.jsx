import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getStrategicIntelligence } from '../services/strategicIntelligenceClient.js'
import '../styles/mos-erp-ops.css'

const TREND_LABEL = { UP: '↑', DOWN: '↓', FLAT: '→' }
const SEVERITY_TONE = { CRITICAL: 'critical', WARNING: 'warning', INFO: 'info' }
const PRIORITY_TONE = { HIGH: 'critical', MEDIUM: 'warning', LOW: 'info' }
const CAT_LABEL = {
  GROWTH: 'Büyüme',
  RISK: 'Risk',
  SUPPLIER: 'Tedarikçi',
  SALES: 'Satış',
  OPERATIONS: 'Operasyon',
  FINANCE: 'Finans',
}

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

export default function StrategicIntelligencePage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let alive = true
    setLoading(true)
    getStrategicIntelligence()
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Stratejik Karar Merkezi yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const metrics = useMemo(() => {
    if (!data?.summary) return []
    const s = data.summary
    const h = data.companyHealth
    return [
      { id: 'health', label: 'Şirket Sağlığı', value: String(s.companyHealthScore), valueTone: s.companyHealthScore < 55 ? 'critical' : 'warning' },
      { id: 'band', label: 'Bant', value: s.companyHealthBand },
      { id: 'growth', label: 'En Hızlı Büyüme', value: s.topGrowthLabel ?? '—' },
      { id: 'risk', label: 'Ana Risk', value: s.topRiskLabel ?? '—', valueTone: 'critical' },
      { id: 'recs', label: 'Öneri', value: String(s.recommendationCount) },
      { id: 'trend', label: 'Trend', value: h?.trendLabel ?? '—' },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Stratejik Karar Merkezi yükleniyor…</p>
      </div>
    )
  }

  const growth = data?.growthAnalysis
  const product = data?.profitabilityAnalysis
  const suppliers = data?.supplierAnalysis
  const sales = data?.salesPersonAnalysis
  const risks = data?.riskForecast?.items ?? []
  const briefing = data?.boardBriefing
  const recs = data?.recommendations ?? []
  const health = data?.companyHealth

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Stratejik Karar Merkezi</h1>
          <p className="mos-erp-ops__subtitle">
            3–12 ay stratejik görünüm — {data?.today ?? '—'}
          </p>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Şirket Sağlık Endeksi</h2>
        {health ? (
          <table className="mos-erp-tbl mos-erp-tbl--compact">
            <thead>
              <tr>
                <th>Bileşen</th>
                <th>Skor</th>
                <th>Ağırlık</th>
                <th>Katkı</th>
              </tr>
            </thead>
            <tbody>
              {health.breakdown.map((c) => (
                <tr key={c.id}>
                  <td>{c.label}</td>
                  <td>{c.score}</td>
                  <td>%{c.weight}</td>
                  <td>{c.weighted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yönetim Kurulu Brifingi</h2>
        {briefing ? (
          <div className="mos-erp-panel__body">
            <p className="mos-erp-lead">{briefing.headline}</p>
            <p><strong>Fırsat:</strong> {briefing.biggestOpportunity}</p>
            <p><strong>Risk:</strong> {briefing.biggestRisk}</p>
            <p><strong>Çeyrek odağı:</strong> {briefing.nextQuarterFocus}</p>
          </div>
        ) : null}
      </section>

      <div className="mos-erp-ops__grid mos-erp-ops__grid--2">
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Büyüme Analizi</h2>
          <table className="mos-erp-tbl">
            <thead>
              <tr>
                <th>Kaynak</th>
                <th>Değişim</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {(growth?.sourceTrends ?? []).slice(0, 8).map((g) => (
                <tr key={g.key}>
                  <td>{g.label}</td>
                  <td>%{g.changePct}</td>
                  <td>{TREND_LABEL[g.trend] ?? g.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Kârlılık Özeti</h2>
          {product ? (
            <table className="mos-erp-tbl mos-erp-tbl--compact">
              <tbody>
                <tr><td>Ciro</td><td>{product.monthRevenue} ₺</td></tr>
                <tr><td>Brüt Kâr</td><td>{product.monthGrossProfit} ₺</td></tr>
                <tr><td>Marj</td><td>%{product.profitMarginPct}</td></tr>
                <tr><td>Riskli Alacak</td><td>{product.riskyReceivable} ₺</td></tr>
                <tr><td>En Kârlı Kaynak</td><td>{product.mostProfitableSource ?? '—'}</td></tr>
              </tbody>
            </table>
          ) : null}
        </section>
      </div>

      <div className="mos-erp-ops__grid mos-erp-ops__grid--2">
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Tedarikçi Performansı</h2>
          <table className="mos-erp-tbl">
            <thead>
              <tr><th>Tedarikçi</th><th>Skor</th><th>Risk</th></tr>
            </thead>
            <tbody>
              {(suppliers?.supplierScoreboard ?? []).map((s) => (
                <tr key={s.key}>
                  <td>{s.label}</td>
                  <td>{s.score}</td>
                  <td><Tag tone={s.riskLevel === 'HIGH' ? 'critical' : s.riskLevel === 'MEDIUM' ? 'warning' : 'success'}>{s.riskLevel}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Personel Performansı</h2>
          <table className="mos-erp-tbl">
            <thead>
              <tr><th>Personel</th><th>Skor</th><th>Hedef %</th></tr>
            </thead>
            <tbody>
              {(sales?.salesScoreboard ?? []).map((p) => (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  <td>{p.score}</td>
                  <td>%{p.achievementPct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">90 Günlük Risk Tahmini</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr><th>Şiddet</th><th>Risk</th><th>Açıklama</th><th>Önlem</th></tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id}>
                <td><Tag tone={SEVERITY_TONE[r.severity]}>{r.severity}</Tag></td>
                <td>{r.riskTitle}</td>
                <td>{r.description}</td>
                <td>{r.mitigation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Stratejik Öneriler</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr><th>Öncelik</th><th>Kategori</th><th>Öneri</th><th>Neden</th></tr>
          </thead>
          <tbody>
            {recs.map((r) => (
              <tr key={r.id}>
                <td><Tag tone={PRIORITY_TONE[r.priority]}>{r.priority}</Tag></td>
                <td>{CAT_LABEL[r.category] ?? r.category}</td>
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
