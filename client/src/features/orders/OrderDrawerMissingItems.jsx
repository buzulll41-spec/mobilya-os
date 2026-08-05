import { useCallback, useEffect, useState } from 'react'
import {
  MISSING_ITEM_STATUS,
  MISSING_ITEM_STATUS_FLOW,
  isMissingItemResolvedStatus,
} from '../../contracts/v1/missingItemStatuses.js'
import { getApiBaseUrl } from '../../config/dataSource.js'
import {
  missingItemStatusLabel,
  missingItemStatusOrOpen,
} from '../../mappers/missingItems/missingItemStatusLabel.js'
import {
  pickMissingItemFromMutationResult,
  sanitizeMissingItemsList,
} from '../../mappers/missingItems/normalizeMissingItemDto.js'
import * as ordersClient from '../../services/ordersClient.js'
import { formatApiErrorMessage } from '../../utils/apiErrorMessage.js'

/** @typedef {import('../../contracts/v1/missingItem.js').MissingItemDto} MissingItemDto */
/** @typedef {import('../../contracts/v1/missingItemStatuses.js').MissingItemStatus} MissingItemStatus */

/**
 * @param {MissingItemStatus} status
 * @returns {MissingItemStatus | null}
 */
function nextStatus(status) {
  const safe = missingItemStatusOrOpen(status)
  const idx = MISSING_ITEM_STATUS_FLOW.indexOf(safe)
  if (idx < 0 || idx >= MISSING_ITEM_STATUS_FLOW.length - 1) return null
  return MISSING_ITEM_STATUS_FLOW[idx + 1]
}

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
 *   orderId: string
 *   mutating: boolean
 *   openCount?: number
 *   onPostMissingItem: (body: { title: string, quantity: number, reason: string, supplierNote?: string }) => Promise<{ missingItem: MissingItemDto }>
 *   onPatchMissingItemStatus: (missingItemId: string, body: { status: string, supplierNote?: string, resolutionNote?: string }) => Promise<{ missingItem: MissingItemDto }>
 * }} props
 */
