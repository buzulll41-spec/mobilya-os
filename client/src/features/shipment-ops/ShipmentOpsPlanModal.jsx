import { useEffect, useMemo, useState } from 'react'
import { IconClose } from '../../components/Icons.jsx'
import { KNOWN_SHIPMENT_REGIONS } from '../../mappers/shipment-ops/shipmentRegionNormalize.js'
import {
  SHIPMENT_CREW_OPTIONS,
  SHIPMENT_VEHICLE_OPTIONS,
} from '../../mappers/shipment-ops/shipmentPlanConstants.js'
import { detectPlanConflicts } from '../../mappers/shipment-ops/shipmentPlanConflict.js'
import { normalizePlanTime } from '../../state/shipmentPlanStore.js'

/** @typedef {import('../../mappers/shipment-ops/shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @param {{
 *   item: ShipmentAgendaItem
 *   initialPlan: ShipmentPlan
 *   allPlans: ShipmentPlan[]
 *   onSave: (plan: ShipmentPlan) => void | Promise<void>
 *   onClose: () => void
 * }} props
 */
export default function ShipmentOpsPlanModal({ item, initialPlan, allPlans, onSave, onClose }) {
  const [saving, setSaving] = useState(false)
  const [plannedDate, setPlannedDate] = useState(initialPlan.plannedDate)
  const [plannedTime, setPlannedTime] = useState(initialPlan.plannedTime)
  const [region, setRegion] = useState(initialPlan.region)
  const [vehicle, setVehicle] = useState(initialPlan.vehicle)
  const [crew1, setCrew1] = useState(initialPlan.crew1)
  const [crew2, setCrew2] = useState(initialPlan.crew2)
  const [note, setNote] = useState(initialPlan.note)

  useEffect(() => {
    setPlannedDate(initialPlan.plannedDate)
    setPlannedTime(initialPlan.plannedTime)
    setRegion(initialPlan.region)
    setVehicle(initialPlan.vehicle)
    setCrew1(initialPlan.crew1)
    setCrew2(initialPlan.crew2)
    setNote(initialPlan.note)
  }, [initialPlan])

  const draftPlan = useMemo(
    () => ({
      id: initialPlan.id,
      orderId: item.orderId,
      plannedDate,
      plannedTime: normalizePlanTime(plannedTime),
      region: region.trim(),
      vehicle,
      crew1,
      crew2,
      note: note.trim(),
      groupId: initialPlan.groupId,
      updatedAt: initialPlan.updatedAt,
    }),
    [item.orderId, plannedDate, plannedTime, region, vehicle, crew1, crew2, note, initialPlan],
  )

  const conflicts = useMemo(
    () => detectPlanConflicts(draftPlan, allPlans, item.orderId),
    [draftPlan, allPlans, item.orderId],
  )

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        ...draftPlan,
        plannedTime: normalizePlanTime(plannedTime),
        region: region.trim(),
        note: note.trim(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sops-v3-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="sops-v3-modal sops-v3-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sops-plan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sops-v3-modal__head">
          <div>
            <h2 id="sops-plan-title" className="sops-v3-modal__title">
              Sevk Planla
            </h2>
            <p className="sops-v3-modal__sub">
              {item.customer} · {item.orderNumber}
            </p>
          </div>
          <button type="button" className="sops-v3-modal__close" aria-label="Kapat" onClick={onClose}>
            <IconClose />
          </button>
        </header>

        <div className="sops-v3-modal__body">
          <div className="sops-v4-form">
            <label className="sops-v4-field">
              <span>Planlanan tarih</span>
              <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
            </label>
            <label className="sops-v4-field">
              <span>Planlanan saat</span>
              <input
                type="time"
                value={plannedTime}
                onChange={(e) => setPlannedTime(e.target.value)}
              />
            </label>
            <label className="sops-v4-field">
              <span>Bölge / ilçe</span>
              <input
                list="sops-region-options"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="İzmit, Gebze…"
              />
              <datalist id="sops-region-options">
                {KNOWN_SHIPMENT_REGIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </label>
            <label className="sops-v4-field">
              <span>Araç</span>
              <select value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
                <option value="">Seçin</option>
                {SHIPMENT_VEHICLE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="sops-v4-field">
              <span>Montaj ustası 1</span>
              <select value={crew1} onChange={(e) => setCrew1(e.target.value)}>
                <option value="">Seçin</option>
                {SHIPMENT_CREW_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="sops-v4-field">
              <span>Montaj ustası 2 / yardımcı</span>
              <select value={crew2} onChange={(e) => setCrew2(e.target.value)}>
                <option value="">Seçin</option>
                {SHIPMENT_CREW_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="sops-v4-field sops-v4-field--full">
              <span>Sevk notu</span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Müşteri öğleden sonra evde…"
              />
            </label>
          </div>

          {(conflicts.vehicleWarnings.length > 0 || conflicts.crewWarnings.length > 0) && (
            <div className="sops-v4-conflicts" role="status">
              {[...conflicts.vehicleWarnings, ...conflicts.crewWarnings].map((msg) => (
                <p key={msg} className="sops-v4-conflicts__line">
                  {msg}
                </p>
              ))}
            </div>
          )}
        </div>

        <footer className="sops-v3-modal__foot sops-v3-modal__foot--split">
          <button type="button" className="mos-btn mos-btn--ghost" onClick={onClose}>
            İptal
          </button>
          <button type="button" className="mos-btn mos-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </footer>
      </div>
    </div>
  )
}
