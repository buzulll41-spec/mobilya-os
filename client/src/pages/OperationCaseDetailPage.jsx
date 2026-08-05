import { useCallback, useEffect, useMemo, useState } from 'react'
import { getOperationCaseDetail, updateOperationCase } from '../services/operationCaseClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import '../styles/mos-erp-ops.css'

const PRIORITY_TONE = { P1: 'critical', P2: 'warning', P3: 'info', P4: 'info', P5: 'info' }
const PRIORITY_LABEL = { P1: 'P1 · Acil', P2: 'P2 · Yüksek', P3: 'P3 · Orta', P4: 'P4 · Normal', P5: 'P5 · Düşük' }

const STATUS_LABEL = {
  OPEN: 'Açık',
  ASSIGNED: 'Atandı',
  IN_PROGRESS: 'Devam Ediyor',
  WAITING: 'Bekliyor',
  RESOLVED: 'Çözüldü',
  CLOSED: 'Kapandı',
}
const STATUS_TONE = {
  OPEN: 'info',
  ASSIGNED: 'info',
  IN_PROGRESS: 'warning',
  WAITING: 'muted',
  RESOLVED: 'success',
  CLOSED: 'success',
}

const STATUS_ACTIONS = [
  { status: 'ASSIGNED', label: 'Atandı' },
  { status: 'IN_PROGRESS', label: 'Başlat' },
  { status: 'WAITING', label: 'Beklet' },
  { status: 'RESOLVED', label: 'Çöz' },
  { status: 'CLOSED', label: 'Kapat' },
]

const CATEGORY_LABEL = {
  COLLECTION: 'Tahsilat',
  SHIPMENT: 'Sevk',
  DATA_QUALITY: 'Veri Kalitesi',
  SALES: 'Satış',
  SUPPLIER: 'Tedarikçi',
  OPERATIONS: 'Operasyon',
  RISK: 'Risk',
}

const FORWARD = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
function canTransition(from, to) {
  if (to === 'CLOSED') return true
  if (to === 'WAITING') return from === 'IN_PROGRESS' || from === 'WAITING'
  if (from === 'WAITING') return to === 'IN_PROGRESS'
  const f = FORWARD.indexOf(from)
  const t = FORWARD.indexOf(to)
  if (f < 0 || t < 0) return false
  return t >= f
}

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

