import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { SALES_SOURCE_TYPE_OPTIONS } from '../constants/productSource.js'
import {
  getProfitabilityAnalytics,
  getProfitabilityFacets,
} from '../services/profitabilityAnalyticsClient.js'
import '../styles/mos-erp-ops.css'

const TL = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})

function fmtTL(str) {
  const n = Number.parseFloat(str)
  return TL.format(Number.isFinite(n) ? n : 0)
}

function fmtPct(n) {
  return `%${(Math.round((n ?? 0) * 10) / 10).toLocaleString('tr-TR')}`
}

const GROUP_BY_OPTIONS = [
  { value: 'source', label: 'Satış Kaynağı', col: 'Kaynak / Kat' },
  { value: 'salesPerson', label: 'Satış Personeli', col: 'Personel' },
  { value: 'supplier', label: 'Tedarikçi', col: 'Tedarikçi' },
  { value: 'category', label: 'Kategori', col: 'Kategori' },
  { value: 'brand', label: 'Marka', col: 'Marka' },
  { value: 'product', label: 'Ürün', col: 'Ürün' },
  { value: 'month', label: 'Ay', col: 'Ay' },
  { value: 'year', label: 'Yıl', col: 'Yıl' },
]

const PAYMENT_STATUS_OPTIONS = [
  { value: 'paid', label: 'Tahsil Edildi' },
  { value: 'partial', label: 'Kısmi Tahsilat' },
  { value: 'open', label: 'Açık' },
]

const RISK_OPTIONS = [
  { value: 'NONE', label: 'Risk Yok' },
  { value: 'MEDIUM', label: 'Orta Risk' },
  { value: 'HIGH', label: 'Yüksek Risk' },
]

const RISK_LABELS = { NONE: 'Risk Yok', MEDIUM: 'Orta', HIGH: 'Yüksek' }

const EMPTY_FILTERS = {
  from: '',
  to: '',
  salesPerson: '',
  salesSourceType: '',
  category: '',
  brand: '',
  supplierId: '',
  customer: '',
  paymentStatus: '',
  riskLevel: '',
}

