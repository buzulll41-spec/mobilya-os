import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  MISSING_ITEM_STATUS,
} from '../../../contracts/v1/missingItemStatuses.js'
import { DEMO_TODAY } from '../../../data/constants.js'
import {
  SSH_PANEL_CATEGORIES,
  buildOrderPanelSshRows,
  buildOrderPanelSshSummary,
  filterOrderPanelSshRows,
} from '../../../mappers/order/orderPanelSshModel.js'
import { missingItemStatusOrOpen } from '../../../mappers/missingItems/missingItemStatusLabel.js'
import {
  pickMissingItemFromMutationResult,
  sanitizeMissingItemsList,
} from '../../../mappers/missingItems/normalizeMissingItemDto.js'
import * as ordersClient from '../../../services/ordersClient.js'
import { getOperationCases } from '../../../services/operationCaseClient.js'
import { formatApiErrorMessage } from '../../../utils/apiErrorMessage.js'

import '../../../styles/mos-erp-ops.css'
import '../../../styles/order-panel-ssh.css'

/** @typedef {import('../../../contracts/v1/missingItem.js').MissingItemDto} MissingItemDto */
/** @typedef {import('../../../contracts/v1/operationCase.js').OperationCaseDto} OperationCaseDto */
/** @typedef {import('../../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../../mappers/order/orderPanelSshModel.js').SshCategoryId} SshCategoryId */

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
 *   domainEvents?: DomainEventDto[]
 *   onPostMissingItem: (body: { title: string, quantity: number, reason: string, supplierNote?: string }) => Promise<{ missingItem: MissingItemDto }>
 *   onPatchMissingItemStatus: (missingItemId: string, body: { status: string, supplierNote?: string, resolutionNote?: string }) => Promise<{ missingItem: MissingItemDto }>
 *   onMarkMissingItemReadyForShipment: (missingItemId: string, body?: { note?: string }) => Promise<{ missingItem: MissingItemDto }>
 *   onPlanShipment?: (item: MissingItemDto) => void
 *   canPlanShipment?: boolean
 * }} props
 */