function Kv({ label, value, tone }) {
  return (
    <div className="mos-erp-kv">
      <span className="mos-erp-kv__label">{label}</span>
      <span className={`mos-erp-kv__value${tone ? ` mos-erp-kv__value--${tone}` : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

/**
 * @param {{ caseId: string, limitedView?: boolean, onBack: () => void }} props
 */
export default function OperationCaseDetailPage({ caseId, limitedView, onBack }) {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [actionError, setActionError] = useState(/** @type {string | null} */ (null))
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const query = limitedView ? { limitedView: 'true' } : {}
    getOperationCaseDetail(caseId, query)
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.body?.message ?? err?.message ?? 'Vaka yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [caseId, limitedView])

  useEffect(() => load(), [load])

  async function patch(body) {
    setBusy(true)
    setActionError(null)
    try {
      await updateOperationCase(caseId, body)
      load()
    } catch (err) {
      setActionError(err?.body?.message ?? err?.message ?? 'Güncellenemedi')
    } finally {
      setBusy(false)
    }
  }

  const c = data?.case ?? null
  const currentUser = useMemo(() => getCurrentAuthUser(), [])

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Vaka Detayı{c ? ` · ${c.caseNumber}` : ''}</h1>
          <span className="mos-erp-ops__sub">Operasyon Orkestrasyon Merkezi · Vaka inceleme ve yönetim</span>
        </div>
        <button type="button" className="mos-erp-detail__action" onClick={onBack}>
          ← Vaka listesine dön
        </button>
      </header>

      {loading && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">Yükleniyor…</span></div>}
      {!loading && error && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">{error}</span></div>}

      {!loading && !error && c && (
        <>
          <div className="mos-erp-detail">
            <div className="mos-erp-detail__grid">
              <div className="mos-erp-detail__body">
                <div className="mos-erp-detail__primary">
                  <p className="mos-erp-detail__name">{c.title}</p>
                  <span className="mos-erp-detail__meta">
                    <Tag tone={PRIORITY_TONE[c.priority]}>{PRIORITY_LABEL[c.priority] ?? c.priority}</Tag>{' '}
                    <Tag tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status] ?? c.status}</Tag>{' '}
                    {c.riskLevel && <Tag tone="critical">Risk: {c.riskLevel}</Tag>}
                  </span>
                </div>
                <div className="mos-erp-detail__field">
                  <span className="mos-erp-detail__field-label">Açıklama</span>
                  <span className="mos-erp-detail__field-value">{c.description}</span>
                </div>
              </div>
              <div className="mos-erp-detail__actions">
                <button
                  type="button"
                  className="mos-erp-detail__action mos-erp-detail__action--primary"
                  disabled={busy || !currentUser}
                  onClick={() => patch({ ownerUserId: currentUser?.id ?? 'me', ownerRole: currentUser?.role ?? 'OPERATION' })}
                >
                  Devral
                </button>
                {STATUS_ACTIONS.map((act) => (
                  <button
                    key={act.status}
                    type="button"
                    className="mos-erp-detail__action"
                    disabled={busy || c.status === act.status || !canTransition(c.status, act.status)}
                    onClick={() => patch({ status: act.status })}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
            {actionError && <p className="mos-erp-ops__alert">{actionError}</p>}
          </div>

          <div className="mos-erp-cockpit-grid">
            <section className="mos-erp-panel" aria-label="Vaka özeti">
              <h2 className="mos-erp-panel__title">Vaka Özeti</h2>
              <Kv label="Vaka No" value={c.caseNumber} />
              <Kv label="Müşteri" value={c.customerName} />
              <Kv label="Öncelik" value={PRIORITY_LABEL[c.priority] ?? c.priority} tone={c.priority === 'P1' ? 'critical' : undefined} />
              <Kv label="Durum" value={STATUS_LABEL[c.status] ?? c.status} />
              <Kv label="Risk" value={c.riskLevel} tone={c.riskLevel ? 'critical' : undefined} />
              <Kv label="Sahip" value={c.ownerRole || c.ownerUserId} />
              <Kv label="Sipariş Sayısı" value={String(c.orderCount)} />
              <Kv label="Görev Sayısı" value={String(c.actionCount)} />
              <Kv label="Oluşturma" value={(c.createdAt ?? '').slice(0, 10)} />
              <Kv label="Son Güncelleme" value={(c.updatedAt ?? '').slice(0, 10)} />
              {c.closedAt && <Kv label="Kapanış" value={(c.closedAt ?? '').slice(0, 10)} tone="success" />}
            </section>

            <section className="mos-erp-panel" aria-label="İlişkili siparişler">
              <h2 className="mos-erp-panel__title">İlişkili Siparişler ({data.relatedOrders.length})</h2>
              {data.relatedOrders.length === 0 && (
                <div className="mos-erp-kv"><span className="mos-erp-kv__label">Sipariş bağlı değil</span><span className="mos-erp-kv__value">—</span></div>
              )}
              {data.relatedOrders.map((o) => (
                <Kv key={o.orderId} label={o.orderNumber ?? o.orderId} value={o.customerName} />
              ))}
            </section>
          </div>

          <section className="mos-erp-cockpit-section" aria-label="İlişkili görevler">
            <h2 className="mos-erp-cockpit-section__title">İlişkili Görevler ({data.relatedActions.length})</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Öncelik</th>
                    <th>Kategori</th>
                    <th>Görev</th>
                    <th>Önerilen Aksiyon</th>
                    <th>Atanan Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {data.relatedActions.length === 0 && (
                    <tr className="mos-erp-tbl-empty"><td colSpan={5}>Görev yok.</td></tr>
                  )}
                  {data.relatedActions.map((a) => (
                    <tr key={a.id} className={`mos-erp-tbl-row${a.priority === 'P1' ? ' is-critical' : ''}`}>
                      <td className="mos-erp-tbl-td--prio"><Tag tone={PRIORITY_TONE[a.priority]}>{a.priority}</Tag></td>
                      <td>{CATEGORY_LABEL[a.category] ?? a.category}</td>
                      <td className="mos-erp-tbl-td--customer">{a.title}</td>
                      <td className="mos-erp-tbl-td--action">{a.recommendedAction}</td>
                      <td className="mos-erp-tbl-td--muted">{a.assignedRole}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mos-erp-cockpit-section" aria-label="Zaman çizelgesi">
            <h2 className="mos-erp-cockpit-section__title">Zaman Çizelgesi ({data.timeline.length})</h2>
            <ol className="mos-erp-timeline">
              {data.timeline.map((ev, i) => (
                <li key={`${ev.at}-${i}`} className="mos-erp-timeline__item">
                  <span className="mos-erp-timeline__dot" aria-hidden />
                  <div className="mos-erp-timeline__body">
                    <span className="mos-erp-timeline__msg">{ev.message}</span>
                    <span className="mos-erp-timeline__meta">
                      {(ev.at ?? '').slice(0, 16).replace('T', ' ')}{ev.actor ? ` · ${ev.actor}` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mos-erp-cockpit-section" aria-label="Notlar">
            <h2 className="mos-erp-cockpit-section__title">Notlar</h2>
            <div className="mos-erp-detail mos-erp-detail--empty">
              <span className="mos-erp-detail__empty">
                {data.notes.length === 0 ? 'Henüz not yok.' : data.notes.join(' · ')}
              </span>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
