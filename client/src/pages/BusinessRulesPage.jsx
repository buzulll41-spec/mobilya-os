import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getBusinessRules } from '../services/businessRuleClient.js'
import BusinessRuleDetailPage from './BusinessRuleDetailPage.jsx'
import '../styles/mos-erp-ops.css'

const CATEGORY_LABEL = {
  COLLECTION: 'Tahsilat',
  SHIPMENT: 'Sevk',
  PROFITABILITY: 'Kârlılık',
  DATA_QUALITY: 'Veri Kalitesi',
  RISK: 'Risk',
  AUTOMATION: 'Otomasyon',
  OPERATIONS: 'Operasyon',
  SALES: 'Satış',
}
const SEVERITY_TONE = { INFO: 'info', WARNING: 'warning', CRITICAL: 'critical' }

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

export default function BusinessRulesPage({ onNavigate }) {
  const [filters, setFilters] = useState({ category: '', q: '' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detailId, setDetailId] = useState(null)

  const load = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    getBusinessRules(query)
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Kurallar yüklenemedi')
        setLoading(false)
      })
    return () => { alive = false }
  }, [filters])

  useEffect(() => load(), [load])

  if (detailId) {
    return (
      <BusinessRuleDetailPage
        ruleId={detailId}
        onBack={() => { setDetailId(null); load() }}
        onNavigate={onNavigate}
      />
    )
  }

  const s = data?.summary
  const summaryMetrics = useMemo(() => {
    if (!s) return []
    return [
      { id: 'total', label: 'Toplam Kural', value: String(s.totalRules) },
      { id: 'active', label: 'Aktif', value: String(s.activeCount), valueTone: 'success' },
      { id: 'inactive', label: 'Pasif', value: String(s.inactiveCount) },
      { id: 'critical', label: 'Kritik', value: String(s.criticalCount), valueTone: 'critical' },
      { id: 'updated', label: 'Son Güncelleme', value: (s.lastUpdatedAt ?? '').slice(0, 10) || '—' },
    ]
  }, [s])

  const rules = data?.rules ?? []

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">İş Kuralları Merkezi</h1>
          <span className="mos-erp-ops__sub">Şirket davranışı — eşikler ve otomasyon kuralları</span>
        </div>
        {onNavigate && (
          <button type="button" className="mos-erp-detail__action" onClick={() => onNavigate('business-rule-tester')}>
            Rule Tester
          </button>
        )}
      </header>

      <ErpOpsSummaryStrip metrics={summaryMetrics} ariaLabel="Kural özeti" summaryClassName="mos-erp-summary--cols-5" />

      <div className="mos-erp-cockpit-filters">
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="br-cat">Kategori</label>
          <select id="br-cat" className="mos-erp-filters__field" value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}>
            <option value="">Tümü</option>
            {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="br-q">Arama</label>
          <input id="br-q" type="text" className="mos-erp-filters__field" placeholder="Kod / ad" value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} />
        </div>
      </div>

      {loading && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">Yükleniyor…</span></div>}
      {!loading && error && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">{error}</span></div>}

      {!loading && !error && (
        <section className="mos-erp-cockpit-section">
          <h2 className="mos-erp-cockpit-section__title">Kural Listesi ({rules.length})</h2>
          <div className="mos-erp-tbl-wrap">
            <table className="mos-erp-tbl">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Ad</th>
                  <th>Kategori</th>
                  <th>Önem</th>
                  <th>Değer</th>
                  <th>Durum</th>
                  <th>Güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 && <tr className="mos-erp-tbl-empty"><td colSpan={7}>Kural yok.</td></tr>}
                {rules.map((r) => (
                  <tr key={r.id} className="mos-erp-tbl-row" onClick={() => setDetailId(r.id)}>
                    <td className="mos-erp-tbl-td--muted">{r.code}</td>
                    <td className="mos-erp-tbl-td--customer">{r.name}</td>
                    <td>{CATEGORY_LABEL[r.category] ?? r.category}</td>
                    <td><Tag tone={SEVERITY_TONE[r.severity]}>{r.severity}</Tag></td>
                    <td>{r.value}{r.valueType === 'PERCENT' ? '%' : ''}</td>
                    <td><Tag tone={r.isEnabled ? 'success' : 'muted'}>{r.isEnabled ? 'Aktif' : 'Pasif'}</Tag></td>
                    <td className="mos-erp-tbl-td--muted">{(r.updatedAt ?? '').slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
