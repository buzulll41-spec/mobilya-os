import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MISSING_ITEM_STATUS,
  isMissingItemBlockingShipment,
  isMissingItemResolvedStatus,
} from '../../contracts/v1/missingItemStatuses.js'
import { getApiBaseUrl } from '../../config/dataSource.js'
import {
  buildSshMissingPartCard,
  sshMissingItemStatusLabelTr,
  summarizeSshMissingForOrder,
} from '../../mappers/ssh/sshMissingPartsModel.js'
import { missingItemStatusOrOpen } from '../../mappers/missingItems/missingItemStatusLabel.js'
import {
  pickMissingItemFromMutationResult,
  sanitizeMissingItemsList,
} from '../../mappers/missingItems/normalizeMissingItemDto.js'
import * as ordersClient from '../../services/ordersClient.js'
import { formatApiErrorMessage } from '../../utils/apiErrorMessage.js'
import { formatShortDate } from '../../utils/dates.js'
import { DEMO_TODAY } from '../../data/constants.js'

/** @typedef {import('../../contracts/v1/missingItem.js').MissingItemDto} MissingItemDto */
/** @typedef {import('../../contracts/v1/missingItemStatuses.js').MissingItemStatus} MissingItemStatus */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @param {MissingItemDto[]} items
 * @param {MissingItemDto | null | undefined} updated
 */
function mergeMissingItem(items, updated) {
  if (!updated?.id) return sanitizeMissingItemsList(items)
  const i = items.findIndex((m) => m?.id === updated.id)
  if (i === -1) return sanitizeMissingItemsList([...items, updated])
  const next = [...items]
  next[i] = updated
  return sanitizeMissingItemsList(next)
}

/**
 * @param {{
 *   order: Order
 *   listItemDto?: SalesOrderListItemDto
 *   mutating: boolean
 *   onPostMissingItem: (body: { title: string, quantity: number, reason: string, supplierNote?: string }) => Promise<{ missingItem: MissingItemDto }>
 *   onPatchMissingItemStatus: (missingItemId: string, body: { status: string, supplierNote?: string, resolutionNote?: string }) => Promise<{ missingItem: MissingItemDto }>
 *   onMarkMissingItemReadyForShipment: (missingItemId: string, body?: { note?: string }) => Promise<{ missingItem: MissingItemDto }>
 * }} props
 */
