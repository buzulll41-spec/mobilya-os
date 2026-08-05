import { useEffect, useMemo, useState } from 'react'
import { formatTry } from '../../data/index.js'
import { formatShortDate } from '../../utils/dates.js'
import { IconClose } from '../../components/Icons.jsx'
import {
  SHIPMENT_CREW_OPTIONS,
  SHIPMENT_VEHICLE_OPTIONS,
} from '../../mappers/shipment-ops/shipmentPlanConstants.js'
import { detectPlanConflicts } from '../../mappers/shipment-ops/shipmentPlanConflict.js'
import { buildAutoGroupPlans } from '../../mappers/shipment-ops/shipmentVehiclePlanModel.js'
import { normalizePlanTime } from '../../state/shipmentPlanStore.js'

/** @typedef {import('../../mappers/shipment-ops/shipmentOpportunityEngine.js').ShipmentOpportunityGroup} ShipmentOpportunityGroup */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */
/** @typedef {import('../../state/shipmentGroupStore.js').ShipmentGroup} ShipmentGroup */

/**
 * @param {{
 *   group: ShipmentOpportunityGroup | null
 *   allPlans: ShipmentPlan[]
 *   selectedDate: string
 *   onCreateGroup: (input: { group: ShipmentOpportunityGroup, plans: ShipmentPlan[] }) => Promise<unknown>
 *   onClose: () => void
 * }} props
 */
export default function ShipmentOpsGroupModal({
  group,
  allPlans,
  selectedDate,
  onCreateGroup,
  onClose,
}) {
  const [saving, setSaving] = useState(false)
  const [plannedDate, setPlannedDate] = useState('')
  const [plannedTime, setPlannedTime] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [crew1, setCrew1] = useState('')
  const [crew2, setCrew2] = useState('')

  useEffect(() => {
    if (!group) return
    const autoPlans = buildAutoGroupPlans(group, selectedDate, allPlans)
    setPlannedDate(selectedDate)
    setPlannedTime(autoPlans[0]?.plannedTime || '09:30')
    setVehicle(autoPlans[0]?.vehicle || 'Araç 1')
    setCrew1('Muhammet')
    setCrew2('Cihan')
  }, [group, selectedDate, allPlans])

  const draftPlans = useMemo(() => {
    if (!group) return []
    const baseMinutes = (() => {
      const t = normalizePlanTime(plannedTime)
      const m = t.match(/^(\d{2}):(\d{2})$/)
      if (!m) return 9 * 60
      return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10)
    })()

    return group.orders.map((o, index) => ({
      orderId: o.orderId,
      plannedDate,
      plannedTime: (() => {
        const mins = baseMinutes + index * 120
        const h = Math.floor(mins / 60) % 24
        const min = mins % 60
        return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
      })(),
      region: group.region,
      vehicle,
      crew1,
      crew2,
      note: `${group.region} sevk grubu`,
      updatedAt: new Date().toISOString(),
    }))
  }, [group, plannedDate, plannedTime, vehicle, crew1, crew2])

  const conflicts = useMemo(() => {
    if (!draftPlans.length) return { vehicleWarnings: [], crewWarnings: [] }
    const mergedPlans = [
      ...allPlans.filter((p) => !draftPlans.some((d) => d.orderId === p.orderId)),
      ...draftPlans,
    ]
    const vehicleWarnings = []
    const crewWarnings = []
    for (const plan of draftPlans) {
      const c = detectPlanConflicts(plan, mergedPlans, plan.orderId)
      vehicleWarnings.push(...c.vehicleWarnings)
      crewWarnings.push(...c.crewWarnings)
    }
    return {
      vehicleWarnings: [...new Set(vehicleWarnings)],
      crewWarnings: [...new Set(crewWarnings)],
    }
  }, [draftPlans, allPlans])

  if (!group) return null

  async function handleSave() {
    if (!group) return
    setSaving(true)
    try {
      await onCreateGroup({ group, plans: draftPlans })
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
        aria-labelledby="sops-group-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sops-v3-modal__head">
          <div>
            <h2 id="sops-group-title" className="sops-v3-modal__title">
              {group.region} sevk grubu planla
            </h2>
            <p className="sops-v3-modal__sub">
              {group.orderCount} sipariş · Tasarruf {formatTry(group.estimatedSavings)}
            </p>
          </div>
          <button type="button" className="sops-v3-modal__close" aria-label="Kapat" onClick={onClose}>
            <IconClose />
          </button>
        </header>

        <div className="sops-v3-modal__body">
          <div className="sops-v4-form sops-v4-form--compact">
            <label className="sops-v4-field">
              <span>Önerilen tarih</span>
              <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
            </label>
            <label className="sops-v4-field">
              <span>İlk sevk saati</span>
              <input type="time" value={plannedTime} onChange={(e) => setPlannedTime(e.target.value)} />
            </label>
            <label className="sops-v4-field">
              <span>Bölge</span>
              <input value={group.region} readOnly />
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
              <span>Montaj ustası 2</span>
              <select value={crew2} onChange={(e) => setCrew2(e.target.value)}>
                <option value="">Seçin</option>
                {SHIPMENT_CREW_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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

          <h3 className="sops-v4-subtitle">Önerilen siparişler</h3>
          <ul className="sops-v3-modal__list">
            {draftPlans.map((plan, index) => {
              const order = group.orders[index]
              return (
                <li key={plan.orderId} className="sops-v3-modal__row">
                  <div>
                    <strong>{order.customer}</strong>
                    <span className="sops-v3-modal__meta">
                      {order.product} · {plan.plannedTime}
                    </span>
                  </div>
                  <div className="sops-v3-modal__nums">
                    <span>{formatShortDate(plan.plannedDate)}</span>
                    <span>{formatTry(order.remaining)} kalan</span>
                  </div>
                </li>
              )
            })}
          </ul>
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