export default function OrderPanelSshOps({
  order,
  listItemDto,
  mutating,
  domainEvents = [],
  onPostMissingItem,
  onPatchMissingItemStatus,
  onMarkMissingItemReadyForShipment,
  onPlanShipment,
  canPlanShipment = false,
}) {
  const [items, setItems] = useState(/** @type {MissingItemDto[]} */ ([]))
  const [cases, setCases] = useState(/** @type {OperationCaseDto[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [formError, setFormError] = useState(/** @type {string | null} */ (null))
  const [successMessage, setSuccessMessage] = useState(/** @type {string | null} */ (null))
  const [statusSavingId, setStatusSavingId] = useState(/** @type {string | null} */ (null))
  const [noteDraftById, setNoteDraftById] = useState(/** @type {Record<string, string>} */ ({}))
  const [showAddForm, setShowAddForm] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState(/** @type {SshCategoryId | 'all'} */ ('all'))
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [supplierNote, setSupplierNote] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [missingRows, caseResult] = await Promise.all([
        ordersClient.getOrderMissingItems(order.id),
        getOperationCases({}),
      ])
      setItems(sanitizeMissingItemsList(missingRows))
      setCases(
        (caseResult.cases ?? []).filter((c) => c.orderIds?.includes(order.id)),
      )
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [order.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const rows = useMemo(
    () =>
      buildOrderPanelSshRows({
        items,
        cases,
        order,
        listItemDto,
        domainEvents,
        todayIso: DEMO_TODAY,
      }),
    [items, cases, order, listItemDto, domainEvents],
  )

  const summaryMetrics = useMemo(
    () => buildOrderPanelSshSummary(rows, items, cases),
    [rows, items, cases],
  )

  const visibleRows = useMemo(
    () => filterOrderPanelSshRows(rows, categoryFilter),
    [rows, categoryFilter],
  )

  const openCount = rows.filter((r) => r.isOpen).length

  /**
   * @param {MissingItemDto} item
   * @param {import('../../../contracts/v1/missingItemStatuses.js').MissingItemStatus} status
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
      await loadData()
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    } finally {
      setStatusSavingId(null)
    }
  }

  /** @param {MissingItemDto} item */
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

  /** @param {MissingItemDto} item */
  async function handleCustomerInformed(item) {
    const note = noteDraftById[item.id]?.trim() || 'Müşteri bilgilendirildi'
    await patchItem(item, missingItemStatusOrOpen(item.status), {
      supplierNote: [item.supplierNote, note].filter(Boolean).join(' · '),
    })
  }

  /** @param {MissingItemDto} item */
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
      await loadData()
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
      await loadData()
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    }
  }

  return (
    <div className="oop-ssh" aria-label="SSH ve eksik parça operasyonu">
      <div className="oop-ssh__head">
        <div className="oop-ssh__kpi-cards" aria-label="SSH özet göstergeleri">
          {summaryMetrics.map((metric) => (
            <div
              key={metric.id}
              className={`oop-ssh__kpi-card oop-ssh__kpi-card--${metric.cardTone}`}
              data-kpi-id={metric.id}
            >
              <span className="oop-ssh__kpi-card-label">{metric.label}</span>
              <strong className="oop-ssh__kpi-card-value">{metric.value}</strong>
            </div>
          ))}
        </div>
        <div className="oop-ssh__actions">
          <button
            type="button"
            className="oop-ssh__btn oop-ssh__btn--primary"
            disabled={mutating}
            onClick={() => setShowAddForm((v) => !v)}
          >
            {showAddForm ? 'Formu kapat' : 'Yeni kayıt ekle'}
          </button>
        </div>
      </div>

      {openCount > 0 ? (
        <p className="oop-ssh__alert oop-ssh__alert--warning" role="status">
          Bu siparişte {openCount} açık SSH / eksik parça kaydı var.
        </p>
      ) : null}

      {successMessage ? (
        <p className="oop-ssh__alert oop-ssh__alert--success" role="status">
          {successMessage}
        </p>
      ) : null}

      {summaryMetrics.find((m) => m.id === 'critical')?.value !== '0' ? (
        <p className="oop-ssh__alert oop-ssh__alert--critical" role="alert">
          Kritik kayıt mevcut — sevk öncesi kontrol edin.
        </p>
      ) : null}

      <div className="oop-ssh__filters" role="toolbar" aria-label="SSH kategori filtreleri">
        <button
          type="button"
          className={`oop-ssh__filter${categoryFilter === 'all' ? ' oop-ssh__filter--active' : ''}`}
          onClick={() => setCategoryFilter('all')}
        >
          Tümü ({rows.length})
        </button>
        {SSH_PANEL_CATEGORIES.map((cat) => {
          const count = rows.filter((r) => r.categoryId === cat.id).length
          return (
            <button
              key={cat.id}
              type="button"
              className={`oop-ssh__filter${categoryFilter === cat.id ? ' oop-ssh__filter--active' : ''}`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {loading ? <p className="oop-ssh__meta">Kayıtlar yükleniyor…</p> : null}
      {error ? (
        <p className="oop-ssh__error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="oop-ssh__table-panel" aria-label="SSH kayıt listesi">
        <div className="mos-erp-tbl-wrap oop-ssh__tbl-wrap">
          <table className="mos-erp-tbl oop-ssh__tbl">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Başlık</th>
                <th className="is-num">Miktar</th>
                <th>Durum</th>
                <th>Açılış Tarihi</th>
                <th className="is-num">Açık Gün</th>
                <th>Son işlem</th>
                <th>Not</th>
                <th className="is-ops">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {!loading && visibleRows.length === 0 ? (
                <tr className="mos-erp-tbl-empty">
                  <td colSpan={9}>Bu kategoride kayıt yok.</td>
                </tr>
              ) : (
                visibleRows.map((row, idx) => {
                  const item = row.missingItem
                  const saving = item ? statusSavingId === item.id || mutating : false
                  const wire = item ? missingItemStatusOrOpen(item.status) : null
                  const canArrive =
                    item &&
                    wire !== MISSING_ITEM_STATUS.ARRIVED &&
                    wire !== MISSING_ITEM_STATUS.READY_FOR_SHIPMENT &&
                    wire !== MISSING_ITEM_STATUS.RESOLVED
                  const canReady =
                    item &&
                    (wire === MISSING_ITEM_STATUS.ARRIVED || wire === MISSING_ITEM_STATUS.ORDERED)
                  const canPlan =
                    item &&
                    wire === MISSING_ITEM_STATUS.READY_FOR_SHIPMENT &&
                    canPlanShipment &&
                    typeof onPlanShipment === 'function'

                  return (
                    <tr
                      key={row.id}
                      className={`mos-erp-tbl-row oop-ssh-row${idx % 2 === 1 ? ' oop-ssh-row--alt' : ''}${row.statusTone === 'critical' ? ' oop-ssh-row--critical' : ''}`}
                    >
                      <td>
                        <span className={`oop-ssh__cat oop-ssh__cat--${row.categoryId}`}>
                          {row.categoryLabel}
                        </span>
                      </td>
                      <td className="oop-ssh__title">{row.title}</td>
                      <td className="is-num">{row.quantityLabel}</td>
                      <td>
                        <span className={`oop-ssh__status oop-ssh__status--${row.statusTone}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                      <td>{row.openedAtLabel}</td>
                      <td className="is-num">
                        <span className={`oop-ssh__open-days oop-ssh__open-days--${row.openDaysTone}`}>
                          {row.openDays}
                        </span>
                      </td>
                      <td>{row.lastTouchLabel}</td>
                      <td className="oop-ssh__note">{row.noteLabel}</td>
                      <td className="is-ops">
                        {item && (row.isOpen || canPlan) ? (
                          <div className="oop-ssh__row-ops">
                            {canArrive ? (
                              <button
                                type="button"
                                className="oop-ssh__row-btn"
                                disabled={saving}
                                onClick={() => void handlePartArrived(item)}
                              >
                                Parça geldi
                              </button>
                            ) : null}
                            {canReady ? (
                              <button
                                type="button"
                                className="oop-ssh__row-btn oop-ssh__row-btn--primary"
                                disabled={saving}
                                onClick={() => void handleReadyForShipment(item)}
                              >
                                Sevke hazır
                              </button>
                            ) : null}
                            {canPlan ? (
                              <button
                                type="button"
                                className="oop-ssh__row-btn oop-ssh__row-btn--primary"
                                disabled={saving || mutating}
                                onClick={() => onPlanShipment?.(item)}
                              >
                                Sevk planla
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="oop-ssh__no-op">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {visibleRows.length > 0 ? (
              <tfoot>
                <tr className="oop-ssh__footer">
                  <td colSpan={2}>
                    Toplam ({visibleRows.length} kayıt · {visibleRows.filter((r) => r.isOpen).length}{' '}
                    açık)
                  </td>
                  <td colSpan={7} />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      {showAddForm ? (
        <form className="oop-ssh__add-form" onSubmit={(e) => void handleCreate(e)}>
          <h4 className="oop-ssh__form-title">Yeni eksik parça / SSH kaydı</h4>
          <div className="oop-ssh__form-grid">
            <label className="oop-ssh__field">
              <span>Parça / ürün</span>
              <input
                type="text"
                className="oop-ssh__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={mutating}
              />
            </label>
            <label className="oop-ssh__field">
              <span>Miktar</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="oop-ssh__input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={mutating}
              />
            </label>
            <label className="oop-ssh__field oop-ssh__field--wide">
              <span>Gerekçe (kategori için)</span>
              <input
                type="text"
                className="oop-ssh__input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={mutating}
                placeholder="Örn. Kumaş hatası, hasar, eksik parça"
              />
            </label>
            <label className="oop-ssh__field oop-ssh__field--wide">
              <span>Tedarik / not</span>
              <input
                type="text"
                className="oop-ssh__input"
                value={supplierNote}
                onChange={(e) => setSupplierNote(e.target.value)}
                disabled={mutating}
              />
            </label>
          </div>
          <button type="submit" className="oop-ssh__btn oop-ssh__btn--primary" disabled={mutating}>
            Kaydet
          </button>
        </form>
      ) : null}

      {rows.some((r) => r.missingItem && r.isOpen) ? (
        <div className="oop-ssh__note-panel">
          {rows
            .filter((r) => r.missingItem && r.isOpen)
            .map((r) => {
              const item = r.missingItem
              if (!item) return null
              return (
                <label key={item.id} className="oop-ssh__inline-note">
                  <span>{item.title} — hızlı not</span>
                  <input
                    type="text"
                    className="oop-ssh__input"
                    placeholder="Müşteri bilgilendirildi…"
                    value={noteDraftById[item.id] ?? ''}
                    onChange={(e) =>
                      setNoteDraftById((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    disabled={statusSavingId === item.id || mutating}
                  />
                  <button
                    type="button"
                    className="oop-ssh__row-btn"
                    disabled={statusSavingId === item.id || mutating}
                    onClick={() => void handleCustomerInformed(item)}
                  >
                    Müşteri bilgilendirildi
                  </button>
                </label>
              )
            })}
        </div>
      ) : null}

      {formError ? (
        <p className="oop-ssh__error" role="alert">
          {formError}
        </p>
      ) : null}
    </div>
  )
}