export default function OrderSshMissingTracking({
  order,
  listItemDto,
  mutating,
  onPostMissingItem,
  onPatchMissingItemStatus,
  onMarkMissingItemReadyForShipment,
}) {
  const [items, setItems] = useState(/** @type {MissingItemDto[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [formError, setFormError] = useState(/** @type {string | null} */ (null))
  const [successMessage, setSuccessMessage] = useState(/** @type {string | null} */ (null))
  const [statusSavingId, setStatusSavingId] = useState(/** @type {string | null} */ (null))
  const [noteDraftById, setNoteDraftById] = useState(/** @type {Record<string, string>} */ ({}))
  const [showAddForm, setShowAddForm] = useState(false)
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [supplierNote, setSupplierNote] = useState('')
  const apiMode = Boolean(getApiBaseUrl())

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await ordersClient.getOrderMissingItems(order.id)
      setItems(sanitizeMissingItemsList(rows))
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [order.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSH panel mount
    void loadItems()
  }, [loadItems])

  const summary = useMemo(() => summarizeSshMissingForOrder(items), [items])
  const orderNo = listItemDto?.orderNumber ?? order.id

  /**
   * @param {MissingItemDto} item
   * @param {MissingItemStatus} status
   * @param {{ supplierNote?: string, resolutionNote?: string }} [extra]
   */
  async function patchItem(item, status, extra = {}) {
    setFormError(null)
    setStatusSavingId(item.id)
    try {
      const body = { status, ...extra }
      if (status === MISSING_ITEM_STATUS.RESOLVED) {
        const note = noteDraftById[item.id]?.trim()
        if (!note) {
          setFormError('Tamamlamak için kısa bir not yazın.')
          return
        }
        body.resolutionNote = note
      }
      const patchResult = await onPatchMissingItemStatus(item.id, body)
      const missingItem = pickMissingItemFromMutationResult(patchResult)
      if (missingItem) setItems((prev) => mergeMissingItem(prev, missingItem))
      setNoteDraftById((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
      await loadItems()
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    } finally {
      setStatusSavingId(null)
    }
  }

  async function handlePartArrived(item) {
    const wire = missingItemStatusOrOpen(item.status)
    if (
      wire === MISSING_ITEM_STATUS.ARRIVED ||
      wire === MISSING_ITEM_STATUS.READY_FOR_SHIPMENT ||
      wire === MISSING_ITEM_STATUS.RESOLVED
    ) {
      return
    }
    const target =
      wire === MISSING_ITEM_STATUS.OPEN ? MISSING_ITEM_STATUS.ORDERED : MISSING_ITEM_STATUS.ARRIVED
    await patchItem(item, target)
  }

  async function handleCustomerInformed(item) {
    const note = noteDraftById[item.id]?.trim() || 'Müşteri bilgilendirildi'
    await patchItem(item, missingItemStatusOrOpen(item.status), {
      supplierNote: [item.supplierNote, note].filter(Boolean).join(' · '),
    })
  }

  async function handleReadyForShipment(item) {
    setFormError(null)
    setSuccessMessage(null)
    setStatusSavingId(item.id)
    try {
      const patchResult = await onMarkMissingItemReadyForShipment(item.id, {
        note: 'Parça sevke hazır olarak işaretlendi',
      })
      const missingItem = pickMissingItemFromMutationResult(patchResult)
      if (missingItem) setItems((prev) => mergeMissingItem(prev, missingItem))
      setSuccessMessage('Parça sevke hazır olarak işaretlendi')
      await loadItems()
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    } finally {
      setStatusSavingId(null)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError(null)
    const qty = Number.parseFloat(quantity.replace(',', '.'))
    if (!title.trim() || !reason.trim()) {
      setFormError('Parça adı ve gerekçe zorunlu.')
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError('Geçerli miktar girin.')
      return
    }
    try {
      await onPostMissingItem({
        title: title.trim(),
        quantity: qty,
        reason: reason.trim(),
        ...(supplierNote.trim() ? { supplierNote: supplierNote.trim() } : {}),
      })
      setTitle('')
      setQuantity('1')
      setReason('')
      setSupplierNote('')
      setShowAddForm(false)
      await loadItems()
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    }
  }

  const openCards = items
    .filter((m) => isMissingItemBlockingShipment(missingItemStatusOrOpen(m.status)))
    .map((m) => buildSshMissingPartCard(m, order, listItemDto, DEMO_TODAY))

  return (
    <section className="oop-ssh-track" aria-labelledby="oop-ssh-track-title">
      <header className="oop-ssh-track-head">
        <div>
          <h3 id="oop-ssh-track-title" className="oop-card-title">
            Eksik Parça / SSH Takibi
          </h3>
          <p className="oop-ssh-track-sub">
            Satış sonrası operasyon — sevk ekranından ayrı takip edilir.
          </p>
        </div>
        <div className="oop-ssh-track-badges">
          <span className="oop-ssh-badge">{summary.openCount} açık parça</span>
          {summary.locksShipment ? (
            <span className="oop-ssh-badge oop-ssh-badge--warn">Sevki kilitliyor</span>
          ) : (
            <span className="oop-ssh-badge oop-ssh-badge--ok">Sevke hazır</span>
          )}
        </div>
      </header>

      <dl className="oop-ssh-summary-dl">
        <div>
          <dt>Sipariş</dt>
          <dd>{orderNo}</dd>
        </div>
        <div>
          <dt>Müşteri</dt>
          <dd>{order.customer}</dd>
        </div>
        <div>
          <dt>Açık eksik</dt>
          <dd>{summary.openCount}</dd>
        </div>
        <div>
          <dt>Sevk kilidi</dt>
          <dd>{summary.locksShipment ? 'Evet — SSH kapanmalı' : 'Hayır'}</dd>
        </div>
      </dl>

      {!apiMode ? (
        <p className="oop-muted oop-ssh-meta">Mock: kayıtlar oturumda saklanır.</p>
      ) : null}

      {loading ? <p className="oop-muted">SSH kayıtları yükleniyor…</p> : null}
      {error ? (
        <p className="oop-error" role="alert">
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p className="oop-ssh__alert oop-ssh__alert--success" role="status">
          {successMessage}
        </p>
      ) : null}

      {!loading && openCards.length === 0 ? (
        <p className="oop-ssh-empty">Bu siparişte açık eksik parça kaydı yok.</p>
      ) : null}

      <ul className="oop-ssh-part-list">
        {openCards.map((card) => {
          const item = items.find((m) => m.id === card.id)
          if (!item) return null
          const saving = statusSavingId === item.id || mutating
          const wire = missingItemStatusOrOpen(item.status)
          const canArrive =
            wire !== MISSING_ITEM_STATUS.ARRIVED &&
            wire !== MISSING_ITEM_STATUS.READY_FOR_SHIPMENT &&
            wire !== MISSING_ITEM_STATUS.RESOLVED
          const canReady = wire === MISSING_ITEM_STATUS.ARRIVED || wire === MISSING_ITEM_STATUS.ORDERED

          return (
            <li key={card.id} className="oop-ssh-part-card">
              <div className="oop-ssh-part-card__head">
                <strong>{card.partTitle}</strong>
                <span className={`oop-ssh-status oop-ssh-status--${card.uiStatus}`}>
                  {card.statusLabel}
                </span>
              </div>
              <dl className="oop-ssh-part-dl">
                <div>
                  <dt>Miktar</dt>
                  <dd>{card.quantityLabel}</dd>
                </div>
                <div>
                  <dt>Tahmini geliş</dt>
                  <dd>{card.estimatedArrivalLabel}</dd>
                </div>
                <div>
                  <dt>Risk</dt>
                  <dd>{card.riskLabel}</dd>
                </div>
                <div>
                  <dt>Takip notu</dt>
                  <dd>{card.responsibleNote}</dd>
                </div>
              </dl>
              <label className="oop-ssh-note-field">
                <span className="oop-ssh-note-label">Not</span>
                <input
                  type="text"
                  className="oop-input"
                  placeholder="Müşteri arandı, tedarikçi bilgisi…"
                  value={noteDraftById[item.id] ?? ''}
                  onChange={(e) =>
                    setNoteDraftById((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  disabled={saving}
                />
              </label>
              <div className="oop-ssh-actions">
                {canArrive ? (
                  <button
                    type="button"
                    className="oop-btn oop-btn--ghost"
                    disabled={saving}
                    onClick={() => void handlePartArrived(item)}
                  >
                    Parça geldi
                  </button>
                ) : null}
                <button
                  type="button"
                  className="oop-btn oop-btn--ghost"
                  disabled={saving}
                  onClick={() => void handleCustomerInformed(item)}
                >
                  Müşteri bilgilendirildi
                </button>
                {canReady ? (
                  <button
                    type="button"
                    className="oop-btn oop-btn--primary"
                    disabled={saving}
                    onClick={() => void handleReadyForShipment(item)}
                  >
                    Sevke hazır
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      {items.some((m) => isMissingItemResolvedStatus(missingItemStatusOrOpen(m.status))) ? (
        <details className="oop-ssh-resolved">
          <summary>Kapanan kayıtlar ({items.length - openCards.length})</summary>
          <ul className="oop-ssh-resolved-list">
            {items
              .filter((m) => isMissingItemResolvedStatus(missingItemStatusOrOpen(m.status)))
              .map((m) => (
                <li key={m.id}>
                  {m.title} — {sshMissingItemStatusLabelTr(m.status)}
                  {m.resolvedAt ? ` · ${formatShortDate(m.resolvedAt.slice(0, 10))}` : ''}
                </li>
              ))}
          </ul>
        </details>
      ) : null}

      <button
        type="button"
        className="oop-link-btn"
        onClick={() => setShowAddForm((v) => !v)}
      >
        {showAddForm ? 'Yeni kayıt formunu gizle' : '+ Eksik parça kaydı ekle'}
      </button>

      {showAddForm ? (
        <form className="oop-ssh-add-form" onSubmit={(e) => void handleCreate(e)}>
          <label className="oop-field">
            <span>Parça / ürün</span>
            <input
              type="text"
              className="oop-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={mutating}
            />
          </label>
          <label className="oop-field">
            <span>Miktar</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="oop-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={mutating}
            />
          </label>
          <label className="oop-field">
            <span>Gerekçe</span>
            <input
              type="text"
              className="oop-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={mutating}
            />
          </label>
          <label className="oop-field">
            <span>Tedarik / tahmini geliş notu</span>
            <input
              type="text"
              className="oop-input"
              value={supplierNote}
              onChange={(e) => setSupplierNote(e.target.value)}
              disabled={mutating}
              placeholder="Örn. 5 iş günü"
            />
          </label>
          <button type="submit" className="oop-btn oop-btn--primary" disabled={mutating}>
            Kaydet
          </button>
        </form>
      ) : null}

      {formError ? (
        <p className="oop-error" role="alert">
          {formError}
        </p>
      ) : null}
    </section>
  )
}
