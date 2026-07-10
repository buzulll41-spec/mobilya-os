import { useState } from 'react'
import { ORDER_STATUSES } from '../data/constants.js'
import { parseCurrencyInput } from '../lib/formatCurrencyInput.js'
import MosCurrencyInput from './MosCurrencyInput.jsx'

/**
 * @typedef {import('../contracts/v1/createOrderRequest.js').CreateOrderRequest} CreateOrderRequest
 */

const EMPTY = {
  customerName: '',
  productTitle: '',
  totalAmount: '',
  paidAmount: '',
  status: 'Bekleniyor',
}

/**
 * API modu — geçici minimal sipariş oluşturma formu.
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   onSave: (body: CreateOrderRequest) => Promise<void>
 *   apiBusy?: boolean
 *   errorMessage?: string | null
 * }} props
 */
export default function MinimalCreateOrderModal({
  open,
  onClose,
  onSave,
  apiBusy = false,
  errorMessage = null,
}) {
  const [form, setForm] = useState({ ...EMPTY })
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const totalAmount = parseCurrencyInput(form.totalAmount)
    const paidAmount = parseCurrencyInput(form.paidAmount || '0')
    if (
      !form.customerName.trim() ||
      !form.productTitle.trim() ||
      !Number.isFinite(totalAmount) ||
      totalAmount <= 0 ||
      !Number.isFinite(paidAmount) ||
      paidAmount < 0 ||
      paidAmount > totalAmount
    ) {
      return
    }
    /** @type {CreateOrderRequest} */
    const body = {
      customerName: form.customerName.trim(),
      productTitle: form.productTitle.trim(),
      totalAmount,
      paidAmount,
      status: /** @type {CreateOrderRequest['status']} */ (form.status),
    }
    setSubmitting(true)
    try {
      await onSave(body)
      setForm({ ...EMPTY })
    } finally {
      setSubmitting(false)
    }
  }

  const locked = submitting || apiBusy

  return (
    <div className="mos-modal-root" role="presentation">
      <button type="button" className="mos-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        className="mos-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="minimal-create-order-title"
      >
        <header className="mos-modal-head">
          <h2 id="minimal-create-order-title" className="mos-modal-title">
            Yeni sipariş
          </h2>
          <button type="button" className="mos-modal-x" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>
        <form className="mos-modal-form mos-modal-body" onSubmit={handleSubmit}>
          {errorMessage ? (
            <div className="mos-form-toast mos-form-toast--error" role="alert">
              {errorMessage}
            </div>
          ) : null}
          <label className="mos-field">
            <span className="mos-field-label">Müşteri adı</span>
            <input
              className="mos-input"
              name="customerName"
              value={form.customerName}
              onChange={(e) => setField('customerName', e.target.value)}
              required
              disabled={locked}
            />
          </label>
          <label className="mos-field">
            <span className="mos-field-label">Ürün / özet</span>
            <input
              className="mos-input"
              name="productTitle"
              value={form.productTitle}
              onChange={(e) => setField('productTitle', e.target.value)}
              required
              disabled={locked}
            />
          </label>
          <label className="mos-field">
            <span className="mos-field-label">Toplam tutar (TL)</span>
            <MosCurrencyInput
              className="mos-input"
              name="totalAmount"
              value={form.totalAmount}
              onChange={(v) => setField('totalAmount', v)}
              required
              disabled={locked}
              integerOnly
            />
          </label>
          <label className="mos-field">
            <span className="mos-field-label">Kapora / ödenen (TL)</span>
            <MosCurrencyInput
              className="mos-input"
              name="paidAmount"
              value={form.paidAmount}
              onChange={(v) => setField('paidAmount', v)}
              disabled={locked}
              integerOnly
            />
          </label>
          <label className="mos-field">
            <span className="mos-field-label">Durum</span>
            <select
              className="mos-input"
              name="status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
              disabled={locked}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <footer className="mos-modal-actions">
            <button type="button" className="mos-btn mos-btn-ghost" onClick={onClose} disabled={locked}>
              İptal
            </button>
            <button type="submit" className="mos-btn mos-btn-primary" disabled={locked}>
              {locked ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
