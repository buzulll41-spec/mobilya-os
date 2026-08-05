import { useEffect, useId, useState } from 'react'
import { DELIVERY_FAIL_REASONS } from '../../constants/shipmentPlanStatuses.js'
import { IconClose } from '../../components/Icons.jsx'
import '../../styles/shipment-delivery-confirm.css'

/**
 * @param {{
 *   open: boolean
 *   customerName: string
 *   orderNumber: string
 *   mutating?: boolean
 *   onClose: () => void
 *   onConfirm: (payload: { reason: string, note?: string }) => void | Promise<void>
 * }} props
 */
export default function ShipmentDeliveryFailModal({
  open,
  customerName,
  orderNumber,
  mutating = false,
  onClose,
  onConfirm,
}) {
  const titleId = useId()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!open) return
    setReason('')
    setNote('')
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Teslim edilemedi sebebi zorunlu.')
      return
    }
    setError(null)
    await onConfirm({
      reason: reason.trim(),
      ...(note.trim() ? { note: note.trim() } : {}),
    })
  }

  return (
    <div className="sdc-root" role="presentation">
      <button type="button" className="sdc-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="sdc-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="sdc-head">
          <div>
            <p className="sdc-kicker">Teslim Edilemedi</p>
            <h2 id={titleId} className="sdc-title">
              {customerName}
            </h2>
            <p className="sdc-sub">{orderNumber}</p>
          </div>
          <button type="button" className="sdc-close" onClick={onClose} aria-label="Kapat">
            <IconClose />
          </button>
        </header>

        <div className="sdc-body">
          <label className="sdc-field">
            <span>Sebep</span>
            <select className="sdc-input" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Seçin</option>
              {DELIVERY_FAIL_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="sdc-field">
            <span>Not (opsiyonel)</span>
            <input
              type="text"
              className="sdc-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Ek açıklama…"
            />
          </label>

          {error ? (
            <p className="sdc-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="sdc-foot">
          <button type="button" className="sdc-btn" onClick={onClose} disabled={mutating}>
            İptal
          </button>
          <button type="button" className="sdc-btn sdc-btn--danger" disabled={mutating} onClick={() => void handleSubmit()}>
            {mutating ? 'Kaydediliyor…' : 'Teslim Edilemedi'}
          </button>
        </footer>
      </div>
    </div>
  )
}
