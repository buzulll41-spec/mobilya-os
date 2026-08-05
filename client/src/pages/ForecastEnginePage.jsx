import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { SALES_SOURCE_TYPE_OPTIONS } from '../constants/productSource.js'
import { getForecastEngine } from '../services/forecastEngineClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import '../styles/mos-erp-ops.css'

const TL = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })
const fmtTL = (s) => {
  const n = Number.parseFloat(s)
  return TL.format(Number.isFinite(n) ? n : 0)
}
const fmtPct = (n) => `%${(Math.round((n ?? 0) * 10) / 10).toLocaleString('tr-TR')}`

const TREND_LABEL = { UP: 'Artıyor', DOWN: 'Azalıyor', FLAT: 'Sabit' }
const TREND_SYMBOL = { UP: '▲', DOWN: '▼', FLAT: '■' }
const TREND_CLASS = { UP: 'up', DOWN: 'down', FLAT: 'flat' }
const INTENSITY_LABEL = { LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek' }
const STAFF_LABEL = { HEDEF_ALTINDA: 'Hedef altında', HEDEFE_YAKIN: 'Hedefe yakın', HEDEF_USTU: 'Hedef üstü' }
const STAFF_TONE = { HEDEF_ALTINDA: 'is-critical', HEDEFE_YAKIN: 'is-warning', HEDEF_USTU: 'is-success' }

function Trend({ value }) {
  return (
    <span className={`mos-erp-trend mos-erp-trend--${TREND_CLASS[value] ?? 'flat'}`}>
      {TREND_SYMBOL[value] ?? '■'} {TREND_LABEL[value] ?? value}
    </span>
  )
}

function ForecastPanel({ title, projection, tone }) {
  return (
    <div className="mos-erp-panel">
      <h2 className="mos-erp-panel__title">{title}</h2>
      <div className="mos-erp-forecast__big">
        <span className="mos-erp-kv__label">Ay sonu tahmini</span>
        <span className={`mos-erp-forecast__big-value${tone ? ` mos-erp-kv__value--${tone}` : ''}`}>{fmtTL(projection.projected)}</span>
      </div>
      <div className="mos-erp-kv">
        <span className="mos-erp-kv__label">Bugüne kadar</span>
        <span className="mos-erp-kv__value">{fmtTL(projection.current)}</span>
      </div>
      <div className="mos-erp-kv">
        <span className="mos-erp-kv__label">Günlük hız</span>
        <span className="mos-erp-kv__value">{fmtTL(projection.dailyRate)}</span>
      </div>
      <span className="mos-erp-forecast__basis">{projection.basis}</span>
    </div>
  )
}

const EMPTY_FILTERS = { month: '', salesPerson: '', salesSourceType: '' }

export default function ForecastEnginePage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const limitedView = useMemo(() => {
    const role = getCurrentAuthUser()?.role
    return role === 'SALES' || role === 'sales'
  }, [])

  const queryKey = JSON.stringify({ ...filters, limitedView })
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    if (limitedView) query.limitedView = 'true'
    getForecastEngine(query)
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Tahmin yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [queryKey, filters, limitedView])

  function set(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const s = data?.summary ?? null
  const summaryMetrics = useMemo(() => {
    if (!s) return []
    return [
      { id: 'rev', label: 'Ay Sonu Ciro', value: fmtTL(s.monthRevenueProjected) },
      { id: 'gross', label: 'Ay Sonu Brüt Kâr', value: fmtTL(s.monthGrossProfitProjected), valueTone: 'success' },
      { id: 'realized', label: 'Gerçekleşen Kâr', value: fmtTL(s.monthRealizedProfitProjected) },
      { id: 'collection', label: 'Tahsilat', value: fmtTL(s.monthCollectionProjected) },
      { id: 'open', label: 'Açık Bakiye', value: fmtTL(s.monthOpenBalanceProjected), valueTone: 'warning' },
      { id: 'risky', label: 'Riskli Alacak', value: fmtTL(s.riskyReceivableProjected), valueTone: 'critical' },
      { id: 'target', label: 'Hedef Gerçekleşme', value: fmtPct(s.targetAchievementPct) },
      { id: 'days', label: 'Ay İlerlemesi', value: `${s.elapsedDays}/${s.totalDays} gün` },
    ]
  }, [s])

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Tahmin Motoru</h1>
          <span className="mos-erp-ops__sub">
            Bu gidişle ne olacak? · Açıklanabilir formül tabanlı tahminler{data?.today ? ` · ${data.today}` : ''}
          </span>
        </div>
      </header>

      <ErpOpsSummaryStrip metrics={summaryMetrics} ariaLabel="Tahmin özeti" summaryClassName="mos-erp-summary--cols-8" />

      <div className="mos-erp-cockpit-filters" aria-label="Tahmin filtreleri">
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="fc-month">Ay</label>
          <input id="fc-month" type="month" className="mos-erp-filters__field" value={filters.month} onChange={(e) => set('month', e.target.value)} />
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="fc-person">Satış personeli</label>
          <input id="fc-person" type="text" className="mos-erp-filters__field" placeholder="Tümü" value={filters.salesPerson} onChange={(e) => set('salesPerson', e.target.value)} disabled={limitedView} />
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="fc-source">Satış kaynağı</label>
          <select id="fc-source" className="mos-erp-filters__field" value={filters.salesSourceType} onChange={(e) => set('salesSourceType', e.target.value)}>
            <option value="">Tümü</option>
            {SALES_SOURCE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">Yükleniyor…</span></div>}
      {!loading && error && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">{error}</span></div>}

      {!loading && !error && data && (
        <>
          <div className="mos-erp-cockpit-grid">
            <ForecastPanel title="Satış Tahmini" projection={data.salesForecast} />
            <ForecastPanel title="Brüt Kâr Tahmini" projection={data.profitForecast.gross} tone="success" />
            <ForecastPanel title="Gerçekleşen Kâr Tahmini" projection={data.profitForecast.realized} tone="success" />
            <ForecastPanel title="Tahsilat Tahmini" projection={data.collectionForecast} />
            <ForecastPanel title="Açık Bakiye Tahmini" projection={data.openBalanceForecast} tone="warning" />
            <div className="mos-erp-panel">
              <h2 className="mos-erp-panel__title">Risk Tahmini</h2>
              <div className="mos-erp-forecast__big">
                <span className="mos-erp-kv__label">Beklenen riskli alacak</span>
                <span className="mos-erp-forecast__big-value mos-erp-kv__value--critical">{fmtTL(data.riskForecast.expectedRiskyReceivable)}</span>
              </div>
              <div className="mos-erp-kv">
                <span className="mos-erp-kv__label">Açık bakiye içindeki payı</span>
                <span className="mos-erp-kv__value">{fmtPct(data.riskForecast.shareOfOpenPct)}</span>
              </div>
              <div className="mos-erp-kv">
                <span className="mos-erp-kv__label">Trend</span>
                <span className="mos-erp-kv__value"><Trend value={data.riskForecast.trend} /></span>
              </div>
            </div>
          </div>

          <div className="mos-erp-cockpit-grid" style={{ marginTop: '0.6rem' }}>
            <div className="mos-erp-panel">
              <h2 className="mos-erp-panel__title">Sevk Yoğunluğu Tahmini</h2>
              <div className="mos-erp-kv">
                <span className="mos-erp-kv__label">Önümüzdeki hafta</span>
                <span className="mos-erp-kv__value">{data.shipmentForecast.expectedNextWeek} sevk</span>
              </div>
              <div className="mos-erp-kv">
                <span className="mos-erp-kv__label">Önümüzdeki ay</span>
                <span className="mos-erp-kv__value">{data.shipmentForecast.expectedNextMonth} sevk</span>
              </div>
              <div className="mos-erp-kv">
                <span className="mos-erp-kv__label">Yoğunluk</span>
                <span className="mos-erp-kv__value">{INTENSITY_LABEL[data.shipmentForecast.intensity]} · <Trend value={data.shipmentForecast.trend} /></span>
              </div>
              <span className="mos-erp-forecast__basis">{data.shipmentForecast.basis}</span>
            </div>

            <div className="mos-erp-panel">
              <h2 className="mos-erp-panel__title">Veri Kalitesi Trendi</h2>
              <div className="mos-erp-kv">
                <span className="mos-erp-kv__label">Mevcut skor</span>
                <span className="mos-erp-kv__value">{data.dataQualityTrend.currentScore}</span>
              </div>
              <div className="mos-erp-kv">
                <span className="mos-erp-kv__label">30 gün önce</span>
                <span className="mos-erp-kv__value">{data.dataQualityTrend.previousScore}</span>
              </div>
              <div className="mos-erp-kv">
                <span className="mos-erp-kv__label">Değişim</span>
                <span className={`mos-erp-kv__value${data.dataQualityTrend.change < 0 ? ' mos-erp-kv__value--critical' : ' mos-erp-kv__value--success'}`}>
                  {data.dataQualityTrend.change > 0 ? '+' : ''}{data.dataQualityTrend.change} · <Trend value={data.dataQualityTrend.trend} />
                </span>
              </div>
            </div>

            {data.alerts.length > 0 && (
              <div className="mos-erp-panel">
                <h2 className="mos-erp-panel__title">Tahmin Uyarıları</h2>
                <div className="mos-erp-alerts" style={{ border: 'none', borderRadius: 0 }}>
                  {data.alerts.map((a, i) => (
                    <div key={i} className={`mos-erp-alert mos-erp-alert--${a.severity}`}>
                      <span className="mos-erp-alert__dot" aria-hidden="true" />
                      <span>{a.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <section className="mos-erp-cockpit-section" aria-label="Personel hedef tahmini">
            <h2 className="mos-erp-cockpit-section__title">Personel Hedef Tahmini</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Personel</th>
                    <th className="is-num">Mevcut Satış</th>
                    <th className="is-num">Aylık Hedef</th>
                    <th className="is-num">Tahmini Ay Sonu</th>
                    <th className="is-num">Gerçekleşme %</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {data.staffForecast.length === 0 && (
                    <tr className="mos-erp-tbl-empty"><td colSpan={6}>Personel verisi yok.</td></tr>
                  )}
                  {data.staffForecast.map((r) => (
                    <tr key={r.key} className="mos-erp-tbl-row">
                      <td className="mos-erp-tbl-td--customer">{r.label}</td>
                      <td className="is-num">{fmtTL(r.currentSales)}</td>
                      <td className="is-num mos-erp-tbl-td--muted">{fmtTL(r.target)}</td>
                      <td className="is-num">{fmtTL(r.projectedSales)}</td>
                      <td className="is-num">{fmtPct(r.achievementPct)}</td>
                      <td className={`mos-erp-tbl-td--status ${STAFF_TONE[r.status] ?? ''}`}>{STAFF_LABEL[r.status] ?? r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mos-erp-cockpit-section" aria-label="Satış kaynağı trendleri">
            <h2 className="mos-erp-cockpit-section__title">Satış Kaynağı Trendleri</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Kaynak / Kat</th>
                    <th className="is-num">7 Gün</th>
                    <th className="is-num">30 Gün</th>
                    <th className="is-num">90 Gün</th>
                    <th className="is-num">7G %</th>
                    <th className="is-num">30G %</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sourceTrends.length === 0 && (
                    <tr className="mos-erp-tbl-empty"><td colSpan={7}>Kaynak verisi yok.</td></tr>
                  )}
                  {data.sourceTrends.map((r) => (
                    <tr key={r.key} className="mos-erp-tbl-row">
                      <td className="mos-erp-tbl-td--customer">{r.label}</td>
                      <td className="is-num">{fmtTL(r.revenue7)}</td>
                      <td className="is-num">{fmtTL(r.revenue30)}</td>
                      <td className="is-num">{fmtTL(r.revenue90)}</td>
                      <td className="is-num">{fmtPct(r.pct7)}</td>
                      <td className="is-num">{fmtPct(r.pct30)}</td>
                      <td><Trend value={r.trend} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
