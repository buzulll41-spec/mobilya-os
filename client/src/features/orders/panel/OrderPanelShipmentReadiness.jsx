/** @typedef {import('../../../mappers/order/shipmentReadinessScore.js').ShipmentReadinessModel} ShipmentReadinessModel */

/**
 * @param {{ model: ShipmentReadinessModel }} props
 */
export default function OrderPanelShipmentReadiness({ model }) {
  return (
    <section className="oop-card oop-card--saas oop-shipment-readiness" aria-labelledby="oop-readiness-title">
      <div className="oop-shipment-readiness__head">
        <div>
          <h3 id="oop-readiness-title" className="oop-card-title">
            Sevk Uygunluk Skoru
          </h3>
          <p className="oop-muted oop-muted--inline">Sevk kararı için hızlı kontrol</p>
        </div>
        <div className="oop-shipment-readiness__score" aria-label={`Skor ${model.score} yüz üzerinden`}>
          <strong>{model.score}</strong>
          <span>/ 100</span>
        </div>
      </div>
      <ul className="oop-shipment-readiness__checks">
        {model.checks.map((check) => (
          <li
            key={check.id}
            className={`oop-shipment-readiness__check oop-shipment-readiness__check--${check.tone}`}
          >
            <span className="oop-shipment-readiness__mark" aria-hidden>
              {check.tone === 'ok' ? '✓' : '⚠'}
            </span>
            <span className="oop-shipment-readiness__check-label">{check.label}</span>
            {check.detail ? (
              <span className="oop-shipment-readiness__check-detail">{check.detail}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