export default function OrderDrawerMissingItems({
  orderId,
  mutating,
  openCount = 0,
  onPostMissingItem,
  onPatchMissingItemStatus,
}) {
  const [items, setItems] = useState(/** @type {MissingItemDto[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [formError, setFormError] = useState(/** @type {string | null} */ (null))
  const [statusSavingId, setStatusSavingId] = useState(/** @type {string | null} */ (null))
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [supplierNote, setSupplierNote] = useState('')
  const [resolutionById, setResolutionById] = useState(/** @type {Record<string, string>} */ ({}))
  const apiMode = Boolean(getApiBaseUrl())

  const loadItems = useCallback(
    async (/** @type {{ silent?: boolean }} */ opts = {}) => {
      if (!opts.silent) setLoading(true)
      else setRefreshing(true)
      setError(null)
      try {
        const rows = await ordersClient.getOrderMissingItems(orderId)
        setItems(sanitizeMissingItemsList(rows))
      } catch (e) {
        setError(formatApiErrorMessage(e))
      } finally {
        if (!opts.silent) setLoading(false)
        else setRefreshing(false)
      }
    },
    [orderId],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- drawer açılınca sipariş eksik listesi
    void loadItems()
  }, [loadItems])

  async function handleCreate(e) {
    e.preventDefault()
    setFormError(null)
    const qty = Number.parseFloat(quantity.replace(',', '.'))
    if (!title.trim() || !reason.trim()) {
      setFormError('Başlık ve eksik gerekçesi zorunlu.')
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError('Geçerli miktar girin.')
      return
    }
    try {
      const postResult = await onPostMissingItem({
        title: title.trim(),
        quantity: qty,
        reason: reason.trim(),
        ...(supplierNote.trim() ? { supplierNote: supplierNote.trim() } : {}),
      })
      const missingItem = pickMissingItemFromMutationResult(postResult)
      if (missingItem) {
        setItems((prev) => mergeMissingItem(prev, missingItem))
      }
      setTitle('')
      setQuantity('1')
      setReason('')
      setSupplierNote('')
      await loadItems({ silent: true })
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    }
  }

  /**
   * @param {MissingItemDto} item
   * @param {MissingItemStatus} status
   */
  async function handleStatusChange(item, status) {
    setFormError(null)
    setStatusSavingId(item.id)
    try {
      const body = { status }
      if (status === MISSING_ITEM_STATUS.RESOLVED) {
        const note = resolutionById[item.id]?.trim()
        if (!note) {
          setFormError('Çözüm notu zorunlu.')
          return
        }
        body.resolutionNote = note
      }
      const patchResult = await onPatchMissingItemStatus(item.id, body)
      const missingItem = pickMissingItemFromMutationResult(patchResult)
      if (missingItem) {
        setItems((prev) => mergeMissingItem(prev, missingItem))
      }
      setResolutionById((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
      await loadItems({ silent: true })
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    } finally {
      setStatusSavingId(null)
    }
  }

  const listBusy = loading || refreshing
  const localOpenCount = items.filter(
    (m) => m && !isMissingItemResolvedStatus(missingItemStatusOrOpen(m.status)),
  ).length
  const projectionMismatch = items.length > 0 && localOpenCount !== openCount

  return (
    <section className="mos-drawer-section" aria-labelledby={`missing-op-${orderId}`}>
      <div className="mos-drawer-rowhead">
        <h3 className="mos-drawer-h" id={`missing-op-${orderId}`}>
          Eksik Ürün Operasyonu
        </h3>
        {openCount > 0 ? (
          <span className="mos-drawer-taskbadge">{openCount} açık</span>
        ) : null}
      </div>

      {!apiMode ? (
        <p className="mos-drawer-op-meta" role="status">
          Mock mod: eksik kayıtları oturumda saklanır. Kalıcı DB için API modu kullanın.
        </p>
      ) : null}

      {loading ? <p className="mos-drawer-p-meta">Eksik kayıtlar yükleniyor…</p> : null}
      {refreshing ? (
        <p className="mos-drawer-p-meta" role="status">
          Liste güncelleniyor…
        </p>
      ) : null}
      {error ? (
        <p className="mos-drawer-op-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && items.length === 0 ? (
        <p className="mos-drawer-p-meta">Bu siparişte kayıtlı eksik ürün yok.</p>
      ) : null}

      {items.length > 0 ? (
        <p className="mos-drawer-p-meta">
          Kayıt durumları:{' '}
          {items.map((m) => missingItemStatusOrOpen(m?.status)).join(' · ')}
          {projectionMismatch ? (
            <span className="mos-drawer-op-error" role="alert">
              {' '}
              · Uyarı: liste projection {openCount} açık, kayıtlar {localOpenCount} açık — sayfayı yenileyin.
            </span>
          ) : null}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="mos-drawer-missing-list" aria-busy={listBusy}>
          {items.map((item) => {
            if (!item?.id) return null
            const status = missingItemStatusOrOpen(item.status)
            const next = nextStatus(status)
            const saving = statusSavingId === item.id || mutating
            return (
              <li key={item.id} className="mos-drawer-missing-item">
                <p className="mos-drawer-p-strong">
                  {item.title}{' '}
                  <span className="mos-drawer-p-meta">· {item.quantity} adet</span>
                </p>
                <p className="mos-drawer-p-meta">
                  <code className="mos-drawer-missing-status-code">{status}</code>
                  {' — '}
                  {missingItemStatusLabel(status)}
                </p>
                <p className="mos-drawer-p-meta">{item.reason}</p>
                {item.supplierNote ? (
                  <p className="mos-drawer-p-meta">Tedarik: {item.supplierNote}</p>
                ) : null}
                {next ? (
                  <div className="mos-drawer-missing-actions">
                    {next === MISSING_ITEM_STATUS.RESOLVED ? (
                      <p className="mos-drawer-p-meta">
                        Teslim için son adım: <strong>RESOLVED (Çözüldü)</strong> — çözüm notu zorunlu.
                      </p>
                    ) : null}
                    {next === MISSING_ITEM_STATUS.RESOLVED ? (
                      <label className="mos-drawer-field mos-drawer-field--compact">
                        <span className="mos-drawer-field-label">Çözüm notu</span>
                        <input
                          type="text"
                          className="mos-input"
                          value={resolutionById[item.id] ?? ''}
                          onChange={(e) =>
                            setResolutionById((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          disabled={saving}
                          maxLength={300}
                        />
                      </label>
                    ) : null}
                    <button
                      type="button"
                      className="mos-btn mos-btn--sm"
                      disabled={saving}
                      onClick={() => void handleStatusChange(item, next)}
                    >
                      → {missingItemStatusLabel(next)}
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      <form className="mos-drawer-op-form" onSubmit={(e) => void handleCreate(e)}>
        <p className="mos-drawer-op-kicker">Eksik ekle</p>
        <label className="mos-drawer-field mos-drawer-field--compact">
          <span className="mos-drawer-field-label">Parça / ürün</span>
          <input
            type="text"
            className="mos-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={mutating}
            maxLength={200}
            placeholder="Örn. menteşe seti"
          />
        </label>
        <div className="mos-drawer-op-row">
          <label className="mos-drawer-field mos-drawer-field--compact">
            <span className="mos-drawer-field-label">Miktar</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="mos-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={mutating}
            />
          </label>
        </div>
        <label className="mos-drawer-field mos-drawer-field--compact">
          <span className="mos-drawer-field-label">Eksik gerekçesi</span>
          <input
            type="text"
            className="mos-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={mutating}
            maxLength={500}
          />
        </label>
        <label className="mos-drawer-field mos-drawer-field--compact">
          <span className="mos-drawer-field-label">Tedarik notu (opsiyonel)</span>
          <input
            type="text"
            className="mos-input"
            value={supplierNote}
            onChange={(e) => setSupplierNote(e.target.value)}
            disabled={mutating}
            maxLength={300}
          />
        </label>
        <button type="submit" className="mos-btn mos-btn--sm" disabled={mutating}>
          Eksik bildir
        </button>
        {formError ? (
          <p className="mos-drawer-op-error" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </section>
  )
}