export default function ProfitabilityAnalyticsPage() {
  const [groupBy, setGroupBy] = useState('source')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [selectedKey, setSelectedKey] = useState(/** @type {string | null} */ (null))

  const facets = useMemo(() => getProfitabilityFacets(), [])
  const queryKey = JSON.stringify({ groupBy, ...filters })

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const query = { groupBy, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
    getProfitabilityAnalytics(query)
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Rapor yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [queryKey, filters, groupBy])

  const rows = data?.rows ?? []
  const totals = data?.totals ?? null
  const summary = data?.summary ?? null

  const selectedRow = useMemo(
    () => rows.find((r) => r.key === selectedKey) ?? rows[0] ?? null,
    [rows, selectedKey],
  )

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedKey(null)
    } else if (!rows.some((r) => r.key === selectedKey)) {
      setSelectedKey(rows[0].key)
    }
  }, [rows, selectedKey])

  const summaryMetrics = useMemo(() => {
    if (!summary) return []
    return [
      { id: 'revenue', label: 'Toplam Ciro', value: fmtTL(summary.revenue) },
      {
        id: 'profit',
        label: 'Toplam Kâr',
        value: fmtTL(summary.grossProfit),
        valueTone: Number.parseFloat(summary.grossProfit) < 0 ? 'critical' : 'success',
      },
      { id: 'margin', label: 'Ort. Kâr %', value: fmtPct(summary.profitMarginPct) },
      { id: 'realized', label: 'Tahsil Edilen Kâr', value: fmtTL(summary.realizedProfit), valueTone: 'success' },
      { id: 'pending', label: 'Bekleyen Kâr', value: fmtTL(summary.pendingProfit) },
      {
        id: 'risky',
        label: 'Riskli Alacak',
        value: fmtTL(summary.riskyReceivable),
        valueTone: Number.parseFloat(summary.riskyReceivable) > 0 ? 'critical' : 'neutral',
      },
      { id: 'topSource', label: 'En Kârlı Kaynak', value: summary.mostProfitableSource?.label ?? '—' },
      { id: 'topPerson', label: 'En Kârlı Personel', value: summary.mostProfitableSalesPerson?.label ?? '—' },
    ]
  }, [summary])

  function set(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)
  const breakdownCol = GROUP_BY_OPTIONS.find((g) => g.value === groupBy)?.col ?? 'Kırılım'

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Kârlılık Analitiği</h1>
          <span className="mos-erp-ops__sub">
            Nereden para kazanıyoruz? · {rows.length} kırılım · maliyet yalnızca satış anı
            snapshot’ından
          </span>
        </div>
      </header>

      <ErpOpsSummaryStrip
        metrics={summaryMetrics}
        ariaLabel="Kârlılık özeti"
        summaryClassName="mos-erp-summary--cols-8"
      />

      <div className="mos-erp-ops__workspace">
        <aside className="mos-erp-filters" aria-label="Kârlılık filtreleri">
          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Kırılım</h2>
            <select
              className="mos-erp-filters__field"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              {GROUP_BY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </section>

          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Tarih aralığı</h2>
            <input
              type="date"
              className="mos-erp-filters__field"
              aria-label="Başlangıç tarihi"
              value={filters.from}
              onChange={(e) => set('from', e.target.value)}
            />
            <input
              type="date"
              className="mos-erp-filters__field"
              aria-label="Bitiş tarihi"
              value={filters.to}
              onChange={(e) => set('to', e.target.value)}
            />
          </section>

          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Satış personeli</h2>
            <select
              className="mos-erp-filters__field"
              value={filters.salesPerson}
              onChange={(e) => set('salesPerson', e.target.value)}
            >
              <option value="">Tümü</option>
              {facets.salesPersons.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </section>

          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Kaynak tipi</h2>
            <select
              className="mos-erp-filters__field"
              value={filters.salesSourceType}
              onChange={(e) => set('salesSourceType', e.target.value)}
            >
              <option value="">Tümü</option>
              {SALES_SOURCE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </section>

          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Kategori</h2>
            {facets.categories.length > 0 ? (
              <select
                className="mos-erp-filters__field"
                value={filters.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option value="">Tümü</option>
                {facets.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="mos-erp-filters__field"
                placeholder="Kategori"
                value={filters.category}
                onChange={(e) => set('category', e.target.value)}
              />
            )}
          </section>

          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Marka</h2>
            {facets.brands.length > 0 ? (
              <select
                className="mos-erp-filters__field"
                value={filters.brand}
                onChange={(e) => set('brand', e.target.value)}
              >
                <option value="">Tümü</option>
                {facets.brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="mos-erp-filters__field"
                placeholder="Marka"
                value={filters.brand}
                onChange={(e) => set('brand', e.target.value)}
              />
            )}
          </section>

          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Tedarikçi</h2>
            {facets.suppliers.length > 0 ? (
              <select
                className="mos-erp-filters__field"
                value={filters.supplierId}
                onChange={(e) => set('supplierId', e.target.value)}
              >
                <option value="">Tümü</option>
                {facets.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="mos-erp-filters__field"
                placeholder="Tedarikçi ID"
                value={filters.supplierId}
                onChange={(e) => set('supplierId', e.target.value)}
              />
            )}
          </section>

          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Müşteri</h2>
            <input
              type="text"
              className="mos-erp-filters__field"
              placeholder="Müşteri adı"
              value={filters.customer}
              onChange={(e) => set('customer', e.target.value)}
            />
          </section>

          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Tahsilat durumu</h2>
            <select
              className="mos-erp-filters__field"
              value={filters.paymentStatus}
              onChange={(e) => set('paymentStatus', e.target.value)}
            >
              <option value="">Tümü</option>
              {PAYMENT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </section>

          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Risk seviyesi</h2>
            <select
              className="mos-erp-filters__field"
              value={filters.riskLevel}
              onChange={(e) => set('riskLevel', e.target.value)}
            >
              <option value="">Tümü</option>
              {RISK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </section>

          {hasActiveFilters && (
            <button
              type="button"
              className="mos-erp-ops__btn"
              style={{ width: '100%', marginTop: '0.4rem' }}
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Filtreleri temizle
            </button>
          )}
        </aside>

        <div className="mos-erp-ops__main">
          <ProfitabilityDetailPanel row={selectedRow} />

          <section className="mos-erp-ops__table-panel" aria-label="Kârlılık kırılımı">
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>{breakdownCol}</th>
                    <th className="is-num">Sipariş</th>
                    <th className="is-num">Adet</th>
                    <th className="is-num">Ciro</th>
                    <th className="is-num">Alış Maliyeti</th>
                    <th className="is-num">Brüt Kâr</th>
                    <th className="is-num">Kâr %</th>
                    <th className="is-num">Tahsilat</th>
                    <th className="is-num">Açık Bakiye</th>
                    <th className="is-num">Riskli Alacak</th>
                    <th className="is-num">Gerçekleşen Kâr</th>
                    <th className="is-num">Bekleyen Kâr</th>
                    <th className="is-num">Ciro %</th>
                    <th className="is-num">Kâr %</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={14}>Yükleniyor…</td>
                    </tr>
                  )}
                  {!loading && error && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={14}>{error}</td>
                    </tr>
                  )}
                  {!loading && !error && rows.length === 0 && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={14}>Seçili filtrelerde satış kaydı yok.</td>
                    </tr>
                  )}
                  {!loading &&
                    !error &&
                    rows.map((r) => (
                      <tr
                        key={r.key}
                        className={`mos-erp-tbl-row${selectedRow?.key === r.key ? ' is-selected' : ''}`}
                        onClick={() => setSelectedKey(r.key)}
                      >
                        <td className="mos-erp-tbl-td--customer">{r.label}</td>
                        <td className="is-num">{r.orderCount}</td>
                        <td className="is-num">{r.unitsSold}</td>
                        <td className="is-num">{fmtTL(r.revenue)}</td>
                        <td className="is-num mos-erp-tbl-td--muted">{fmtTL(r.purchaseCost)}</td>
                        <td
                          className={`is-num${Number.parseFloat(r.grossProfit) < 0 ? ' mos-erp-tbl-td--critical' : ''}`}
                        >
                          {fmtTL(r.grossProfit)}
                        </td>
                        <td className="is-num">{fmtPct(r.profitMarginPct)}</td>
                        <td className="is-num">{fmtTL(r.collected)}</td>
                        <td className="is-num">{fmtTL(r.openBalance)}</td>
                        <td
                          className={`is-num${Number.parseFloat(r.riskyReceivable) > 0 ? ' mos-erp-tbl-td--critical' : ''}`}
                        >
                          {fmtTL(r.riskyReceivable)}
                        </td>
                        <td className="is-num">{fmtTL(r.realizedProfit)}</td>
                        <td className="is-num mos-erp-tbl-td--muted">{fmtTL(r.pendingProfit)}</td>
                        <td className="is-num mos-erp-tbl-td--muted">{fmtPct(r.revenueSharePct)}</td>
                        <td className="is-num mos-erp-tbl-td--muted">{fmtPct(r.profitSharePct)}</td>
                      </tr>
                    ))}
                </tbody>
                {!loading && !error && totals && rows.length > 0 && (
                  <tfoot>
                    <tr className="mos-erp-tbl-row">
                      <td className="mos-erp-tbl-td--customer">
                        <strong>Toplam</strong>
                      </td>
                      <td className="is-num">{totals.orderCount}</td>
                      <td className="is-num">{totals.unitsSold}</td>
                      <td className="is-num">{fmtTL(totals.revenue)}</td>
                      <td className="is-num">{fmtTL(totals.purchaseCost)}</td>
                      <td className="is-num">{fmtTL(totals.grossProfit)}</td>
                      <td className="is-num">{fmtPct(totals.profitMarginPct)}</td>
                      <td className="is-num">{fmtTL(totals.collected)}</td>
                      <td className="is-num">{fmtTL(totals.openBalance)}</td>
                      <td className="is-num">{fmtTL(totals.riskyReceivable)}</td>
                      <td className="is-num">{fmtTL(totals.realizedProfit)}</td>
                      <td className="is-num">{fmtTL(totals.pendingProfit)}</td>
                      <td className="is-num">{fmtPct(100)}</td>
                      <td className="is-num">{fmtPct(100)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function ProfitabilityDetailPanel({ row }) {
  if (!row) {
    return (
      <div className="mos-erp-detail mos-erp-detail--empty">
        <span className="mos-erp-detail__empty">Kırılım seçilmedi.</span>
      </div>
    )
  }
  const d = row.detail ?? {}
  const months = d.months ?? []
  return (
    <div className="mos-erp-detail">
      <div className="mos-erp-detail__grid">
        <div className="mos-erp-detail__body">
          <div className="mos-erp-detail__primary">
            <span className="mos-erp-detail__name">{row.label}</span>
            <span className="mos-erp-detail__meta">
              {d.totalOrders ?? row.orderCount} sipariş · ort. marj {fmtPct(d.avgMarginPct)}
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Toplam Kâr</span>
            <span className="mos-erp-detail__field-value">{fmtTL(row.grossProfit)}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">En Büyük Sipariş</span>
            <span className="mos-erp-detail__field-value">
              {d.biggestOrder ? `${d.biggestOrder.orderId} · ${fmtTL(d.biggestOrder.revenue)}` : '—'}
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">En Riskli Sipariş</span>
            <span
              className={`mos-erp-detail__field-value${d.riskiestOrder?.riskLevel === 'HIGH' ? ' mos-erp-detail__field-value--critical' : ''}`}
            >
              {d.riskiestOrder
                ? `${d.riskiestOrder.orderId} · ${RISK_LABELS[d.riskiestOrder.riskLevel] ?? '—'} · ${fmtTL(d.riskiestOrder.openBalance)}`
                : '—'}
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">En Çok Satan Ürün</span>
            <span className="mos-erp-detail__field-value">
              {d.topProductByUnits ? `${d.topProductByUnits.title} · ${d.topProductByUnits.units} adet` : '—'}
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">En Çok Kâr Getiren Ürün</span>
            <span className="mos-erp-detail__field-value">
              {d.topProductByProfit
                ? `${d.topProductByProfit.title} · ${fmtTL(d.topProductByProfit.grossProfit)}`
                : '—'}
            </span>
          </div>
        </div>
      </div>
      {months.length > 0 && (
        <div className="mos-erp-detail__months" role="list" aria-label="Son 12 ay performansı">
          {months.map((m) => (
            <div key={m.month} className="mos-erp-detail__month" role="listitem">
              <span className="mos-erp-detail__month-label">{m.month}</span>
              <span className="mos-erp-detail__month-rev">{fmtTL(m.revenue)}</span>
              <span className="mos-erp-detail__month-profit">{fmtTL(m.grossProfit)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
