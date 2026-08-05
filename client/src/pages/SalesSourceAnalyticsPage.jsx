import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import {
  SALES_SOURCE_TYPE_OPTIONS,
  DISPLAY_FLOOR_OPTIONS,
  EXTERNAL_SUPPLY_TYPE_OPTIONS,
} from '../constants/productSource.js'
import {
  getSalesSourceAnalytics,
  getSalesSourceAnalyticsFacets,
} from '../services/salesSourceAnalyticsClient.js'
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

const EMPTY_FILTERS = {
  from: '',
  to: '',
  salesPerson: '',
  salesSourceType: '',
  displayFloor: '',
  externalSupplyType: '',
  category: '',
  supplierId: '',
}

export default function SalesSourceAnalyticsPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [selectedKey, setSelectedKey] = useState(/** @type {string | null} */ (null))

  const facets = useMemo(() => getSalesSourceAnalyticsFacets(), [])
  const queryKey = JSON.stringify(filters)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    getSalesSourceAnalytics(query)
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
  }, [queryKey, filters])

  const rows = data?.rows ?? []
  const totals = data?.totals ?? null

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
    if (!totals) return []
    return [
      { id: 'revenue', label: 'Toplam Ciro', value: fmtTL(totals.revenue) },
      {
        id: 'profit',
        label: 'Toplam Kâr',
        value: fmtTL(totals.profit),
        valueTone: Number.parseFloat(totals.profit) < 0 ? 'critical' : 'success',
      },
      { id: 'margin', label: 'Kâr %', value: fmtPct(totals.profitMarginPct) },
      { id: 'cost', label: 'Alış Maliyeti', value: fmtTL(totals.purchaseCost) },
      { id: 'collected', label: 'Tahsil Edilen', value: fmtTL(totals.collected), valueTone: 'success' },
      {
        id: 'open',
        label: 'Açık Bakiye',
        value: fmtTL(totals.openBalance),
        valueTone: Number.parseFloat(totals.openBalance) > 0 ? 'warning' : 'neutral',
      },
      { id: 'count', label: 'Satış / Sipariş', value: `${totals.salesCount} / ${totals.orderCount}` },
    ]
  }, [totals])

  function set(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Satış Kaynağı Analitiği</h1>
          <span className="mos-erp-ops__sub">
            Satış anındaki kaynağa göre kırılım · {rows.length} kaynak · Depo Katı satış kaynağı
            değildir
          </span>
        </div>
      </header>

      <ErpOpsSummaryStrip
        metrics={summaryMetrics}
        ariaLabel="Satış kaynağı özeti"
        summaryClassName="mos-erp-summary--cols-7"
      />

      <div className="mos-erp-ops__workspace">
        <aside className="mos-erp-filters" aria-label="Satış kaynağı filtreleri">
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
            <h2 className="mos-erp-filters__title">Sergi katı</h2>
            <select
              className="mos-erp-filters__field"
              value={filters.displayFloor}
              onChange={(e) => set('displayFloor', e.target.value)}
            >
              <option value="">Tümü</option>
              {DISPLAY_FLOOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </section>

          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Dış tedarik tipi</h2>
            <select
              className="mos-erp-filters__field"
              value={filters.externalSupplyType}
              onChange={(e) => set('externalSupplyType', e.target.value)}
            >
              <option value="">Tümü</option>
              {EXTERNAL_SUPPLY_TYPE_OPTIONS.map((o) => (
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
          <SalesSourceDetailStrip row={selectedRow} />

          <section className="mos-erp-ops__table-panel" aria-label="Satış kaynağı kırılımı">
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Kaynak / Kat</th>
                    <th className="is-num">Satış Adedi</th>
                    <th className="is-num">Sipariş</th>
                    <th className="is-num">Adet</th>
                    <th className="is-num">Ciro</th>
                    <th className="is-num">Alış Maliyeti</th>
                    <th className="is-num">Kâr</th>
                    <th className="is-num">Kâr %</th>
                    <th className="is-num">Tahsilat</th>
                    <th className="is-num">Açık Bakiye</th>
                    <th className="is-num">Ciro %</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={11}>Yükleniyor…</td>
                    </tr>
                  )}
                  {!loading && error && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={11}>{error}</td>
                    </tr>
                  )}
                  {!loading && !error && rows.length === 0 && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={11}>Seçili filtrelerde satış kaydı yok.</td>
                    </tr>
                  )}
                  {!loading &&
                    !error &&
                    rows.map((r) => {
                      const profitNeg = Number.parseFloat(r.profit) < 0
                      return (
                        <tr
                          key={r.key}
                          className={`mos-erp-tbl-row${selectedRow?.key === r.key ? ' is-selected' : ''}`}
                          onClick={() => setSelectedKey(r.key)}
                        >
                          <td className="mos-erp-tbl-td--customer">{r.label}</td>
                          <td className="is-num">{r.salesCount}</td>
                          <td className="is-num">{r.orderCount}</td>
                          <td className="is-num">{r.unitsSold}</td>
                          <td className="is-num">{fmtTL(r.revenue)}</td>
                          <td className="is-num mos-erp-tbl-td--muted">{fmtTL(r.purchaseCost)}</td>
                          <td className="is-num">{fmtTL(r.profit)}</td>
                          <td className="is-num">{fmtPct(r.profitMarginPct)}</td>
                          <td className="is-num">{fmtTL(r.collected)}</td>
                          <td className="is-num">{fmtTL(r.openBalance)}</td>
                          <td className="is-num mos-erp-tbl-td--muted">{fmtPct(r.revenueSharePct)}</td>
                        </tr>
                      )
                    })}
                </tbody>
                {!loading && !error && totals && rows.length > 0 && (
                  <tfoot>
                    <tr className="mos-erp-tbl-row">
                      <td className="mos-erp-tbl-td--customer">
                        <strong>Toplam</strong>
                      </td>
                      <td className="is-num">{totals.salesCount}</td>
                      <td className="is-num">{totals.orderCount}</td>
                      <td className="is-num">{totals.unitsSold}</td>
                      <td className="is-num">{fmtTL(totals.revenue)}</td>
                      <td className="is-num">{fmtTL(totals.purchaseCost)}</td>
                      <td className="is-num">{fmtTL(totals.profit)}</td>
                      <td className="is-num">{fmtPct(totals.profitMarginPct)}</td>
                      <td className="is-num">{fmtTL(totals.collected)}</td>
                      <td className="is-num">{fmtTL(totals.openBalance)}</td>
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

function SalesSourceDetailStrip({ row }) {
  if (!row) {
    return (
      <div className="mos-erp-detail mos-erp-detail--empty">
        <span className="mos-erp-detail__empty">Kaynak seçilmedi.</span>
      </div>
    )
  }
  return (
    <div className="mos-erp-detail">
      <div className="mos-erp-detail__grid">
        <div className="mos-erp-detail__body">
          <div className="mos-erp-detail__primary">
            <span className="mos-erp-detail__name">{row.label}</span>
            <span className="mos-erp-detail__meta">
              {row.salesCount} satış · {row.orderCount} sipariş · {row.unitsSold} adet
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Ciro</span>
            <span className="mos-erp-detail__field-value">{fmtTL(row.revenue)}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Alış Maliyeti</span>
            <span className="mos-erp-detail__field-value">{fmtTL(row.purchaseCost)}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Kâr</span>
            <span
              className={`mos-erp-detail__field-value${Number.parseFloat(row.profit) < 0 ? ' mos-erp-detail__field-value--critical' : ''}`}
            >
              {fmtTL(row.profit)} ({fmtPct(row.profitMarginPct)})
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Tahsilat</span>
            <span className="mos-erp-detail__field-value">{fmtTL(row.collected)}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Açık Bakiye</span>
            <span
              className={`mos-erp-detail__field-value${Number.parseFloat(row.openBalance) > 0 ? ' mos-erp-detail__field-value--warning' : ''}`}
            >
              {fmtTL(row.openBalance)}
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Toplam Cironun Payı</span>
            <span className="mos-erp-detail__field-value">{fmtPct(row.revenueSharePct)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
