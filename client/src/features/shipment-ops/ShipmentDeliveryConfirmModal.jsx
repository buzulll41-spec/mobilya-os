import { useEffect, useId, useState } from 'react'
import { SHIPMENT_CREW_OPTIONS, SHIPMENT_VEHICLE_OPTIONS } from '../../mappers/shipment-ops/shipmentPlanConstants.js'
import MobileDateField from '../../components/mobile/MobileDateField.jsx'
import { IconClose } from '../../components/Icons.jsx'
import '../../styles/shipment-delivery-confirm.css'

/**
 * @param {{
 *   open: boolean
 *   customerName: string
 *   orderNumber: string
 *   defaultVehicle?: string
 *   defaultPersonnel?: string
 *   defaultDate?: string
 *   defaultTime?: string
 *   mutating?: boolean
 *   onClose: () => void
 *   onConfirm: (payload: {
 *     deliveredBy: string
 *     vehicle: string
 *     deliveredAt: string
 *     note?: string
 *     customerConfirmNote?: string
 *   }) => void | Promise<void>
 * }} props
 */
export default function ShipmentDeliveryConfirmModal({
  open,
  customerName,
  orderNumber,
  defaultVehicle = '',
  defaultPersonnel = '',
  defaultDate = '',
  defaultTime = '',
  mutating = false,
  onClose,
  onConfirm,
}) {
  const titleId = useId()
  const [deliveredBy, setDeliveredBy] = useState(defaultPersonnel)
  const [vehicle, setVehicle] = useState(defaultVehicle)
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState(defaultTime)
  const [note, setNote] = useState('')
  const [customerConfirmNote, setCustomerConfirmNote] = useState('')
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!open) return
    setDeliveredBy(defaultPersonnel)
    setVehicle(defaultVehicle)
    setDate(defaultDate)
    setTime(defaultTime)
    setNote('')
    setCustomerConfirmNote('')
    setError(null)
  }, [open, defaultPersonnel, defaultVehicle, defaultDate, defaultTime])

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
    if (!deliveredBy.trim()) {
      setError('Teslim eden personel zorunlu.')
      return
    }
    if (!vehicle.trim()) {
      setError('Araç bilgisi zorunlu.')
      return
    }
    if (!date.trim()) {
      setError('Teslim tarihi zorunlu.')
      return
    }
    const deliveredAt = time.trim() ? `${date}T${time}:00` : `${date}T12:00:00`
    setError(null)
    await onConfirm({
      deliveredBy: deliveredBy.trim(),
      vehicle: vehicle.trim(),
      deliveredAt,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(customerConfirmNote.trim() ? { customerConfirmNote: customerConfirmNote.trim() } : {}),
    })
  }

  return (
    <div className="sdc-root" role="presentation">
      <button type="button" className="sdc-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="sdc-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="sdc-head">
          <div>
            <p className="sdc-kicker">Teslim Onayı</p>
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
            <span>Teslim eden personel</span>
            <select className="sdc-input" value={deliveredBy} onChange={(e) => setDeliveredBy(e.target.value)}>
              <option value="">Seçin</option>
              {SHIPMENT_CREW_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="sdc-field">
            <span>Araç</span>
            <select className="sdc-input" value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
              <option value="">Seçin</option>
              {SHIPMENT_VEHICLE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <div className="sdc-row">
            <MobileDateField label="Teslim tarihi" className="sdc-field" value={date} onChange={setDate} />
            <label className="sdc-field">
              <span>Saat</span>
              <input type="time" className="sdc-input" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>

          <label className="sdc-field">
            <span>Not</span>
            <input
              type="text"
              className="sdc-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Teslim detayı…"
            />
          </label>

          <label className="sdc-field">
            <span>Müşteri teslim onayı (opsiyonel)</span>
            <input
              type="text"
              className="sdc-input"
              value={customerConfirmNote}
              onChange={(e) => setCustomerConfirmNote(e.target.value)}
              maxLength={200}
              placeholder="İmza / onay notu…"
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
            {mutating ? 'Kaydediliyor…' : 'Teslim Et'}
          </button>
        </footer>
      </div>
    </div>
  )
}
