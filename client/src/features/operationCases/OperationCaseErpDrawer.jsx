import { useCallback, useEffect, useMemo, useState } from 'react'
import { getOperationCaseDetail, updateOperationCase } from '../../services/operationCaseClient.js'
import { getCurrentAuthUser } from '../../lib/operationActor.js'
import { useOrders } from '../../state/useOrders.js'
import { buildSshMissingPartsQueue } from '../../mappers/ssh/sshMissingPartsModel.js'
import {
  buildCaseCollectionLines,
  CATEGORY_LABEL,
  STATUS_LABEL,
} from '../../mappers/operationCase/operationCaseWarRoomModel.js'
import './operation-case-drawer.css'

const PRIORITY_TONE = { P1: 'critical', P2: 'warning', P3: 'info', P4: 'info', P5: 'info' }
const PRIORITY_LABEL = {
  P1: 'P1 · Acil',
  P2: 'P2 · Yüksek',
  P3: 'P3 · Orta',
  P4: 'P4 · Normal',
  P5: 'P5 · Düşük',
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

/**
 * @param {{
 *   open: boolean
 *   caseId: string | null
 *   displayPriority?: string | null
 *   limitedView?: boolean
 *   todayIso?: string
 *   onClose: () => void
 *   onUpdated?: () => void
 * }} props
 */
export default function OperationCaseErpDrawer({
  open,
  caseId,
  displayPriority,
  limitedView,
  todayIso,
  onClose,
  onUpdated,
}) {
  const { orders, salesOrderListItemDtos } = useOrders()
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [actionError, setActionError] = useState(/** @type {string | null} */ (null))
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (!open || !caseId) return () => {}
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
  }, [caseId, limitedView, open])

  useEffect(() => load(), [load])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  async function patch(body) {
    if (!caseId) return
    setBusy(true)
    setActionError(null)
    try {
      await updateOperationCase(caseId, body)
      load()
      onUpdated?.()
    } catch (err) {
      setActionError(err?.body?.message ?? err?.message ?? 'Güncellenemedi')
    } finally {
      setBusy(false)
    }
  }

  const c = data?.case ?? null
  const shownPriority = displayPriority ?? c?.priority
  const currentUser = useMemo(() => getCurrentAuthUser(), [])
  const listItemDtos = salesOrderListItemDtos ?? []
  const today = todayIso ?? new Date().toISOString().slice(0, 10)

  const sshRecords = useMemo(() => {
    if (!c?.orderIds?.length) return []
    const cards = buildSshMissingPartsQueue({
      orders,
      listItemDtos,
      todayIso: today,
    })
    const idSet = new Set(c.orderIds)
    return cards.filter((card) => idSet.has(card.orderId))
  }, [c?.orderIds, orders, listItemDtos, today])

  const collectionLines = useMemo(() => {
    if (!c?.orderIds?.length) return []
    return buildCaseCollectionLines(c.orderIds, orders, listItemDtos)
  }, [c?.orderIds, orders, listItemDtos])

  if (!open || !caseId) return null

  return (
    <>
      <button
        type="button"
        className="case-erp-drawer__scrim"
        aria-label="Vaka detayını kapat"
        onClick={onClose}
      />
      <aside className="case-erp-drawer" role="complementary" aria-label="Vaka detayı">
        {loading && <div className="case-erp-drawer__loading">Yükleniyor…</div>}
        {!loading && error && <div className="case-erp-drawer__loading">{error}</div>}

        {!loading && !error && c && (
          <>
            <header className="case-erp-drawer__hero">
              <div className="case-erp-drawer__head-row">
                <div>
                  <h2 className="case-erp-drawer__title">{c.title}</h2>
                  <span className="case-erp-drawer__sub">{c.caseNumber}</span>
                </div>
                <button
                  type="button"
                  className="case-erp-drawer__close"
                  aria-label="Kapat"
                  onClick={onClose}
                >
                  ×
                </button>
              </div>
              <div className="case-erp-drawer__tags">
                <Tag tone={PRIORITY_TONE[shownPriority]}>{PRIORITY_LABEL[shownPriority] ?? shownPriority}</Tag>
                <Tag tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status] ?? c.status}</Tag>
                {c.riskLevel ? <Tag tone="critical">Risk: {c.riskLevel}</Tag> : null}
              </div>
              <div className="case-erp-drawer__actions">
                <button
                  type="button"
                  className="case-erp-drawer__action case-erp-drawer__action--primary"
                  disabled={busy || !currentUser}
                  onClick={() =>
                    patch({
                      ownerUserId: currentUser?.id ?? 'me',
                      ownerRole: currentUser?.role ?? 'OPERATION',
                    })
                  }
                >
                  Devral
                </button>
                {STATUS_ACTIONS.map((act) => (
                  <button
                    key={act.status}
                    type="button"
                    className="case-erp-drawer__action"
                    disabled={busy || c.status === act.status || !canTransition(c.status, act.status)}
                    onClick={() => patch({ status: act.status })}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
              {actionError ? <p className="case-erp-drawer__alert">{actionError}</p> : null}
            </header>

            <div className="case-erp-drawer__body">
              <section className="case-erp-drawer__section" aria-label="Vaka özeti">
                <h3 className="case-erp-drawer__section-title">Vaka Özeti</h3>
                <dl className="case-erp-drawer__kv">
                  <div className="case-erp-drawer__kv-row">
                    <dt>Müşteri</dt>
                    <dd>{c.customerName ?? '—'}</dd>
                  </div>
                  <div className="case-erp-drawer__kv-row">
                    <dt>Sorumlu</dt>
                    <dd>{c.ownerRole || c.ownerUserId || '—'}</dd>
                  </div>
                  <div className="case-erp-drawer__kv-row">
                    <dt>Açıklama</dt>
                    <dd>{c.description}</dd>
                  </div>
                  <div className="case-erp-drawer__kv-row">
                    <dt>Açılış</dt>
                    <dd>{(c.createdAt ?? '').slice(0, 10)}</dd>
                  </div>
                  <div className="case-erp-drawer__kv-row">
                    <dt>Son güncelleme</dt>
                    <dd>{(c.updatedAt ?? '').slice(0, 10)}</dd>
                  </div>
                  {c.closedAt ? (
                    <div className="case-erp-drawer__kv-row">
                      <dt>Kapanış</dt>
                      <dd>{c.closedAt.slice(0, 10)}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section className="case-erp-drawer__section" aria-label="Zaman çizelgesi">
                <h3 className="case-erp-drawer__section-title">Timeline</h3>
                {data.timeline.length === 0 ? (
                  <p className="case-erp-drawer__empty">Kayıt yok.</p>
                ) : (
                  <ol className="case-erp-drawer__timeline">
                    {data.timeline.map((ev, i) => (
                      <li key={`${ev.at}-${i}`} className="case-erp-drawer__timeline-item">
                        <span className="case-erp-drawer__timeline-msg">{ev.message}</span>
                        <span className="case-erp-drawer__timeline-meta">
                          {(ev.at ?? '').slice(0, 16).replace('T', ' ')}
                          {ev.actor ? ` · ${ev.actor}` : ''}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="case-erp-drawer__section" aria-label="İlgili siparişler">
                <h3 className="case-erp-drawer__section-title">
                  İlgili Siparişler ({data.relatedOrders.length})
                </h3>
                {data.relatedOrders.length === 0 ? (
                  <p className="case-erp-drawer__empty">Sipariş bağlı değil.</p>
                ) : (
                  <dl className="case-erp-drawer__kv">
                    {data.relatedOrders.map((o) => (
                      <div key={o.orderId} className="case-erp-drawer__kv-row">
                        <dt>{o.orderNumber ?? o.orderId}</dt>
                        <dd>{o.customerName ?? '—'}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              <section className="case-erp-drawer__section" aria-label="İlgili SSH kayıtları">
                <h3 className="case-erp-drawer__section-title case-erp-drawer__section-title--ssh">
                  İlgili SSH Kayıtları ({sshRecords.length})
                </h3>
                {sshRecords.length === 0 ? (
                  <p className="case-erp-drawer__empty">SSH kaydı yok.</p>
                ) : (
                  <dl className="case-erp-drawer__kv">
                    {sshRecords.map((s) => (
                      <div key={s.id} className="case-erp-drawer__kv-row">
                        <dt>{s.partTitle}</dt>
                        <dd>
                          {s.statusLabel}
                          {s.locksShipment ? ' · Sevk kilidi' : ''}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              <section className="case-erp-drawer__section" aria-label="İlgili tahsilatlar">
                <h3 className="case-erp-drawer__section-title case-erp-drawer__section-title--collection">
                  İlgili Tahsilatlar ({collectionLines.length})
                </h3>
                {collectionLines.length === 0 ? (
                  <p className="case-erp-drawer__empty">Açık tahsilat yok.</p>
                ) : (
                  <dl className="case-erp-drawer__kv">
                    {collectionLines.map((line) => (
                      <div key={line.orderId} className="case-erp-drawer__kv-row">
                        <dt>{line.orderNumber}</dt>
                        <dd>
                          {line.balanceLabel} · {line.risk}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              {data.relatedActions.length > 0 ? (
                <section className="case-erp-drawer__section" aria-label="İlgili görevler">
                  <h3 className="case-erp-drawer__section-title">
                    Görevler ({data.relatedActions.length})
                  </h3>
                  <dl className="case-erp-drawer__kv">
                    {data.relatedActions.slice(0, 6).map((a) => (
                      <div key={a.id} className="case-erp-drawer__kv-row">
                        <dt>{CATEGORY_LABEL[a.category] ?? a.category}</dt>
                        <dd>{a.recommendedAction}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              <section className="case-erp-drawer__section" aria-label="Notlar">
                <h3 className="case-erp-drawer__section-title">Notlar</h3>
                <p className="case-erp-drawer__empty">
                  {data.notes.length === 0 ? 'Henüz not yok.' : data.notes.join(' · ')}
                </p>
              </section>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
