import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { SALES_SOURCE_TYPE_OPTIONS } from '../constants/productSource.js'
import { getManagerCockpit } from '../services/managerCockpitClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import '../styles/mos-erp-ops.css'

const TL = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})
const fmtTL = (s) => {
  const n = Number.parseFloat(s)
  return TL.format(Number.isFinite(n) ? n : 0)
}
const fmtPct = (n) => `%${(Math.round((n ?? 0) * 10) / 10).toLocaleString('tr-TR')}`

const RISK_LABELS = { NONE: 'Risk yok', LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', CRITICAL: 'Kritik' }
const RISK_TONE = { NONE: '', LOW: '', MEDIUM: 'is-warning', HIGH: 'is-critical', CRITICAL: 'is-critical' }

const RISK_OPTIONS = [
  { value: 'NONE', label: 'Risk Yok' },
  { value: 'MEDIUM', label: 'Orta Risk' },
  { value: 'HIGH', label: 'Yüksek Risk' },
]
const PAYMENT_OPTIONS = [
  { value: 'paid', label: 'Tahsil Edildi' },
  { value: 'partial', label: 'Kısmi' },
  { value: 'open', label: 'Açık' },
]

const EMPTY_FILTERS = {
  month: '',
  salesPerson: '',
  riskLevel: '',
  paymentStatus: '',
  salesSourceType: '',
}

export default function ManagerCockpitPage() {
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
    getManagerCockpit(query)
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Kokpit yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [queryKey, filters, limitedView])

  function set(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const summary = data?.summary ?? null
  const ops = data?.todayOperations ?? null
  const ph = data?.profitabilityHighlights ?? null
  const dq = data?.dataQualityHighlights ?? null
  const criticalOrders = data?.criticalOrders ?? []
  const pendingShipments = data?.pendingShipments ?? []
  const alerts = data?.managerAlerts ?? []

  const summaryMetrics = useMemo(() => {
    if (!summary) return []
    return [
      { id: 'today', label: 'Bugünkü Satış', value: fmtTL(summary.todaySales) },
      { id: 'rev', label: 'Bu Ay Ciro', value: fmtTL(summary.monthRevenue) },
      {
        id: 'profit',
        label: 'Bu Ay Brüt Kâr',
        value: fmtTL(summary.monthGrossProfit),
        valueTone: Number.parseFloat(summary.monthGrossProfit) < 0 ? 'critical' : 'success',
      },
      { id: 'margin', label: 'Ortalama Kâr %', value: fmtPct(summary.avgProfitMarginPct) },
      { id: 'realized', label: 'Tahsil Edilen Kâr', value: fmtTL(summary.realizedProfit), valueTone: 'success' },
      { id: 'pending', label: 'Bekleyen Kâr', value: fmtTL(summary.pendingProfit) },
      {
        id: 'risky',
        label: 'Riskli Alacak',
        value: fmtTL(summary.riskyReceivable),
        valueTone: Number.parseFloat(summary.riskyReceivable) > 0 ? 'critical' : 'neutral',
      },
      {
        id: 'quality',
        label: 'Veri Kalite Skoru',
        value: `${summary.dataQualityScore}`,
        valueTone: summary.dataQualityScore < 85 ? 'warning' : 'success',
      },
    ]
  }, [summary])

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Yönetici Kokpiti</h1>
          <span className="mos-erp-ops__sub">
            Bugün mağazada durum ne? · Para kazanıyor muyuz, nerede risk var?
            {data?.today ? ` · ${data.today}` : ''}
          </span>
        </div>
      </header>

      <ErpOpsSummaryStrip
        metrics={summaryMetrics}
        ariaLabel="Yönetici özeti"
        summaryClassName="mos-erp-summary--cols-8"
      />

      <div className="mos-erp-cockpit-filters" aria-label="Kokpit filtreleri">
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="ck-month">Ay</label>
          <input
            id="ck-month"
            type="month"
            className="mos-erp-filters__field"
            value={filters.month}
            onChange={(e) => set('month', e.target.value)}
          />
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="ck-person">Satış personeli</label>
          <input
            id="ck-person"
            type="text"
            className="mos-erp-filters__field"
            placeholder="Tümü"
            value={filters.salesPerson}
            onChange={(e) => set('salesPerson', e.target.value)}
          />
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="ck-risk">Risk seviyesi</label>
          <select id="ck-risk" className="mos-erp-filters__field" value={filters.riskLevel} onChange={(e) => set('riskLevel', e.target.value)}>
            <option value="">Tümü</option>
            {RISK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="ck-pay">Tahsilat durumu</label>
          <select id="ck-pay" className="mos-erp-filters__field" value={filters.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)}>
            <option value="">Tümü</option>
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="ck-source">Satış kaynağı</label>
          <select id="ck-source" className="mos-erp-filters__field" value={filters.salesSourceType} onChange={(e) => set('salesSourceType', e.target.value)}>
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
            <Panel title="Bugünün Operasyon Durumu">
              <Kv label="Bugünkü sipariş" value={ops.ordersToday} />
              <Kv label="Bugünkü tahsilat" value={fmtTL(ops.collectionToday)} tone="success" />
              <Kv label="Sevke hazır sipariş" value={ops.readyToShipToday} />
              <Kv label="Geciken sevk" value={ops.delayedShipments} tone={ops.delayedShipments > 0 ? 'warning' : ''} />
              <Kv label="Açılan SSH / servis" value={ops.serviceTicketsToday} />
              <Kv label="Kritik riskli sipariş" value={ops.criticalRiskOrders} tone={ops.criticalRiskOrders > 0 ? 'critical' : ''} />
            </Panel>

            <Panel title="Ayın Kârlılık Özeti">
              <Kv label="En kârlı kaynak" value={hl(ph.topProfitSource, fmtTL)} />
              <Kv label="En kârlı personel" value={hl(ph.topProfitSalesPerson, fmtTL)} />
              <Kv label="En kârlı kategori" value={hl(ph.topProfitCategory, fmtTL)} />
              <Kv label="En riskli kaynak" value={hl(ph.riskiestSource, fmtTL)} tone="critical" />
              <Kv label="En düşük marjlı kaynak" value={hlPct(ph.lowestMarginSource)} tone="warning" />
              <Kv label="En yüksek açık bakiye" value={hl(ph.highestOpenBalanceSource, fmtTL)} tone="warning" />
            </Panel>

            <Panel title="Veri Kalitesi Uyarıları">
              <Kv label="UNKNOWN kaynak" value={dq.unknownCount} tone={dq.unknownCount > 0 ? 'warning' : ''} />
              <Kv label="Alış maliyeti eksik" value={dq.missingCostCount} tone={dq.missingCostCount > 0 ? 'critical' : ''} />
              <Kv label="Eksik sergi katı" value={dq.missingDisplayFloorCount} />
              <Kv label="Eksik dış tedarik tipi" value={dq.missingExternalSupplyCount} />
              <Kv label="Kritik veri problemi" value={dq.criticalIssueCount} tone={dq.criticalIssueCount > 0 ? 'critical' : ''} />
              <Kv label="Ortalama kalite skoru" value={dq.averageQualityScore} tone={dq.averageQualityScore < 85 ? 'warning' : 'success'} />
            </Panel>
          </div>

          {alerts.length > 0 && (
            <section className="mos-erp-cockpit-section" aria-label="Yönetici uyarıları">
              <h2 className="mos-erp-cockpit-section__title">Yönetici Uyarıları</h2>
              <div className="mos-erp-alerts">
                {alerts.map((a, i) => (
                  <div key={i} className={`mos-erp-alert mos-erp-alert--${a.severity}`}>
                    <span className="mos-erp-alert__dot" aria-hidden="true" />
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mos-erp-cockpit-section" aria-label="Kritik siparişler">
            <h2 className="mos-erp-cockpit-section__title">Kritik Siparişler</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Risk</th>
                    <th>Sipariş No</th>
                    <th>Müşteri</th>
                    <th className="is-num">Tutar</th>
                    <th className="is-num">Açık Bakiye</th>
                    <th className="is-num">Kâr</th>
                    <th>Sevk Durumu</th>
                    <th>Tahsilat</th>
                    <th>Personel</th>
                    <th>Problem</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalOrders.length === 0 && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={10}>Kritik sipariş yok.</td>
                    </tr>
                  )}
                  {criticalOrders.map((r) => (
                    <tr key={r.orderId} className="mos-erp-tbl-row">
                      <td className={`mos-erp-tbl-td--status ${RISK_TONE[r.riskLevel] ?? ''}`}>{RISK_LABELS[r.riskLevel] ?? r.riskLevel}</td>
                      <td>{r.orderNumber}</td>
                      <td className="mos-erp-tbl-td--customer">{r.customer}</td>
                      <td className="is-num">{fmtTL(r.totalAmount)}</td>
                      <td className={`is-num${Number.parseFloat(r.openBalance) > 0 ? ' mos-erp-tbl-td--critical' : ''}`}>{fmtTL(r.openBalance)}</td>
                      <td className="is-num">{r.grossProfit === '' ? '—' : fmtTL(r.grossProfit)}</td>
                      <td>{r.shipmentStatus}</td>
                      <td>{r.paymentStatus}</td>
                      <td>{r.salesPerson ?? '—'}</td>
                      <td className="mos-erp-tbl-td--action">{r.problems.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mos-erp-cockpit-section" aria-label="Bekleyen sevk / operasyon">
            <h2 className="mos-erp-cockpit-section__title">Bekleyen Sevk / Operasyon</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Sipariş No</th>
                    <th>Müşteri</th>
                    <th>Planlanan Sevk</th>
                    <th className="is-num">Gün Farkı</th>
                    <th>Hazırlık</th>
                    <th className="is-num">Eksik Ürün</th>
                    <th>Montaj Ekibi</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingShipments.length === 0 && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={8}>Bekleyen sevk yok.</td>
                    </tr>
                  )}
                  {pendingShipments.map((r) => (
                    <tr key={r.orderId} className="mos-erp-tbl-row">
                      <td>{r.orderNumber}</td>
                      <td className="mos-erp-tbl-td--customer">{r.customer}</td>
                      <td>{r.plannedShipDate ?? '—'}</td>
                      <td className={`is-num${r.dayDiff != null && r.dayDiff < 0 ? ' mos-erp-tbl-td--critical' : ''}`}>
                        {r.dayDiff == null ? '—' : r.dayDiff > 0 ? `+${r.dayDiff}` : r.dayDiff}
                      </td>
                      <td>{r.readiness}</td>
                      <td className="is-num">{r.missingItems}</td>
                      <td>{r.crew ?? '—'}</td>
                      <td className={`mos-erp-tbl-td--status ${RISK_TONE[r.riskLevel] ?? ''}`}>{RISK_LABELS[r.riskLevel] ?? r.riskLevel}</td>
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

function Panel({ title, children }) {
  return (
    <div className="mos-erp-panel">
      <h2 className="mos-erp-panel__title">{title}</h2>
      {children}
    </div>
  )
}

function Kv({ label, value, tone }) {
  return (
    <div className="mos-erp-kv">
      <span className="mos-erp-kv__label">{label}</span>
      <span className={`mos-erp-kv__value${tone ? ` mos-erp-kv__value--${tone}` : ''}`}>{value}</span>
    </div>
  )
}

function hl(h, fmt) {
  if (!h) return '—'
  return `${h.label} · ${fmt(h.value)}`
}

function hlPct(h) {
  if (!h) return '—'
  return `${h.label} · %${(Math.round(Number.parseFloat(h.value) * 10) / 10).toLocaleString('tr-TR')}`
}
