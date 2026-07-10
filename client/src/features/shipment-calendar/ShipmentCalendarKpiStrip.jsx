/**
 * @param {{
 *   cards: import('../../mappers/shipment-calendar/shipmentCalendarModel.js').CalendarSummaryKpi[]
 * }} props
 */
export default function ShipmentCalendarKpiStrip({ cards }) {
  return (
    <div className="scl-kpi-strip" aria-label="Sevk takvimi özeti">
      {cards.map((card) => (
        <article key={card.id} className={`scl-kpi scl-kpi--${card.tone}`}>
          <span className="scl-kpi__label">{card.label}</span>
          <strong className="scl-kpi__value">{card.value}</strong>
          {card.hint ? <span className="scl-kpi__hint">{card.hint}</span> : null}
        </article>
      ))}
    </div>
  )
}
