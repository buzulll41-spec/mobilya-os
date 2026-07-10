import { useState } from 'react'
import { PAYMENT_METHOD } from '../../contracts/v1/enums.js'
import { DEMO_TODAY } from '../../data/constants.js'
import { useModalDismiss } from '../../hooks/useModalDismiss.js'
import { erpOpsButtonClass } from '../../lib/actionButtonVariants.js'
import { parseCurrencyInput } from '../../lib/formatCurrencyInput.js'
import MosCurrencyInput from '../../components/MosCurrencyInput.jsx'

/** @typedef {import('../../contracts/v1/supplierLedgerEntry.js').PostSupplierPaymentRequest} PostSupplierPaymentRequest */

const METHOD_OPTIONS = [
  { value: PAYMENT_METHOD.TRANSFER, label: 'Havale' },
  { value: `${PAYMENT_METHOD.TRANSFER}:eft`, label: 'EFT' },
  { value: PAYMENT_METHOD.CASH, label: 'Nakit' },
  { value: PAYMENT_METHOD.OTHER, label: 'Mahsup' },
]

/**
 * @param {{
 *   open: boolean
 *   supplierName: string
 *   openBalance: string
 *   saving?: boolean
 *   error?: string | null
 *   onClose: () => void
 *   onSubmit: (body: PostSupplierPaymentRequest) => Promise<void>
 * }} props
 */
export default function SupplierPaymentModal({
  open,
  supplierName,
  openBalance,
  saving,
  error,
  onClose,
  onSubmit,
}) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(PAYMENT_METHOD.TRANSFER)
  const [occurredAt, setOccurredAt] = useState(DEMO_TODAY)
  const [description, setDescription] = useState('')
  const [documentNo, setDocumentNo] = useState('')

  useModalDismiss(open, onClose)

  if (!open) return null

  const balanceNum = Number.parseFloat(openBalance)
  const balanceLabel = Number.isFinite(balanceNum)
    ? balanceNum.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : openBalance

  async function handleSubmit(e) {
    e.preventDefault()
    const n = parseCurrencyInput(amount)
    if (!Number.isFinite(n) || n <= 0) return
    const isEft = method.endsWith(':eft')
    const apiMethod = isEft ? PAYMENT_METHOD.TRANSFER : method.replace(/:eft$/, '')
    const descParts = []
    if (isEft) descParts.push('EFT')
    if (apiMethod === PAYMENT_METHOD.OTHER && !description.trim()) descParts.push('Mahsup')
    if (description.trim()) descParts.push(description.trim())
    await onSubmit({
      amount: n,
      method: apiMethod,
      occurredAt,
      ...(descParts.length ? { description: descParts.join(' · ') } : {}),
      ...(documentNo.trim() ? { documentNo: documentNo.trim() } : {}),
    })
    setAmount('')
    setDescription('')
    setDocumentNo('')
  }

  return (
    <div className="mos-modal-root" role="presentation">
      <button type="button" className="mos-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        className="mos-modal mos-modal--v1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-pay-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="mos-modal-head">
          <h2 id="supplier-pay-title" className="mos-modal-title">
            Tedarikçiye ödeme
          </h2>
          <button type="button" className="mos-modal-x" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>
        <form className="mos-modal-form mos-modal-body mos-erp-modal-form" onSubmit={(e) => void handleSubmit(e)}>
          <p className="mos-erp-modal-meta">
            <strong>{supplierName}</strong>
            <span className="mos-erp-modal-meta__sub">Mevcut: {balanceLabel} TL borç</span>
          </p>
          {error ? (
            <div className="mos-form-toast mos-form-toast--error" role="alert">
              {error}
            </div>
          ) : null}
          <label className="mos-field">
            <span className="mos-field-label">Tutar (TL) *</span>
            <MosCurrencyInput
              className="mos-input"
              value={amount}
              onChange={setAmount}
              required
              disabled={saving}
              integerOnly
            />
          </label>
          <label className="mos-field">
            <span className="mos-field-label">Ödeme tarihi</span>
            <input
              type="date"
              className="mos-input"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              disabled={saving}
            />
          </label>
          <label className="mos-field">
            <span className="mos-field-label">Ödeme yöntemi</span>
            <select className="mos-input" value={method} onChange={(e) => setMethod(e.target.value)} disabled={saving}>
              {METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mos-field">
            <span className="mos-field-label">Açıklama</span>
            <input
              className="mos-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              placeholder="Opsiyonel"
            />
          </label>
          <label className="mos-field">
            <span className="mos-field-label">Belge / dekont no</span>
            <input
              className="mos-input"
              value={documentNo}
              onChange={(e) => setDocumentNo(e.target.value)}
              disabled={saving}
            />
          </label>
          <footer className="mos-modal-actions">
            <button type="button" className={erpOpsButtonClass('Vazgeç')} onClick={onClose}>
              Vazgeç
            </button>
            <button
              type="submit"
              className={erpOpsButtonClass('Ödemeyi kaydet')}
              disabled={saving || !amount}
            >
              Ödemeyi kaydet
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
