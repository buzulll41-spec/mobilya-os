import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getOperationsAdvisor } from '../services/operationsAdvisorClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import '../styles/mos-erp-ops.css'

const SEVERITY_LABEL = { CRITICAL: 'Kritik', WARNING: 'Uyarı', INFO: 'Bilgi' }
const SEVERITY_TONE = { CRITICAL: 'critical', WARNING: 'warning', INFO: 'info' }
const CATEGORY_LABEL = {
  PROFITABILITY: 'Kârlılık',
  COLLECTION: 'Tahsilat',
  SHIPMENT: 'Sevk',
  DATA_QUALITY: 'Veri Kalitesi',
  RISK: 'Risk',
  SALES: 'Satış',
  SUPPLIER: 'Tedarikçi',
  OPERATIONS: 'Operasyon',
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))
const SEVERITY_OPTIONS = Object.entries(SEVERITY_LABEL).map(([value, label]) => ({ value, label }))

function SeverityTag({ severity }) {
  return (
    <span className={`mos-erp-tag mos-erp-tag--${SEVERITY_TONE[severity] ?? 'info'}`}>
      {SEVERITY_LABEL[severity] ?? severity}
    </span>
  )
}

function EvidenceList({ evidence }) {
  const entries = Object.entries(evidence ?? {})
  if (entries.length === 0) return <span className="mos-erp-detail__field-value">—</span>
  return (
    <span className="mos-erp-detail__field-value">
      {entries.map(([k, v]) => `${k}: ${v}`).join(' · ')}
    </span>
  )
}

