import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { DEMO_TODAY } from '../../data/constants.js'
import { INCOMING_GOODS_PURPOSE } from '../../contracts/v1/incomingGoodsPurpose.js'
import { useModalDismiss } from '../../hooks/useModalDismiss.js'
import { parseQty } from '../../mappers/receiving/productReadiness.js'
import { validateQuickLineReceive, RECEIVE_ALREADY_COMPLETE_MESSAGE } from '../../mappers/receiving/orderLineReceiveAction.js'
import '../../styles/quick-line-receive-modal.css'

/** @typedef {import('../../contracts/v1/incomingGoods.js').CreateIncomingGoodsRequest} CreateIncomingGoodsRequest */
/** @typedef {import('../../contracts/v1/incomingGoods.js').OrderLineReceivingDto} OrderLineReceivingDto */
/** @typedef {import('../../contracts/v1/supplier.js').SupplierListItemDto} SupplierListItemDto */

/**
 * @param {string} raw
 */
function parsePurchasePriceInput(raw) {
  const s = String(raw)
    .replace(/\s/g, '')
    .replace(/₺/gi, '')
    .trim()
  if (!s) return NaN
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(normalized)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

/**
 * @param {number} n
 */
function formatPurchasePriceDisplay(n) {
  if (!Number.isFinite(n) || n < 0) return ''
  return (
    new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n) + ' ₺'
  )
}

/**
 * @param {string} value
 * @param {number} max
 */
function clampQtyInput(value, max) {
  const n = Number.parseFloat(String(value).replace(',', '.'))
  if (!Number.isFinite(n)) return value
  if (n > max + 0.0001) {
    return max % 1 === 0 ? String(max) : max.toFixed(2)
  }
  if (n < 0) return '0'
  return value
}

/**
 * @param {{
 *   open: boolean
 *   line: OrderLineReceivingDto | null
 *   suppliers: SupplierListItemDto[]
 *   saving?: boolean
 *   error?: string | null
 *   onClose: () => void
 *   onSubmit: (body: CreateIncomingGoodsRequest) => Promise<void>
 * }} props
 */
