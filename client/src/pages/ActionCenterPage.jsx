import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getActionCenter, updateActionStatus } from '../services/actionCenterClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import '../styles/mos-erp-ops.css'

const PRIORITY_TONE = { P1: 'critical', P2: 'warning', P3: 'info', P4: 'info', P5: 'info' }
const PRIORITY_LABEL = { P1: 'P1 · Acil', P2: 'P2 · Yüksek', P3: 'P3 · Orta', P4: 'P4 · Normal', P5: 'P5 · Düşük' }

const CATEGORY_LABEL = {
  COLLECTION: 'Tahsilat',
  SHIPMENT: 'Sevk',
  DATA_QUALITY: 'Veri Kalitesi',
  SALES: 'Satış',
  SUPPLIER: 'Tedarikçi',
  OPERATIONS: 'Operasyon',
  RISK: 'Risk',
}

const STATUS_LABEL = {
  OPEN: 'Açık',
  ASSIGNED: 'Atandı',
  IN_PROGRESS: 'Devam Ediyor',
  COMPLETED: 'Tamamlandı',
  DISMISSED: 'Reddedildi',
}
const STATUS_TONE = {
  OPEN: 'info',
  ASSIGNED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  DISMISSED: 'muted',
}

const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))
const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))
const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))

const STATUS_ACTIONS = [
  { status: 'ASSIGNED', label: 'Atandı' },
  { status: 'IN_PROGRESS', label: 'Başlatıldı' },
  { status: 'COMPLETED', label: 'Tamamlandı' },
  { status: 'DISMISSED', label: 'Reddedildi' },
]

const ACTIVE_STATUSES = new Set(['OPEN', 'ASSIGNED', 'IN_PROGRESS'])

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

function relatedRecordText(a) {
  if (a.relatedOrder) return a.relatedOrder
  if (a.relatedEntityId) return a.relatedEntityId
  return '—'
}