function AdvisoryCard({ advisory, onSelect, selected }) {
  return (
    <button
      type="button"
      className={`mos-erp-panel mos-erp-advisory${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(advisory.id)}
      style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
    >
      <div className="mos-erp-advisory__head">
        <SeverityTag severity={advisory.severity} />
        <span className="mos-erp-tag">{CATEGORY_LABEL[advisory.category] ?? advisory.category}</span>
      </div>
      <h3 className="mos-erp-advisory__title">{advisory.title}</h3>
      <p className="mos-erp-advisory__line"><strong>Neden:</strong> {advisory.reason}</p>
      <p className="mos-erp-advisory__line"><strong>Etki:</strong> {advisory.impact}</p>
      <p className="mos-erp-advisory__line mos-erp-advisory__rec"><strong>Öneri:</strong> {advisory.recommendation}</p>
    </button>
  )
}

const EMPTY_FILTERS = { category: '', severity: '', q: '' }

export default function OperationsAdvisorPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))

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
    getOperationsAdvisor(query)
      .then((res) => {
        if (!alive) return
        setData(res)
        setSelectedId(res.advisories[0]?.id ?? null)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Tavsiyeler yüklenemedi')
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
      { id: 'total', label: 'Toplam Tavsiye', value: String(s.totalAdvisories) },
      { id: 'critical', label: 'Kritik', value: String(s.criticalCount), valueTone: 'critical' },
      { id: 'warning', label: 'Uyarı', value: String(s.warningCount), valueTone: 'warning' },
      { id: 'info', label: 'Bilgi', value: String(s.infoCount) },
      { id: 'top', label: 'En Kritik Konu', value: s.topIssue ? s.topIssue.title : '—' },
    ]
  }, [s])

  const advisories = data?.advisories ?? []
  const bySeverity = useMemo(
    () => ({
      CRITICAL: advisories.filter((a) => a.severity === 'CRITICAL'),
      WARNING: advisories.filter((a) => a.severity === 'WARNING'),
      INFO: advisories.filter((a) => a.severity === 'INFO'),
    }),
    [advisories],
  )

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">AI Operasyon Danışmanı</h1>
          <span className="mos-erp-ops__sub">
            Bugün neye müdahale etmeliyim? · Açıklanabilir, kural tabanlı öneriler{data?.today ? ` · ${data.today}` : ''}
          </span>
        </div>
      </header>

      <ErpOpsSummaryStrip metrics={summaryMetrics} ariaLabel="Danışman özeti" summaryClassName="mos-erp-summary--cols-5" />

      <div className="mos-erp-cockpit-filters" aria-label="Danışman filtreleri">
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="adv-cat">Kategori</label>
          <select id="adv-cat" className="mos-erp-filters__field" value={filters.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">Tümü</option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="adv-sev">Şiddet</label>
          <select id="adv-sev" className="mos-erp-filters__field" value={filters.severity} onChange={(e) => set('severity', e.target.value)}>
            <option value="">Tümü</option>
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="adv-q">Arama</label>
          <input id="adv-q" type="text" className="mos-erp-filters__field" placeholder="Başlık / neden / öneri" value={filters.q} onChange={(e) => set('q', e.target.value)} />
        </div>
      </div>

      {loading && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">Yükleniyor…</span></div>}
      {!loading && error && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">{error}</span></div>}

      {!loading && !error && data && (
        <>
          {advisories.length === 0 && (
            <div className="mos-erp-detail mos-erp-detail--empty">
              <span className="mos-erp-detail__empty">Aktif tavsiye yok — operasyon temiz görünüyor.</span>
            </div>
          )}

          {bySeverity.CRITICAL.length > 0 && (
            <section className="mos-erp-cockpit-section" aria-label="Kritik tavsiyeler">
              <h2 className="mos-erp-cockpit-section__title">Kritik Tavsiyeler ({bySeverity.CRITICAL.length})</h2>
              <div className="mos-erp-cockpit-grid">
                {bySeverity.CRITICAL.map((a) => (
                  <AdvisoryCard key={a.id} advisory={a} onSelect={setSelectedId} selected={selectedId === a.id} />
                ))}
              </div>
            </section>
          )}

          {bySeverity.WARNING.length > 0 && (
            <section className="mos-erp-cockpit-section" aria-label="Uyarılar">
              <h2 className="mos-erp-cockpit-section__title">Uyarılar ({bySeverity.WARNING.length})</h2>
              <div className="mos-erp-cockpit-grid">
                {bySeverity.WARNING.map((a) => (
                  <AdvisoryCard key={a.id} advisory={a} onSelect={setSelectedId} selected={selectedId === a.id} />
                ))}
              </div>
            </section>
          )}

          {bySeverity.INFO.length > 0 && (
            <section className="mos-erp-cockpit-section" aria-label="Bilgilendirmeler">
              <h2 className="mos-erp-cockpit-section__title">Bilgilendirmeler ({bySeverity.INFO.length})</h2>
              <div className="mos-erp-cockpit-grid">
                {bySeverity.INFO.map((a) => (
                  <AdvisoryCard key={a.id} advisory={a} onSelect={setSelectedId} selected={selectedId === a.id} />
                ))}
              </div>
            </section>
          )}

          <section className="mos-erp-cockpit-section" aria-label="Tüm tavsiyeler">
            <h2 className="mos-erp-cockpit-section__title">Tüm Tavsiyeler</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Şiddet</th>
                    <th>Kategori</th>
                    <th>Başlık</th>
                    <th>Etki</th>
                    <th>Öneri</th>
                    <th>Kanıt</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {advisories.length === 0 && (
                    <tr className="mos-erp-tbl-empty"><td colSpan={7}>Tavsiye yok.</td></tr>
                  )}
                  {advisories.map((a) => (
                    <tr
                      key={a.id}
                      className={`mos-erp-tbl-row${selectedId === a.id ? ' is-selected' : ''}`}
                      onClick={() => setSelectedId(a.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td><SeverityTag severity={a.severity} /></td>
                      <td>{CATEGORY_LABEL[a.category] ?? a.category}</td>
                      <td className="mos-erp-tbl-td--customer">{a.title}</td>
                      <td className="mos-erp-tbl-td--muted">{a.impact}</td>
                      <td>{a.recommendation}</td>
                      <td className="mos-erp-tbl-td--muted">
                        {Object.entries(a.evidence ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </td>
                      <td className="mos-erp-tbl-td--muted">{(a.createdAt ?? '').slice(0, 10)}</td>
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
