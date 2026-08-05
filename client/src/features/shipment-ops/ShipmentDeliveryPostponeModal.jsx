import { useEffect, useId, useState } from 'react'
import MobileDateField from '../../components/mobile/MobileDateField.jsx'
import { IconClose } from '../../components/Icons.jsx'
import '../../styles/shipment-delivery-confirm.css'

/**
 * @param {{
 *   open: boolean
 *   customerName: string
 *   orderNumber: string
 *   defaultDate?: string
 *   mutating?: boolean
 *   onClose: () => void
 *   onConfirm: (payload: { newDate: string, note?: string }) => void | Promise<void>
 * }} props
 */
export default function ShipmentDeliveryPostponeModal({
  open,
  customerName,
  orderNumber,
  defaultDate = '',
  mutating = false,
  onClose,
  onConfirm,
}) {
  const titleId = useId()
  const [newDate, setNewDate] = useState(defaultDate)
  const [note, setNote] = useState('')
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!open) return
    setNewDate(defaultDate)
    setNote('')
    setError(null)
  }, [open, defaultDate])

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
    if (!newDate.trim()) {
      setError('Yeni sevk tarihi zorunlu.')
      return
    }
    setError(null)
    await onConfirm({
      newDate: newDate.trim(),
      ...(note.trim() ? { note: note.trim() } : {}),
    })
  }

  return (
    <div className="sdc-root" role="presentation">
      <button type="button" className="sdc-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="sdc-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="sdc-head">
          <div>
            <p className="sdc-kicker">Ertele</p>
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
          <MobileDateField label="Yeni sevk tarihi" className="sdc-field" value={newDate} onChange={setNewDate} />

          <label className="sdc-field">
            <span>Not (opsiyonel)</span>
            <input
              type="text"
              className="sdc-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Erteleme nedeni…"
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
          <button type="button" className="sdc-btn sdc-btn--primary" disabled={mutating} onClick={() => void handleSubmit()}>
            {mutating ? 'Kaydediliyor…' : 'Ertele'}
          </button>
        </footer>
      </div>
    </div>
  )
}