function ActionTable({ actions, selectedId, onSelect }) {
  return (
    <div className="mos-erp-tbl-wrap">
      <table className="mos-erp-tbl">
        <thead>
          <tr>
            <th>Öncelik</th>
            <th>Kategori</th>
            <th>Görev</th>
            <th>Önerilen Aksiyon</th>
            <th>Atanan Rol</th>
            <th>Durum</th>
            <th>İlgili Kayıt</th>
            <th>Oluşturma</th>
            <th>Son İşlem</th>
          </tr>
        </thead>
        <tbody>
          {actions.length === 0 && (
            <tr className="mos-erp-tbl-empty"><td colSpan={9}>Görev yok.</td></tr>
          )}
          {actions.map((a) => (
            <tr
              key={a.id}
              className={`mos-erp-tbl-row${selectedId === a.id ? ' is-selected' : ''}${a.priority === 'P1' && ACTIVE_STATUSES.has(a.status) ? ' is-critical' : ''}`}
              onClick={() => onSelect(a.id)}
            >
              <td className="mos-erp-tbl-td--prio"><Tag tone={PRIORITY_TONE[a.priority]}>{a.priority}</Tag></td>
              <td>{CATEGORY_LABEL[a.category] ?? a.category}</td>
              <td className="mos-erp-tbl-td--customer">{a.title}</td>
              <td className="mos-erp-tbl-td--action">{a.recommendedAction}</td>
              <td className="mos-erp-tbl-td--muted">{a.assignedRole}</td>
              <td><Tag tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status] ?? a.status}</Tag></td>
              <td className="mos-erp-tbl-td--muted">{relatedRecordText(a)}</td>
              <td className="mos-erp-tbl-td--muted">{(a.createdAt ?? '').slice(0, 10)}</td>
              <td className="mos-erp-tbl-td--muted">{(a.lastActionAt ?? '').slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const EMPTY_FILTERS = { priority: '', category: '', status: '', q: '' }

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function ActionCenterPage({ embedded = false }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [actionError, setActionError] = useState(/** @type {string | null} */ (null))
  const [busy, setBusy] = useState(false)

  const limitedView = useMemo(() => {
    const role = getCurrentAuthUser()?.role
    return role === 'SALES' || role === 'sales'
  }, [])

  const load = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    if (limitedView) query.limitedView = 'true'
    getActionCenter(query)
      .then((res) => {
        if (!alive) return
        setData(res)
        setSelectedId((prev) => (prev && res.actions.some((a) => a.id === prev) ? prev : res.actions[0]?.id ?? null))
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Görevler yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [filters, limitedView])

  useEffect(() => load(), [load])

  function set(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  async function changeStatus(id, status) {
    setBusy(true)
    setActionError(null)
    try {
      await updateActionStatus(id, status)
      load()
    } catch (err) {
      setActionError(err?.body?.message ?? err?.message ?? 'Durum güncellenemedi')
    } finally {
      setBusy(false)
    }
  }

  const s = data?.summary ?? null
  const summaryMetrics = useMemo(() => {
    if (!s) return []
    return [
      { id: 'open', label: 'Toplam Açık Görev', value: String(s.totalOpen) },
      { id: 'p1', label: 'P1 (Acil)', value: String(s.p1Count), valueTone: 'critical' },
      { id: 'p2', label: 'P2 (Yüksek)', value: String(s.p2Count), valueTone: 'warning' },
      { id: 'completed', label: 'Tamamlanan', value: String(s.completedCount), valueTone: 'success' },
      { id: 'dismissed', label: 'Reddedilen', value: String(s.dismissedCount) },
      { id: 'rate', label: 'Tamamlanma Oranı', value: `%${s.completionRate}` },
    ]
  }, [s])

  const actions = data?.actions ?? []
  const selected = useMemo(() => actions.find((a) => a.id === selectedId) ?? null, [actions, selectedId])

  const groups = useMemo(() => {
    const p1 = actions.filter((a) => a.priority === 'P1' && ACTIVE_STATUSES.has(a.status))
    const open = actions.filter((a) => ACTIVE_STATUSES.has(a.status))
    const completed = actions.filter((a) => a.status === 'COMPLETED')
    return { p1, open, completed }
  }, [actions])

  return (
    <div className={embedded ? 'mos-hub-pane mos-erp-ops' : 'mos-page mos-erp-ops'}>
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">Otomatik Aksiyon Merkezi</h1>
            <span className="mos-erp-ops__sub">
              Bugün hangi işi, kim, hangi öncelikle yapmalı? · Kural tabanlı görev listesi
              {data?.today ? ` · ${data.today}` : ''}
            </span>
          </div>
        </header>
      ) : null}

      <ErpOpsSummaryStrip metrics={summaryMetrics} ariaLabel="Aksiyon özeti" summaryClassName="mos-erp-summary--cols-6" />

      <div className="mos-erp-cockpit-filters" aria-label="Görev filtreleri">
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="ac-prio">Öncelik</label>
          <select id="ac-prio" className="mos-erp-filters__field" value={filters.priority} onChange={(e) => set('priority', e.target.value)}>
            <option value="">Tümü</option>
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="ac-cat">Kategori</label>
          <select id="ac-cat" className="mos-erp-filters__field" value={filters.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">Tümü</option>
            {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="ac-status">Durum</label>
          <select id="ac-status" className="mos-erp-filters__field" value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">Tümü</option>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="ac-q">Arama</label>
          <input id="ac-q" type="text" className="mos-erp-filters__field" placeholder="Görev / müşteri / sipariş" value={filters.q} onChange={(e) => set('q', e.target.value)} />
        </div>
      </div>

      {loading && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">Yükleniyor…</span></div>}
      {!loading && error && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">{error}</span></div>}

      {!loading && !error && data && (
        <>
          {selected ? (
            <div className="mos-erp-detail">
              <div className="mos-erp-detail__grid">
                <div className="mos-erp-detail__body">
                  <div className="mos-erp-detail__primary">
                    <p className="mos-erp-detail__name">{selected.title}</p>
                    <span className="mos-erp-detail__meta">
                      <Tag tone={PRIORITY_TONE[selected.priority]}>{PRIORITY_LABEL[selected.priority] ?? selected.priority}</Tag>{' '}
                      <Tag>{CATEGORY_LABEL[selected.category] ?? selected.category}</Tag>{' '}
                      <Tag tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status] ?? selected.status}</Tag>
                    </span>
                  </div>
                  <div className="mos-erp-detail__field">
                    <span className="mos-erp-detail__field-label">Sebep</span>
                    <span className="mos-erp-detail__field-value">{selected.reason}</span>
                  </div>
                  <div className="mos-erp-detail__field">
                    <span className="mos-erp-detail__field-label">Öneri</span>
                    <span className="mos-erp-detail__field-value">{selected.recommendedAction}</span>
                  </div>
                  <div className="mos-erp-detail__field">
                    <span className="mos-erp-detail__field-label">Atanan Rol</span>
                    <span className="mos-erp-detail__field-value">{selected.assignedRole}</span>
                  </div>
                  {selected.riskLabel && (
                    <div className="mos-erp-detail__field">
                      <span className="mos-erp-detail__field-label">Risk</span>
                      <span className="mos-erp-detail__field-value mos-erp-detail__field-value--critical">{selected.riskLabel}</span>
                    </div>
                  )}
                  {(selected.relatedCustomer || selected.relatedOrder || selected.relatedShipment) && (
                    <div className="mos-erp-detail__field">
                      <span className="mos-erp-detail__field-label">İlişkili</span>
                      <span className="mos-erp-detail__field-value">
                        {[
                          selected.relatedCustomer && `Müşteri: ${selected.relatedCustomer}`,
                          selected.relatedOrder && `Sipariş: ${selected.relatedOrder}`,
                          selected.relatedShipment && `Sevk: ${selected.relatedShipment}`,
                        ].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </div>
                  )}
                  <div className="mos-erp-detail__field">
                    <span className="mos-erp-detail__field-label">Kanıt</span>
                    <span className="mos-erp-detail__field-value">
                      {Object.entries(selected.evidence ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}
                    </span>
                  </div>
                </div>
                <div className="mos-erp-detail__actions">
                  {STATUS_ACTIONS.map((act) => (
                    <button
                      key={act.status}
                      type="button"
                      className={`mos-erp-detail__action${act.status === 'COMPLETED' ? ' mos-erp-detail__action--primary' : ''}`}
                      disabled={busy || selected.status === act.status}
                      onClick={() => changeStatus(selected.id, act.status)}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>
              {actionError && <p className="mos-erp-ops__alert">{actionError}</p>}
            </div>
          ) : (
            <div className="mos-erp-detail mos-erp-detail--empty">
              <span className="mos-erp-detail__empty">Aktif görev yok — operasyon temiz görünüyor.</span>
            </div>
          )}

          {groups.p1.length > 0 && (
            <section className="mos-erp-cockpit-section" aria-label="P1 görevler">
              <h2 className="mos-erp-cockpit-section__title">P1 Görevler ({groups.p1.length})</h2>
              <ActionTable actions={groups.p1} selectedId={selectedId} onSelect={setSelectedId} />
            </section>
          )}

          <section className="mos-erp-cockpit-section" aria-label="Açık görevler">
            <h2 className="mos-erp-cockpit-section__title">Açık Görevler ({groups.open.length})</h2>
            <ActionTable actions={groups.open} selectedId={selectedId} onSelect={setSelectedId} />
          </section>

          {groups.completed.length > 0 && (
            <section className="mos-erp-cockpit-section" aria-label="Tamamlanan görevler">
              <h2 className="mos-erp-cockpit-section__title">Tamamlanan Görevler ({groups.completed.length})</h2>
              <ActionTable actions={groups.completed} selectedId={selectedId} onSelect={setSelectedId} />
            </section>
          )}

          <section className="mos-erp-cockpit-section" aria-label="Tüm görevler">
            <h2 className="mos-erp-cockpit-section__title">Tüm Görevler ({actions.length})</h2>
            <ActionTable actions={actions} selectedId={selectedId} onSelect={setSelectedId} />
          </section>
        </>
      )}
    </div>
  )
}
