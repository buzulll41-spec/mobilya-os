/**
 * @param {{
 *   cards: import('../../mappers/shipment/shipmentOpsViewModel.js').ShipmentOpsKpi[]
 * }} props
 */
export default function ShipmentOpsKpiStrip({ cards }) {
  return (
    <div className="sops-kpi-strip" aria-label="Sevk operasyon özeti">
      {cards.map((card) => (
        <article key={card.id} className={`sops-kpi sops-kpi--${card.tone}`}>
          <span className="sops-kpi__label">{card.label}</span>
          <strong className="sops-kpi__value">{card.value}</strong>
          {card.hint ? <span className="sops-kpi__hint">{card.hint}</span> : null}
        </article>
      ))}
    </div>
  )
}
