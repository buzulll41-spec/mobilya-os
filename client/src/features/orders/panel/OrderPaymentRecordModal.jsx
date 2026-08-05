import { useState } from 'react'
import { PAYMENT_METHOD } from '../../../contracts/v1/enums.js'
import { getApiBaseUrl } from '../../../config/dataSource.js'
import { formatTry } from '../../../data/index.js'
import { formatApiErrorMessage } from '../../../utils/apiErrorMessage.js'
import { erpOpsButtonClass } from '../../../lib/actionButtonVariants.js'
import { parseCurrencyInput } from '../../../lib/formatCurrencyInput.js'
import MosCurrencyInput from '../../../components/MosCurrencyInput.jsx'

const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHOD.CASH]: 'Nakit',
  [PAYMENT_METHOD.CARD]: 'Kart',
  [PAYMENT_METHOD.TRANSFER]: 'Havale / EFT',
  [PAYMENT_METHOD.CHECK]: 'Çek',
  [PAYMENT_METHOD.MAIL_ORDER]: 'Tedarikçiye Direkt Ödeme (Mail Order)',
  [PAYMENT_METHOD.OTHER]: 'Diğer',
}

/**
 * @param {{
 *   open: boolean
 *   mutating: boolean
 *   readOnly?: boolean
 *   remaining: number
 *   showSaveAndNext?: boolean
 *   onClose: () => void
 *   onPostPayment: (body: { amount: number, method: string, note?: string }) => Promise<void>
 *   onSaveAndNext?: (body: { amount: number, method: string, note?: string }) => Promise<void>
 * }} props
 */
export default function OrderPaymentRecordModal({
  open,
  mutating,
  readOnly = false,
  remaining,
  showSaveAndNext = false,
  onClose,
  onPostPayment,
  onSaveAndNext,
}) {
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState(PAYMENT_METHOD.TRANSFER)
  const [payNote, setPayNote] = useState('')
  const [payError, setPayError] = useState(/** @type {string | null} */ (null))
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}))
  const apiMode = Boolean(getApiBaseUrl())

  if (!open) return null

  async function submit(andNext = false) {
    setPayError(null)
    /** @type {Record<string, string>} */
    const errors = {}
    const trimmed = payAmount.trim()
    if (!trimmed) {
      errors.amount = 'Tahsilat tutarı zorunlu'
    } else {
      const amount = parseCurrencyInput(trimmed)
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.amount = 'Geçerli bir tutar girin.'
      }
    }
    if (!payMethod) {
      errors.method = 'Ödeme tipi seçilmedi'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setPayError(Object.values(errors)[0])
      return
    }
    setFieldErrors({})
    const amount = parseCurrencyInput(trimmed)
    const body = {
      amount,
      method: payMethod,
      ...(payNote.trim() ? { note: payNote.trim() } : {}),
    }
    try {
      if (andNext && onSaveAndNext) await onSaveAndNext(body)
      else await onPostPayment(body)
      setPayAmount('')
      setPayNote('')
      onClose()
    } catch (err) {
      setPayError(formatApiErrorMessage(err))
    }
  }

  return (
    <div className="oop-pay-modal-root" role="presentation">
      <button type="button" className="oop-pay-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        className="oop-pay-modal mos-modal mos-modal--v1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oop-pay-modal-title"
      >
        <header className="mos-modal-head">
          <h2 id="oop-pay-modal-title" className="mos-modal-title">
            Yeni ödeme kaydet
          </h2>
          <button type="button" className="mos-modal-x" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>

        <div className="mos-erp-modal-form">
          {readOnly ? (
            <p className="oop-payments__readonly" role="status">
              Tahsilat kaydı bu rol için salt okunur.
            </p>
          ) : (
            <>
              {!apiMode ? (
                <p className="oop-payments__meta" role="status">
                  Mock mod: ödemeler tarayıcı oturumunda saklanır.
                </p>
              ) : null}
              {remaining > 0.009 ? (
                <p className="oop-payments__meta">
                  Kalan bakiye: <strong>{formatTry(remaining)}</strong>
                </p>
              ) : null}
              <div className="mos-erp-modal-row">
                <label className={`mos-label${fieldErrors.amount ? ' is-invalid' : ''}`}>
                  Tutar (₺)
                  <MosCurrencyInput
                    className="mos-input"
                    value={payAmount}
                    onChange={(v) => {
                      setPayAmount(v)
                      setFieldErrors((prev) => {
                        if (!prev.amount) return prev
                        const next = { ...prev }
                        delete next.amount
                        return next
                      })
                      setPayError(null)
                    }}
                    disabled={mutating}
                    integerOnly
                    aria-invalid={Boolean(fieldErrors.amount)}
                  />
                  {fieldErrors.amount ? (
                    <span className="oop-pay-field-error" role="alert">
                      {fieldErrors.amount}
                    </span>
                  ) : null}
                </label>
                <label className={`mos-label${fieldErrors.method ? ' is-invalid' : ''}`}>
                  Ödeme yöntemi
                  <select
                    className="mos-input mos-select"
                    value={payMethod}
                    onChange={(e) => {
                      setPayMethod(/** @type {import('../../../contracts/v1/enums.js').PaymentMethod} */ (e.target.value))
                      setFieldErrors((prev) => {
                        if (!prev.method) return prev
                        const next = { ...prev }
                        delete next.method
                        return next
                      })
                      setPayError(null)
                    }}
                    disabled={mutating}
                    aria-invalid={Boolean(fieldErrors.method)}
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.method ? (
                    <span className="oop-pay-field-error" role="alert">
                      {fieldErrors.method}
                    </span>
                  ) : null}
                </label>
              </div>
              <label className="mos-label">
                Açıklama (opsiyonel)
                <input
                  type="text"
                  className="mos-input"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  disabled={mutating}
                  maxLength={200}
                  placeholder="Kapora, taksit, havale referansı…"
                />
              </label>
              {payError ? (
                <p className="mos-form-error" role="alert">
                  {payError}
                </p>
              ) : null}
            </>
          )}
        </div>

        <footer className="mos-modal-actions">
          <button type="button" className={erpOpsButtonClass('İptal')} onClick={onClose}>
            İptal
          </button>
          {!readOnly ? (
            <>
              <button
                type="button"
                className={erpOpsButtonClass('Tahsilat kaydet')}
                disabled={mutating}
                onClick={() => void submit(false)}
              >
                Tahsilat kaydet
              </button>
              {showSaveAndNext && onSaveAndNext ? (
                <button
                  type="button"
                  className={erpOpsButtonClass('Kaydet ve sonraki')}
                  disabled={mutating}
                  onClick={() => void submit(true)}
                >
                  Kaydet ve sonraki
                </button>
              ) : null}
            </>
          ) : null}
        </footer>
      </div>
    </div>
  )
}
