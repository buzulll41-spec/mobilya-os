import { useState } from 'react'
import { PAYMENT_METHOD } from '../../contracts/v1/enums.js'
import { getApiBaseUrl } from '../../config/dataSource.js'
import { formatApiErrorMessage } from '../../utils/apiErrorMessage.js'
import { parseCurrencyInput } from '../../lib/formatCurrencyInput.js'
import MosCurrencyInput from '../../components/MosCurrencyInput.jsx'
import MobileDateField from '../../components/mobile/MobileDateField.jsx'

const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHOD.CASH]: 'Nakit',
  [PAYMENT_METHOD.CARD]: 'Kart',
  [PAYMENT_METHOD.TRANSFER]: 'Havale / EFT',
  [PAYMENT_METHOD.CHECK]: 'Çek',
  [PAYMENT_METHOD.OTHER]: 'Diğer',
}

/**
 * @param {{
 *   dueDate?: string
 *   mutating: boolean
 *   onPostPayment: (body: { amount: number, method: string, note?: string }) => Promise<void>
 *   onPatchTermin: (body: { committedShipBy: string, reason: string }) => Promise<void>
 * }} props
 */
export default function OrderDrawerOperations({ dueDate, mutating, onPostPayment, onPatchTermin }) {
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState(PAYMENT_METHOD.TRANSFER)
  const [payNote, setPayNote] = useState('')
  const [terminDate, setTerminDate] = useState(dueDate ?? '')
  const [terminReason, setTerminReason] = useState('')
  const [payError, setPayError] = useState(/** @type {string | null} */ (null))
  const [terminError, setTerminError] = useState(/** @type {string | null} */ (null))
  const [payOk, setPayOk] = useState(false)
  const [terminOk, setTerminOk] = useState(false)
  const apiMode = Boolean(getApiBaseUrl())

  async function handlePaymentSubmit(e) {
    e.preventDefault()
    setPayError(null)
    setPayOk(false)
    const amount = parseCurrencyInput(payAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError('Geçerli bir tutar girin.')
      return
    }
    try {
      await onPostPayment({
        amount,
        method: payMethod,
        ...(payNote.trim() ? { note: payNote.trim() } : {}),
      })
      setPayAmount('')
      setPayNote('')
      setPayOk(true)
    } catch (err) {
      setPayError(formatApiErrorMessage(err))
    }
  }

  async function handleTerminSubmit(e) {
    e.preventDefault()
    setTerminError(null)
    setTerminOk(false)
    if (!terminDate.trim()) {
      setTerminError('Termin tarihi seçin.')
      return
    }
    if (!terminReason.trim()) {
      setTerminError('Gerekçe zorunludur.')
      return
    }
    try {
      await onPatchTermin({ committedShipBy: terminDate.trim(), reason: terminReason.trim() })
      setTerminReason('')
      setTerminOk(true)
    } catch (err) {
      setTerminError(formatApiErrorMessage(err))
    }
  }

  return (
    <>
      {!apiMode ? (
        <p className="mos-drawer-op-meta" role="status">
          Mock mod: ödemeler tarayıcı oturumunda saklanır. Kalıcı DB için{' '}
          <code>client/.env</code> içinde <code>VITE_API_BASE_URL=http://localhost:4000</code> ayarlayın.
        </p>
      ) : null}
      <form className="mos-drawer-op-form" onSubmit={(e) => void handlePaymentSubmit(e)}>
        <p className="mos-drawer-op-kicker">Ödeme ekle</p>
        <div className="mos-drawer-op-row">
          <label className="mos-drawer-field mos-drawer-field--compact">
            <span className="mos-drawer-field-label">Tutar (₺)</span>
            <MosCurrencyInput
              className="mos-input"
              value={payAmount}
              onChange={setPayAmount}
              disabled={mutating}
              integerOnly
            />
          </label>
          <label className="mos-drawer-field mos-drawer-field--compact">
            <span className="mos-drawer-field-label">Yöntem</span>
            <select
              className="mos-input mos-select"
              value={payMethod}
              onChange={(e) =>
                setPayMethod(/** @type {import('../../contracts/v1/enums.js').PaymentMethod} */ (e.target.value))
              }
              disabled={mutating}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mos-drawer-field mos-drawer-field--compact">
          <span className="mos-drawer-field-label">Not (opsiyonel)</span>
          <input
            type="text"
            className="mos-input"
            value={payNote}
            onChange={(e) => setPayNote(e.target.value)}
            disabled={mutating}
            maxLength={200}
          />
        </label>
        <button type="submit" className="mos-btn mos-btn--sm" disabled={mutating}>
          Tahsilat kaydet
        </button>
        {payError ? (
          <p className="mos-drawer-op-error" role="alert">
            {payError}
          </p>
        ) : null}
        {payOk ? (
          <p className="mos-drawer-op-ok" role="status">
            Ödeme kaydedildi.
          </p>
        ) : null}
      </form>

      <form className="mos-drawer-op-form" onSubmit={(e) => void handleTerminSubmit(e)}>
        <p className="mos-drawer-op-kicker">Termin güncelle</p>
        <MobileDateField
          label="Yeni termin"
          className="mos-drawer-field mos-drawer-field--compact"
          value={terminDate}
          onChange={setTerminDate}
          disabled={mutating}
        />
        <label className="mos-drawer-field mos-drawer-field--compact">
          <span className="mos-drawer-field-label">Gerekçe</span>
          <input
            type="text"
            className="mos-input"
            value={terminReason}
            onChange={(e) => setTerminReason(e.target.value)}
            disabled={mutating}
            maxLength={300}
            placeholder="Müşteri talebi, üretim gecikmesi…"
          />
        </label>
        <button type="submit" className="mos-btn mos-btn--sm" disabled={mutating}>
          Termini kaydet
        </button>
        {terminError ? (
          <p className="mos-drawer-op-error" role="alert">
            {terminError}
          </p>
        ) : null}
        {terminOk ? (
          <p className="mos-drawer-op-ok" role="status">
            Termin güncellendi.
          </p>
        ) : null}
      </form>
    </>
  )
}
