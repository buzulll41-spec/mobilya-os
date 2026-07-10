import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEMO_TODAY } from '../../data/constants.js'
import { SHIPMENT_OPERATION_STATUS } from '../../contracts/v1/shipmentStatuses.js'
import {
  pickShipmentFromMutationResult,
  sanitizeShipmentsList,
} from '../../mappers/shipment/normalizeShipmentDto.js'
import { shipmentStatusOrPlanned } from '../../mappers/shipment/shipmentStatusLabel.js'
import { getShipmentFlowPresentation } from '../../mappers/shipment/shipmentOperationUx.js'
import { applyShipmentStatusAdvance } from '../../mappers/shipment/applyShipmentStatusAdvance.js'
import {
  buildSimplifiedShipmentStepperSteps,
  orderNeedsInstallation,
} from '../../mappers/shipment/shipmentSimplifiedFlow.js'
import {
  buildStatusTimestampMap,
  buildShipmentVerticalTimeline,
  formatShipmentDateTime,
} from '../../mappers/shipment/shipmentStepperModel.js'
import {
  FULFILLMENT_STATE_LABELS,
  INSTALLATION_STATE_LABELS,
  labelFor,
} from '../../mappers/operational/operationalStateLabelsTr.js'
import * as ordersClient from '../../services/ordersClient.js'
import { useOrders } from '../../state/useOrders.js'
import { formatApiErrorMessage } from '../../utils/apiErrorMessage.js'
import { formatShortDate } from '../../utils/dates.js'
import StatusBadge from '../../components/StatusBadge.jsx'
import { IconClose, IconTruck } from '../../components/Icons.jsx'
import ShipmentProcessStepper from './ShipmentProcessStepper.jsx'
import ShipmentVerticalTimeline from './ShipmentVerticalTimeline.jsx'
import ShipmentPlanLinePicker from './ShipmentPlanLinePicker.jsx'
import { validateShipmentPlanSelection } from '../../mappers/shipment/computeShipmentPlanLines.js'
import '../../styles/shipment-operation.css'

/** @typedef {import('../../mappers/shipment/computeShipmentPlanLines.js').ShipmentPlanLineDto} ShipmentPlanLineDto */

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/shipment.js').ShipmentDto} ShipmentDto */
/** @typedef {import('../../contracts/v1/shipmentStatuses.js').ShipmentOperationStatus} ShipmentOperationStatus */

/**
 * @param {ShipmentDto[]} items
 * @param {ShipmentDto | null | undefined} updated
 */
function mergeShipment(items, updated) {
  if (!updated?.id) return sanitizeShipmentsList(items)
  const i = items.findIndex((s) => s?.id === updated.id)
  if (i === -1) return sanitizeShipmentsList([...items, updated])
  const next = [...items]
  next[i] = updated
  return sanitizeShipmentsList(next)
}

/**
 * @param {{
 *   orderId: string | null
 *   initialShipmentId?: string | null
 *   open: boolean
 *   onClose: () => void
 *   returnLabel?: string
 * }} props
 */
