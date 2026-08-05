import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getDataQuality, getDataQualityFacets } from '../services/dataQualityClient.js'
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

const STATUS_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'problem', label: 'Sorunlu' },
  { value: 'clean', label: 'Temiz' },
]

const ISSUE_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'UNKNOWN_SOURCE', label: 'Bilinmeyen Kaynak' },
  { value: 'MISSING_DISPLAY_FLOOR', label: 'Eksik Sergi Katı' },
  { value: 'MISSING_EXTERNAL_SUPPLY_TYPE', label: 'Eksik Dış Tedarik Tipi' },
  { value: 'ZERO_COST', label: 'Alış Maliyeti Yok' },
  { value: 'SOURCE_CONFLICT', label: 'Satış Kaynağı Çelişkisi' },
]

const EMPTY_FILTERS = {
  status: '',
  issueCode: '',
  salesPerson: '',
  from: '',
  to: '',
  q: '',
}

function scoreTone(score) {
  if (score >= 80) return 'success'
  if (score >= 50) return 'warning'
  return 'critical'
}

export default function DataQualityPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))

  const facets = useMemo(() => getDataQualityFacets(), [])
  const queryKey = JSON.stringify(filters)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    getDataQuality(query)
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
    () => rows.find((r) => r.orderLineId === selectedId) ?? rows[0] ?? null,
    [rows, selectedId],
  )

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null)
    } else if (!rows.some((r) => r.orderLineId === selectedId)) {
      setSelectedId(rows[0].orderLineId)
    }
  }, [rows, selectedId])

  const summaryMetrics = useMemo(() => {
    if (!totals) return []
    return [
      { id: 'orders', label: 'Toplam Sipariş', value: totals.totalOrders.toLocaleString('tr-TR') },
      {
        id: 'clean',
        label: 'Kaliteli Kayıt',
        value: totals.cleanRecords.toLocaleString('tr-TR'),
        valueTone: 'success',
      },
      {
        id: 'problem',
        label: 'Problemli Kayıt',
        value: totals.problemRecords.toLocaleString('tr-TR'),
        valueTone: totals.problemRecords > 0 ? 'warning' : 'neutral',
      },
      {
        id: 'unknown',
        label: 'UNKNOWN Sayısı',
        value: totals.unknownCount.toLocaleString('tr-TR'),
        valueTone: totals.unknownCount > 0 ? 'warning' : 'neutral',
      },
      {
        id: 'cost',
        label: 'Maliyet Eksik',
        value: totals.missingCostCount.toLocaleString('tr-TR'),
        valueTone: totals.missingCostCount > 0 ? 'critical' : 'neutral',
      },
      {
        id: 'score',
        label: 'Ortalama Kalite Skoru',
        value: totals.averageQualityScore.toLocaleString('tr-TR'),
        valueTone: scoreTone(totals.averageQualityScore),
      },
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
          <h1 className="mos-erp-ops__title">Veri Kalitesi Merkezi</h1>
          <span className="mos-erp-ops__sub">
            Satış kalemi snapshot kalitesi · {rows.length} kayıt · veri bozulması oluştuğu anda
            görünür
          </span>
        </div>
      </header>

      <ErpOpsSummaryStrip
        metrics={summaryMetrics}
        ariaLabel="Veri kalitesi özeti"
        summaryClassName="mos-erp-summary--cols-6"
      />

      <div className="mos-erp-ops__workspace">
        <aside className="mos-erp-filters" aria-label="Veri kalitesi filtreleri">
          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Durum</h2>
            <select
              className="mos-erp-filters__field"
              value={filters.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </section>

          <section className="mos-erp-filters__group">
            <h2 className="mos-erp-filters__title">Problem türü</h2>
            <select
              className="mos-erp-filters__field"
              value={filters.issueCode}
              onChange={(e) => set('issueCode', e.target.value)}
            >
              {ISSUE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
            <h2 className="mos-erp-filters__title">Ara</h2>
            <input
              type="text"
              className="mos-erp-filters__field"
              placeholder="Sipariş / müşteri / ürün"
              value={filters.q}
              onChange={(e) => set('q', e.target.value)}
            />
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
          <DataQualityDetailStrip row={selectedRow} />

          <section className="mos-erp-ops__table-panel" aria-label="Veri kalitesi kayıtları">
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Durum</th>
                    <th className="is-num">Skor</th>
                    <th>Sipariş</th>
                    <th>Müşteri</th>
                    <th>Ürün</th>
                    <th>Satış Kaynağı</th>
                    <th>Sergi Katı</th>
                    <th>Dış Tedarik</th>
                    <th className="is-num">Alış Maliyeti</th>
                    <th>Kullanıcı</th>
                    <th>Sorunlar</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={12}>Yükleniyor…</td>
                    </tr>
                  )}
                  {!loading && error && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={12}>{error}</td>
                    </tr>
                  )}
                  {!loading && !error && rows.length === 0 && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={12}>Seçili filtrelerde kayıt yok.</td>
                    </tr>
                  )}
                  {!loading &&
                    !error &&
                    rows.map((r) => (
                      <tr
                        key={r.orderLineId}
                        className={`mos-erp-tbl-row${selectedRow?.orderLineId === r.orderLineId ? ' is-selected' : ''}`}
                        onClick={() => setSelectedId(r.orderLineId)}
                      >
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="is-num">
                          <ScorePill score={r.qualityScore} />
                        </td>
                        <td className="mos-erp-tbl-td--customer">{r.orderId}</td>
                        <td>{r.customerName}</td>
                        <td>{r.productTitle}</td>
                        <td>{r.soldSalesSourceTypeLabel}</td>
                        <td className="mos-erp-tbl-td--muted">{r.soldDisplayFloorLabel ?? '—'}</td>
                        <td className="mos-erp-tbl-td--muted">
                          {r.soldExternalSupplyTypeLabel ?? '—'}
                        </td>
                        <td className="is-num">{fmtTL(r.soldUnitCost)}</td>
                        <td className="mos-erp-tbl-td--muted">{r.salesPerson ?? '—'}</td>
                        <td>
                          {r.issues.length === 0 ? (
                            <span className="mos-erp-tbl-td--muted">—</span>
                          ) : (
                            <span style={{ display: 'inline-flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                              {r.issues.map((i) => (
                                <IssueTag key={i.code} issue={i} />
                              ))}
                            </span>
                          )}
                        </td>
                        <td className="mos-erp-tbl-td--muted">{r.orderDate}</td>
                      </tr>
                    ))}
                </tbody>
                {!loading && !error && totals && rows.length > 0 && (
                  <tfoot>
                    <tr className="mos-erp-tbl-row">
                      <td className="mos-erp-tbl-td--customer">
                        <strong>Toplam</strong>
                      </td>
                      <td className="is-num">
                        <strong>{totals.averageQualityScore}</strong>
                      </td>
                      <td colSpan={8}>
                        {totals.cleanRecords} temiz · {totals.problemRecords} problemli ·{' '}
                        {totals.unknownCount} bilinmeyen · {totals.missingCostCount} maliyet eksik
                      </td>
                      <td colSpan={2} className="is-num">
                        {totals.totalRecords} kayıt
                      </td>
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

function StatusBadge({ status }) {
  const ok = status === 'OK'
  return (
    <span
      className="mos-erp-tag"
      style={{
        color: ok ? '#15803d' : '#b91c1c',
        borderColor: ok ? '#bbf7d0' : '#fecaca',
        background: ok ? '#f0fdf4' : '#fef2f2',
      }}
    >
      {ok ? 'Temiz' : 'Sorunlu'}
    </span>
  )
}

function ScorePill({ score }) {
  const tone = scoreTone(score)
  const color = tone === 'success' ? '#15803d' : tone === 'warning' ? '#b45309' : '#b91c1c'
  return <strong style={{ color }}>{score}</strong>
}

function IssueTag({ issue }) {
  const critical = issue.severity === 'critical'
  return (
    <span
      className="mos-erp-tag"
      title={`${issue.label} (-${issue.penalty})`}
      style={{
        color: critical ? '#b91c1c' : '#b45309',
        borderColor: critical ? '#fecaca' : '#fde68a',
        background: critical ? '#fef2f2' : '#fffbeb',
      }}
    >
      {issue.label}
    </span>
  )
}

function DataQualityDetailStrip({ row }) {
  if (!row) {
    return (
      <div className="mos-erp-detail mos-erp-detail--empty">
        <span className="mos-erp-detail__empty">Kayıt seçilmedi.</span>
      </div>
    )
  }
  return (
    <div className="mos-erp-detail">
      <div className="mos-erp-detail__grid">
        <div className="mos-erp-detail__body">
          <div className="mos-erp-detail__primary">
            <span className="mos-erp-detail__name">
              {row.orderId} · {row.productTitle}
            </span>
            <span className="mos-erp-detail__meta">
              {row.customerName} · {row.salesPerson ?? 'Personel yok'} · {row.orderDate}
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Kalite Skoru</span>
            <span className="mos-erp-detail__field-value">
              <ScorePill score={row.qualityScore} /> / 100
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Satış Kaynağı</span>
            <span className="mos-erp-detail__field-value">{row.soldSalesSourceTypeLabel}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Alış Maliyeti</span>
            <span
              className={`mos-erp-detail__field-value${Number.parseFloat(row.soldUnitCost) <= 0 ? ' mos-erp-detail__field-value--critical' : ''}`}
            >
              {fmtTL(row.soldUnitCost)}
            </span>
          </div>
          <div className="mos-erp-detail__field" style={{ flex: '1 1 100%' }}>
            <span className="mos-erp-detail__field-label">Bulunan Problemler</span>
            <span className="mos-erp-detail__field-value">
              {row.issues.length === 0 ? (
                'Sorun yok — kayıt temiz.'
              ) : (
                <span style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {row.issues.map((i) => (
                    <IssueTag key={i.code} issue={i} />
                  ))}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