export default function QuickLineReceiveModal({
  open,
  line,
  suppliers,
  saving = false,
  error: externalError,
  onClose,
  onSubmit,
}) {
  const [supplierId, setSupplierId] = useState('')
  const [qty, setQty] = useState('')
  const [unitPurchasePrice, setUnitPurchasePrice] = useState('')
  const [priceFocused, setPriceFocused] = useState(false)
  const [receivedAt, setReceivedAt] = useState(DEMO_TODAY)
  const [documentNo, setDocumentNo] = useState('')
  const [note, setNote] = useState('')
  const [localError, setLocalError] = useState(/** @type {string | null} */ (null))

  useModalDismiss(open, onClose)

  const maxPending = useMemo(() => (line ? parseQty(line.qtyPending) : 0), [line])
  const alreadyComplete = maxPending <= 0.0001
  const defaultQtyStr = useMemo(
    () =>
      alreadyComplete
        ? '0'
        : maxPending % 1 === 0
          ? String(maxPending)
          : maxPending.toFixed(2),
    [maxPending, alreadyComplete],
  )

  const priceDisplay = useMemo(() => {
    if (priceFocused) return unitPurchasePrice
    if (!String(unitPurchasePrice).trim()) return ''
    const n = parsePurchasePriceInput(unitPurchasePrice)
    return Number.isFinite(n) ? formatPurchasePriceDisplay(n) : unitPurchasePrice
  }, [unitPurchasePrice, priceFocused])

  useEffect(() => {
    if (!open || !line) return
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- satır bazlı hızlı form sıfırlanır */
    const preferredSupplier =
      line.defaultSupplierId && suppliers.some((s) => s.id === line.defaultSupplierId)
        ? line.defaultSupplierId
        : (suppliers[0]?.id ?? '')
    setSupplierId(preferredSupplier)
    setQty(defaultQtyStr)
    const suggested = line.suggestedPurchasePrice
      ? String(line.suggestedPurchasePrice).replace(/\s/g, '').replace(/₺/gi, '').replace(',', '.')
      : ''
    setUnitPurchasePrice(suggested)
    setPriceFocused(false)
    setReceivedAt(DEMO_TODAY)
    setDocumentNo('')
    setNote('')
    setLocalError(null)
  }, [open, line, suppliers, defaultQtyStr])

  if (!open || !line) return null

  const displayError = localError ?? externalError ?? null

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError(null)
    if (alreadyComplete) {
      setLocalError(RECEIVE_ALREADY_COMPLETE_MESSAGE)
      return
    }
    const q = Number.parseFloat(String(qty).replace(',', '.'))
    const p = parsePurchasePriceInput(unitPurchasePrice)
    const validation = validateQuickLineReceive({
      supplierId,
      qty: q,
      maxPending,
      unitPurchasePrice: p,
    })
    if (validation) {
      setLocalError(validation)
      return
    }

    /** @type {CreateIncomingGoodsRequest} */
    const body = {
      supplierId,
      receivedAt,
      productTitle: line.title.trim(),
      qty: q,
      unitPurchasePrice: p,
      purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
      orderLineId: line.orderLineId,
      ...(line.productId ? { productId: line.productId } : {}),
      ...(documentNo.trim() ? { documentNo: documentNo.trim(), invoiceNo: documentNo.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    try {
      await onSubmit(body)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Kayıt oluşturulamadı')
    }
  }

  return createPortal(
    <div className="qlr-modal-root" role="presentation">
      <button type="button" className="qlr-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        className="qlr-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qlr-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="qlr-modal__head">
          <div>
            <h2 id="qlr-modal-title" className="qlr-modal__title">
              Ürün Geldi
            </h2>
            <p className="qlr-modal__subtitle">{line.title}</p>
            <p className="qlr-modal__meta">
              <span>
                Sipariş: <strong>{line.qtyOrdered}</strong> adet
              </span>
              <span>
                Gelen: <strong>{line.qtyReceived}</strong>
              </span>
              <span>
                Kalan: <strong>{line.qtyPending}</strong>
              </span>
            </p>
          </div>
          <button type="button" className="qlr-modal__close" aria-label="Kapat" onClick={onClose}>
            ×
          </button>
        </header>

        <form className="qlr-modal__form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="qlr-modal__body">
            {alreadyComplete ? (
              <p className="qlr-modal__info" role="status">
                {RECEIVE_ALREADY_COMPLETE_MESSAGE}
              </p>
            ) : null}
            {displayError && !alreadyComplete ? (
              <p className="qlr-modal__alert" role="alert">
                {displayError}
              </p>
            ) : null}

            <div className="qlr-modal__grid">
              <div className="qlr-modal__col">
                <label className="qlr-field">
                  <span className="qlr-field__label">Tedarikçi</span>
                  <select
                    className="qlr-field__select"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    required
                    disabled={saving || suppliers.length === 0}
                  >
                    <option value="">Tedarikçi seçin</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="qlr-field">
                  <span className="qlr-field__label">Gelen adet</span>
                  <input
                    className="qlr-field__input"
                    type="number"
                    {...(alreadyComplete
                      ? {}
                      : { min: 0.01, max: maxPending, step: 0.01 })}
                    value={qty}
                    onChange={(e) => setQty(clampQtyInput(e.target.value, maxPending))}
                    required={!alreadyComplete}
                    disabled={saving || alreadyComplete}
                    readOnly={alreadyComplete}
                  />
                  <span className="qlr-field__hint">
                    {alreadyComplete ? 'Bekleyen adet yok' : `En fazla ${line.qtyPending} adet`}
                  </span>
                </label>

                <label className="qlr-field">
                  <span className="qlr-field__label">Alış fiyatı</span>
                  <input
                    className="qlr-field__input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00 ₺"
                    value={priceDisplay}
                    onFocus={() => setPriceFocused(true)}
                    onBlur={() => {
                      setPriceFocused(false)
                      const n = parsePurchasePriceInput(unitPurchasePrice)
                      if (Number.isFinite(n) && n >= 0) {
                        setUnitPurchasePrice(String(n))
                      }
                    }}
                    onChange={(e) => {
                      setUnitPurchasePrice(e.target.value.replace(/[^\d.,]/g, ''))
                    }}
                    required
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="qlr-modal__col">
                <label className="qlr-field">
                  <span className="qlr-field__label">Geliş tarihi</span>
                  <input
                    className="qlr-field__input"
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    required
                    disabled={saving}
                  />
                </label>

                <label className="qlr-field">
                  <span className="qlr-field__label">Belge / fatura no</span>
                  <input
                    className="qlr-field__input"
                    type="text"
                    value={documentNo}
                    onChange={(e) => setDocumentNo(e.target.value)}
                    placeholder="Opsiyonel"
                    disabled={saving}
                  />
                </label>

                <label className="qlr-field">
                  <span className="qlr-field__label">Not</span>
                  <textarea
                    className="qlr-field__textarea"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Opsiyonel"
                    disabled={saving}
                    rows={3}
                  />
                </label>
              </div>
            </div>
          </div>

          <footer className="qlr-modal__foot">
            <button
              type="button"
              className="qlr-btn qlr-btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="qlr-btn qlr-btn--primary"
              disabled={saving || alreadyComplete}
            >
              {saving ? 'Kaydediliyor…' : 'Ürün girişini kaydet'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