export default function ShipmentOperationModal({
  orderId,
  initialShipmentId = null,
  open,
  onClose,
  returnLabel,
}) {
  const {
    orders,
    salesOrderListItemDtos,
    domainEvents,
    mutating,
    postOrderShipment,
    patchShipmentStatus,
  } = useOrders()

  const order = useMemo(
    () => (orderId ? orders.find((o) => o.id === orderId) ?? null : null),
    [orders, orderId],
  )
  const listItemDto = useMemo(
    () => (orderId ? salesOrderListItemDtos.find((d) => d.id === orderId) : undefined),
    [salesOrderListItemDtos, orderId],
  )

  const [shipments, setShipments] = useState(/** @type {ShipmentDto[]} */ ([]))
  const [activeShipmentId, setActiveShipmentId] = useState(/** @type {string | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [formError, setFormError] = useState(/** @type {string | null} */ (null))
  const [statusSaving, setStatusSaving] = useState(false)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [issueDraft, setIssueDraft] = useState('')
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [plannedDate, setPlannedDate] = useState('')
  const [crewName, setCrewName] = useState('')
  const [vehicleNote, setVehicleNote] = useState('')
  const [quickNote, setQuickNote] = useState('')
  const [sshPlanDismissed, setSshPlanDismissed] = useState(false)
  const [planLines, setPlanLines] = useState(/** @type {ShipmentPlanLineDto[]} */ ([]))
  const [planLinesLoading, setPlanLinesLoading] = useState(false)
  const [planSelection, setPlanSelection] = useState(
    /** @type {{ orderLineId: string, qty: number }[]} */ ([]),
  )
  const [receivingRiskAccepted, setReceivingRiskAccepted] = useState(false)

  const loadShipments = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    setPlanLinesLoading(true)
    setFormError(null)
    try {
      const [rows, planRows] = await Promise.all([
        ordersClient.getOrderShipments(orderId),
        ordersClient.getShipmentPlanLines(orderId),
      ])
      const list = sanitizeShipmentsList(rows)
      setShipments(list)
      setPlanLines(planRows)
      setActiveShipmentId((prev) => {
        if (prev && list.some((s) => s.id === prev)) return prev
        if (initialShipmentId && list.some((s) => s.id === initialShipmentId)) {
          return initialShipmentId
        }
        const openOne = list.find((s) => {
          const st = shipmentStatusOrPlanned(s.status)
          return (
            st !== SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE &&
            st !== SHIPMENT_OPERATION_STATUS.ISSUE
          )
        })
        return openOne?.id ?? list[0]?.id ?? null
      })
    } catch (e) {
      setFormError(formatApiErrorMessage(e))
    } finally {
      setLoading(false)
      setPlanLinesLoading(false)
    }
  }, [orderId, initialShipmentId])

  const planLinesKey = useMemo(
    () => planLines.map((p) => `${p.orderLineId}:${p.qtyRemaining}`).join('|'),
    [planLines],
  )

  useEffect(() => {
    if (!open || !orderId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- modal open: fetch shipments
    void loadShipments()
  }, [open, orderId, loadShipments])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const activeShipment = useMemo(
    () => shipments.find((s) => s.id === activeShipmentId) ?? shipments[0] ?? null,
    [shipments, activeShipmentId],
  )

  const timestamps = useMemo(
    () =>
      orderId
        ? buildStatusTimestampMap(domainEvents, orderId, activeShipment?.id)
        : {},
    [domainEvents, orderId, activeShipment?.id],
  )

  const needsInstallation = orderNeedsInstallation(listItemDto)

  const stepperSteps = useMemo(
    () =>
      buildSimplifiedShipmentStepperSteps(activeShipment?.status, timestamps, {
        needsInstallation,
      }),
    [activeShipment?.status, timestamps, needsInstallation],
  )

  const flow = useMemo(
    () => getShipmentFlowPresentation(activeShipment?.status, { listItemDto }),
    [activeShipment?.status, listItemDto],
  )

  const timelineEvents = useMemo(
    () =>
      orderId
        ? buildShipmentVerticalTimeline(domainEvents, orderId, activeShipment?.id)
        : [],
    [domainEvents, orderId, activeShipment?.id],
  )

  const currentAtLabel = useMemo(() => {
    const cur = shipmentStatusOrPlanned(activeShipment?.status)
    const ts = timestamps[cur]
    return ts ? formatShipmentDateTime(ts) : formatShortDate(activeShipment?.plannedShipDate ?? undefined)
  }, [activeShipment, timestamps])

  const opState = listItemDto?.operationalState

  if (!open || !order) return null

  const orderNo = listItemDto?.orderNumber ?? order.id
  const openMissingCount = listItemDto?.openMissingItemsCount ?? 0

  /**
   * @param {import('../../mappers/shipment/shipmentOperationUx.js').ShipmentFlowAction} action
   */
  async function handleAdvance(action) {
    if (!activeShipment) return
    setFormError(null)
    if (action.status === SHIPMENT_OPERATION_STATUS.ISSUE && !issueDraft.trim()) {
      setFormError('Sorun bildirimi için kısa bir not yazın.')
      return
    }
    setStatusSaving(true)
    try {
      const result = await applyShipmentStatusAdvance(
        (oid, sid, body) => patchShipmentStatus(oid, sid, body),
        order.id,
        activeShipment.id,
        {
          status: action.status,
          advanceChain: action.advanceChain,
          issueNote: issueDraft,
        },
      )
      const updated = pickShipmentFromMutationResult(result)
      if (updated) setShipments((prev) => mergeShipment(prev, updated))
      setShowIssueForm(false)
      setIssueDraft('')
      await loadShipments()
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    } finally {
      setStatusSaving(false)
    }
  }

  async function handlePlan(e) {
    e.preventDefault()
    if (!plannedDate.trim()) {
      setFormError('Plan tarihi zorunlu.')
      return
    }
    const lineCheck = validateShipmentPlanSelection(planLines, planSelection, {
      allowReceivingRisk: receivingRiskAccepted,
    })
    if (!lineCheck.ok) {
      setFormError(lineCheck.message ?? 'Ürün seçimi geçersiz.')
      return
    }
    setStatusSaving(true)
    try {
      const result = await postOrderShipment(order.id, {
        plannedDate: plannedDate.trim(),
        lines: planSelection,
        ...(receivingRiskAccepted ? { allowReceivingRisk: true } : {}),
        ...(crewName.trim() ? { crewName: crewName.trim() } : {}),
        ...(vehicleNote.trim() ? { vehicleNote: vehicleNote.trim() } : {}),
        ...(quickNote.trim() ? { note: quickNote.trim() } : {}),
      })
      const created = pickShipmentFromMutationResult(result)
      if (created) {
        setShipments((prev) => mergeShipment(prev, created))
        setActiveShipmentId(created.id)
      }
      setPlannedDate('')
      setCrewName('')
      setVehicleNote('')
      setShowPlanForm(false)
      await loadShipments()
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    } finally {
      setStatusSaving(false)
    }
  }

  const busy = loading || statusSaving || mutating
  const secondaryIssue = flow.deliveredChoices.find((c) => c.needsNote)

  return (
    <div className="som-root" role="presentation">
      <button type="button" className="som-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        className="som-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="som-modal-title"
      >
        <header className="som-head">
          <div className="som-head__left">
            {returnLabel ? (
              <button type="button" className="som-back" onClick={onClose}>
                {returnLabel}
              </button>
            ) : null}
            <p className="som-kicker">Sevk & Montaj</p>
            <h2 id="som-modal-title" className="som-title">
              {orderNo}
            </h2>
            <p className="som-customer">{order.customer}</p>
            <StatusBadge status={order.status} />
          </div>

          <div className="som-head__center">
            <div className="som-status-block">
              <span className="som-status-block__label">Şu anki durum</span>
              <p className="som-status-block__value">
                <IconTruck />
                {flow.currentLabel}
              </p>
              <p className="som-status-block__meta">{currentAtLabel ?? '—'}</p>
            </div>
            {flow.nextStepLabel && !flow.isTerminal ? (
              <div className="som-status-block som-status-block--next">
                <span className="som-status-block__label">Sıradaki adım</span>
                <p className="som-status-block__value som-status-block__value--muted">
                  {flow.nextStepLabel}
                </p>
              </div>
            ) : null}
          </div>

          <div className="som-head__actions">
            {flow.primaryAction && !flow.isTerminal ? (
              <button
                type="button"
                className="som-btn som-btn--primary"
                disabled={busy || !activeShipment}
                onClick={() => void handleAdvance(flow.primaryAction)}
              >
                {flow.primaryAction.ctaLabel ?? flow.primaryAction.label}
              </button>
            ) : null}
            {secondaryIssue && !flow.isTerminal ? (
              showIssueForm ? (
                <div className="som-issue-inline">
                  <input
                    type="text"
                    className="som-input"
                    placeholder="Ne oldu?"
                    value={issueDraft}
                    onChange={(e) => setIssueDraft(e.target.value)}
                    disabled={busy}
                    maxLength={300}
                  />
                  <button
                    type="button"
                    className="som-btn som-btn--ghost"
                    disabled={busy}
                    onClick={() => {
                      setShowIssueForm(false)
                      setIssueDraft('')
                    }}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    className="som-btn som-btn--danger-ghost"
                    disabled={busy}
                    onClick={() =>
                      void handleAdvance({
                        status: SHIPMENT_OPERATION_STATUS.ISSUE,
                      })
                    }
                  >
                    Kaydet
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="som-btn som-btn--ghost"
                  disabled={busy || !activeShipment}
                  onClick={() => setShowIssueForm(true)}
                >
                  Sorun bildir
                </button>
              )
            ) : null}
            <button type="button" className="som-close" onClick={onClose} aria-label="Kapat">
              <IconClose />
            </button>
          </div>
        </header>

        <div className="som-body">
          {loading ? <p className="som-muted">Yükleniyor…</p> : null}
          {formError ? (
            <p className="som-error" role="alert">
              {formError}
            </p>
          ) : null}

          {openMissingCount > 0 && (showPlanForm || shipments.length === 0) && !sshPlanDismissed ? (
            <div className="som-ssh-hint" role="status">
              <p>
                Bu siparişte eksik parça takibi var. Sevk planı oluşturmadan önce SSH kaydını
                kontrol edin.
              </p>
              <button
                type="button"
                className="som-btn som-btn--ghost som-btn--sm"
                onClick={() => setSshPlanDismissed(true)}
              >
                Yine de devam et
              </button>
            </div>
          ) : null}

          {shipments.length > 1 ? (
            <div className="som-shipment-tabs" role="tablist" aria-label="Sevk kayıtları">
              {shipments.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={s.id === activeShipment?.id}
                  className={`som-shipment-tab${s.id === activeShipment?.id ? ' som-shipment-tab--active' : ''}`}
                  onClick={() => setActiveShipmentId(s.id)}
                >
                  {s.shipmentNumber || s.id}
                </button>
              ))}
            </div>
          ) : null}

          {!loading && shipments.length === 0 ? (
            <div className="som-empty-panel">
              <p className="som-empty-title">Henüz sevk yok</p>
              <p className="som-muted">İlk sevki planlayarak süreci başlatın.</p>
              <button
                type="button"
                className="som-btn som-btn--primary"
                onClick={() => setShowPlanForm(true)}
              >
                Sevk planla
              </button>
            </div>
          ) : null}

          {activeShipment ? (
            <>
              <section className="som-section" aria-labelledby="som-stepper-heading">
                <h3 id="som-stepper-heading" className="som-section-title">
                  Süreç
                </h3>
                <ShipmentProcessStepper steps={stepperSteps} />
                {flow.isTerminal && flow.terminalMessage ? (
                  <p className="som-terminal-msg">{flow.terminalMessage}</p>
                ) : null}
              </section>

              <div className="som-cards-grid">
                <section className="som-card">
                  <h4 className="som-card-title">Sevk bilgileri</h4>
                  <dl className="som-dl">
                    <div>
                      <dt>Plan tarihi</dt>
                      <dd>{formatShortDate(activeShipment.plannedShipDate ?? undefined)}</dd>
                    </div>
                    <div>
                      <dt>Araç</dt>
                      <dd>{activeShipment.vehicleNote?.trim() || '—'}</dd>
                    </div>
                    <div>
                      <dt>Ekip</dt>
                      <dd>{activeShipment.crewName?.trim() || '—'}</dd>
                    </div>
                    <div>
                      <dt>İletişim</dt>
                      <dd>{order.phone?.trim() || '—'}</dd>
                    </div>
                    {activeShipment.lines?.length ? (
                      <div className="som-shipment-lines">
                        <dt>Bu sevkteki ürünler</dt>
                        <dd>
                          <ul className="som-shipment-lines__list">
                            {activeShipment.lines.map((ln) => {
                              const title =
                                planLines.find((p) => p.orderLineId === ln.orderLineId)?.title ??
                                ln.orderLineId
                              return (
                                <li key={ln.id}>
                                  {title} · {ln.qty} adet
                                </li>
                              )
                            })}
                          </ul>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </section>

                <section className="som-card">
                  <h4 className="som-card-title">Notlar</h4>
                  <p className="som-note-block">
                    {activeShipment.note?.trim() || order.notes?.trim() || 'Henüz not yok.'}
                  </p>
                  <label className="som-field">
                    <span className="som-field-label">Hızlı not (yeni sevkte kaydedilir)</span>
                    <textarea
                      className="som-input som-textarea"
                      rows={3}
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      placeholder="Saha notu…"
                      disabled={busy}
                    />
                  </label>
                </section>

                <section className="som-card som-card--muted">
                  <h4 className="som-card-title">Belgeler & fotoğraflar</h4>
                  <p className="som-muted">Teslim fotoğrafı, montaj görseli ve evrak yükleme yakında.</p>
                  <div className="som-doc-placeholders">
                    <span>Teslim fotoğrafı</span>
                    <span>Montaj görseli</span>
                    <span>Evrak</span>
                  </div>
                </section>
              </div>

              <div className="som-lower-grid">
                <section className="som-section">
                  <h3 className="som-section-title">Zaman çizelgesi</h3>
                  <ShipmentVerticalTimeline events={timelineEvents} />
                </section>

                <aside className="som-summary">
                  <h3 className="som-summary-title">Operasyon özeti</h3>
                  <dl className="som-summary-dl som-summary-dl--compact">
                      <div>
                        <dt>Ana süreç</dt>
                        <dd>{flow.currentLabel}</dd>
                      </div>
                    {opState ? (
                      <div>
                        <dt>Sevk / teslim</dt>
                        <dd>{labelFor(FULFILLMENT_STATE_LABELS, opState.fulfillmentState)}</dd>
                      </div>
                    ) : null}
                    {needsInstallation && opState ? (
                        <div>
                          <dt>Montaj</dt>
                          <dd>{labelFor(INSTALLATION_STATE_LABELS, opState.installationState)}</dd>
                        </div>
                      ) : null}
                    </dl>
                  <p className="som-summary-ref">Referans gün: {formatShortDate(DEMO_TODAY)}</p>
                </aside>
              </div>
            </>
          ) : null}

          {showPlanForm || (shipments.length === 0 && !loading) ? (
            <section className="som-plan">
              <h3 className="som-section-title">Yeni sevk planla</h3>
              <form className="som-plan-form" onSubmit={(e) => void handlePlan(e)}>
                <label className="som-field">
                  <span className="som-field-label">Plan tarihi</span>
                  <input
                    type="date"
                    className="som-input"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    required
                    disabled={busy}
                  />
                </label>
                <label className="som-field">
                  <span className="som-field-label">Montaj ekibi</span>
                  <input
                    type="text"
                    className="som-input"
                    value={crewName}
                    onChange={(e) => setCrewName(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label className="som-field">
                  <span className="som-field-label">Araç notu</span>
                  <input
                    type="text"
                    className="som-input"
                    value={vehicleNote}
                    onChange={(e) => setVehicleNote(e.target.value)}
                    disabled={busy}
                  />
                </label>
                {planLinesLoading ? (
                  <p className="som-muted">Ürün satırları yükleniyor…</p>
                ) : (
                  <ShipmentPlanLinePicker
                    key={planLinesKey || 'plan-lines-empty'}
                    planLines={planLines}
                    disabled={busy}
                    receivingRiskAccepted={receivingRiskAccepted}
                    onReceivingRiskAcceptedChange={setReceivingRiskAccepted}
                    onSelectionChange={setPlanSelection}
                  />
                )}
                <button
                  type="submit"
                  className="som-btn som-btn--primary"
                  disabled={busy || planSelection.length === 0}
                >
                  Sevk planla
                </button>
              </form>
            </section>
          ) : (
            <button
              type="button"
              className="som-link-btn"
              onClick={() => setShowPlanForm((v) => !v)}
            >
              {showPlanForm ? 'Plan formunu gizle' : '+ Başka sevk planla'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
