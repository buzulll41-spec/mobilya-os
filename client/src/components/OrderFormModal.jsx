import { useEffect, useId, useState } from 'react'
import { ORDER_STATUSES, addDays, formatTry } from '../data/index.js'
import { SALES_TEAM } from '../constants/operations.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */

const STEPS = ['Müşteri', 'İş emri', 'Onay']

const emptyForm = () => ({
  customer: '',
  phone: '',
  salesPerson: SALES_TEAM[0] ?? '',
  product: '',
  salePrice: '',
  cost: '',
  kapora: '',
  dueDate: '',
  status: 'Bekleniyor',
  notes: '',
})

/**
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   onSave: (order: Omit<Order, 'id' | 'orderDate'>) => void | Promise<void>
 *   apiBusy?: boolean
 * }} props
 */
export default function OrderFormModal({ open, onClose, onSave, apiBusy = false }) {
  const titleId = useId()
  const [form, setForm] = useState(emptyForm)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

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

  if (!open) return null

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  function parseMoney(raw) {
    const n = Number(String(raw).replace(',', '.'))
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
  }

  function canAdvance(fromStep) {
    if (fromStep === 0) {
      return Boolean(form.customer.trim() && form.salesPerson)
    }
    if (fromStep === 1) {
      const amount = parseMoney(form.salePrice)
      return Boolean(form.product.trim() && form.dueDate && amount > 0)
    }
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const amount = parseMoney(form.salePrice)
    const cost = parseMoney(form.cost)
    const kapora = parseMoney(form.kapora)
    if (!form.customer.trim() || !form.product.trim() || !form.dueDate || amount <= 0) {
      return
    }
    const paid = kapora >= amount
    /** @type {Omit<Order, 'id' | 'orderDate'>} */
    const row = {
      customer: form.customer.trim(),
      phone: form.phone.trim() || undefined,
      salesPerson: form.salesPerson || undefined,
      product: form.product.trim(),
      amount,
      cost: cost > 0 ? cost : undefined,
      paidAmount: kapora > 0 ? kapora : undefined,
      paid,
      dueDate: form.dueDate,
      shipmentDate: addDays(form.dueDate, 5),
      status: /** @type {Order['status']} */ (form.status),
      notes: form.notes.trim() || undefined,
    }
    setSubmitting(true)
    try {
      await Promise.resolve(onSave(row))
    } finally {
      setSubmitting(false)
    }
  }

  const formLocked = submitting || apiBusy

  const amountPreview = parseMoney(form.salePrice)
  const kaporaPreview = parseMoney(form.kapora)

  return (
    <div className="mos-modal-root" role="presentation">
      <button type="button" className="mos-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        className="mos-modal mos-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="mos-modal-head">
          <div>
            <h2 id={titleId} className="mos-modal-title">
              Yeni sipariş
            </h2>
            <p className="mos-modal-sub">Adım adım — sık kullanım için minimum tıklama.</p>
          </div>
          <button type="button" className="mos-modal-x" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>

        <ol className="mos-stepper" aria-label="Adımlar">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`mos-stepper-item${i === step ? ' mos-stepper-item--current' : ''}${i < step ? ' mos-stepper-item--done' : ''}`}
            >
              <span className="mos-stepper-idx">{i + 1}</span>
              <span className="mos-stepper-label">{label}</span>
            </li>
          ))}
        </ol>

        <form className="mos-modal-form" onSubmit={handleSubmit}>
          <div className="mos-modal-body">
            {step === 0 ? (
              <div className="mos-modal-grid mos-modal-grid--2">
                <label className="mos-field mos-field-span2">
                  <span className="mos-field-label">Müşteri adı *</span>
                  <input
                    className="mos-input"
                    name="customer"
                    autoComplete="name"
                    autoFocus
                    value={form.customer}
                    onChange={(e) => set('customer', e.target.value)}
                    disabled={formLocked}
                    required
                  />
                </label>
                <label className="mos-field">
                  <span className="mos-field-label">Telefon</span>
                  <input
                    className="mos-input"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="05xx xxx xx xx"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    disabled={formLocked}
                  />
                </label>
                <label className="mos-field">
                  <span className="mos-field-label">Satış personeli *</span>
                  <select
                    className="mos-input mos-select"
                    name="salesPerson"
                    value={form.salesPerson}
                    onChange={(e) => set('salesPerson', e.target.value)}
                    disabled={formLocked}
                  >
                    {SALES_TEAM.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="mos-modal-grid mos-modal-grid--2">
                <label className="mos-field mos-field-span2">
                  <span className="mos-field-label">Ürün adı *</span>
                  <input
                    className="mos-input"
                    name="product"
                    autoFocus
                    value={form.product}
                    onChange={(e) => set('product', e.target.value)}
                    disabled={formLocked}
                    required
                  />
                </label>
                <label className="mos-field">
                  <span className="mos-field-label">Satış fiyatı (TL) *</span>
                  <input
                    className="mos-input"
                    name="salePrice"
                    type="number"
                    min={1}
                    step={1}
                    value={form.salePrice}
                    onChange={(e) => set('salePrice', e.target.value)}
                    disabled={formLocked}
                    required
                  />
                </label>
                <label className="mos-field">
                  <span className="mos-field-label">Maliyet (TL)</span>
                  <input
                    className="mos-input"
                    name="cost"
                    type="number"
                    min={0}
                    step={1}
                    value={form.cost}
                    onChange={(e) => set('cost', e.target.value)}
                    disabled={formLocked}
                  />
                </label>
                <label className="mos-field">
                  <span className="mos-field-label">Kapora (TL)</span>
                  <input
                    className="mos-input"
                    name="kapora"
                    type="number"
                    min={0}
                    step={1}
                    value={form.kapora}
                    onChange={(e) => set('kapora', e.target.value)}
                    disabled={formLocked}
                  />
                </label>
                <label className="mos-field">
                  <span className="mos-field-label">Termin tarihi *</span>
                  <input
                    className="mos-input"
                    name="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => set('dueDate', e.target.value)}
                    disabled={formLocked}
                    required
                  />
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="mos-modal-grid mos-modal-grid--2">
                <div className="mos-field mos-field-span2 mos-quick-summary">
                  <span className="mos-field-label">Özet</span>
                  <p className="mos-quick-summary-line">
                    <strong>{form.customer.trim() || '—'}</strong>
                    {' · '}
                    {form.product.trim() || '—'}
                  </p>
                  <p className="mos-quick-summary-meta">
                    {formatTry(amountPreview)} satış · {formatTry(kaporaPreview)} kapora · termin{' '}
                    {form.dueDate || '—'}
                  </p>
                </div>
                <label className="mos-field mos-field-span2">
                  <span className="mos-field-label">Durum</span>
                  <select
                    className="mos-input mos-select"
                    name="status"
                    value={form.status}
                    onChange={(e) => set('status', e.target.value)}
                    disabled={formLocked}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mos-field mos-field-span2">
                  <span className="mos-field-label">Not</span>
                  <textarea
                    className="mos-input mos-textarea"
                    name="notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    disabled={formLocked}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <p className="mos-modal-hint">Sevk tarihi termin + 5 gün olarak atanır.</p>

          <footer className="mos-modal-actions mos-modal-actions--split">
            <div className="mos-modal-actions-left">
              {step > 0 ? (
                <button
                  type="button"
                  className="mos-btn mos-btn-ghost"
                  disabled={formLocked}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  Geri
                </button>
              ) : (
                <button type="button" className="mos-btn mos-btn-ghost" onClick={onClose} disabled={formLocked}>
                  Vazgeç
                </button>
              )}
            </div>
            <div className="mos-modal-actions-right">
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  className="mos-btn mos-btn-primary"
                  disabled={formLocked || !canAdvance(step)}
                  onClick={() => {
                    if (canAdvance(step)) setStep((s) => s + 1)
                  }}
                >
                  İleri
                </button>
              ) : (
                <button type="submit" className="mos-btn mos-btn-primary" disabled={formLocked || !canAdvance(1)}>
                  {submitting ? (
                    <>
                      <span className="mos-spinner" aria-hidden />
                      Kaydediliyor…
                    </>
                  ) : (
                    'Kaydet'
                  )}
                </button>
              )}
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}
