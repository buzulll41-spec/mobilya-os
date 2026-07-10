import { formatShortDate } from '../../../utils/dates.js'

/** @typedef {import('../../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */
/** @typedef {import('../../../mappers/order/shipmentReadinessScore.js').ShipmentReadinessModel} ShipmentReadinessModel */

/**
 * @param {{
 *   plan?: ShipmentPlan
 *   readiness: ShipmentReadinessModel
 * }} props
 */
export default function OrderPanelShipmentKpiStrip({ plan, readiness }) {
  const items = [
    { id: 'vehicle', label: 'Araç', value: plan?.vehicle?.trim() || 'Atanmadı' },
    { id: 'crew', label: 'Ekip', value: [plan?.crew1, plan?.crew2].filter(Boolean).join(' + ') || 'Atanmadı' },
    { id: 'time', label: 'Saat', value: plan?.plannedTime?.trim() || '—' },
    { id: 'region', label: 'Bölge', value: plan?.region?.trim() || 'Belirsiz' },
    {
      id: 'score',
      label: 'Uygunluk',
      value: `${readiness.score}/100`,
      emphasis: readiness.score >= 80,
      warn: readiness.score < 60,
    },
  ]

  return (
    <div className="oop-shipment-kpi-strip" aria-label="Sevk özet göstergeleri">
      {items.map((item) => (
        <article
          key={item.id}
          className={`oop-shipment-kpi${item.emphasis ? ' oop-shipment-kpi--ok' : ''}${item.warn ? ' oop-shipment-kpi--warn' : ''}`}
        >
          <span className="oop-shipment-kpi__label">{item.label}</span>
          <strong className="oop-shipment-kpi__value">{item.value}</strong>
          {plan?.plannedDate && item.id === 'time' ? (
            <span className="oop-shipment-kpi__sub">{formatShortDate(plan.plannedDate)}</span>
          ) : null}
        </article>
      ))}
    </div>
  )
}
