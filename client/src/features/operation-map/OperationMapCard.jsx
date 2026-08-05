/** @typedef {import('../../mappers/operation-map/operationMapModel.js').OperationMapCard} OperationMapCard */

/**
 * @param {{
 *   card: OperationMapCard
 *   onOpen: (orderId: string) => void
 * }} props
 */
export default function OperationMapCard({ card, onOpen }) {
  return (
    <button
      type="button"
      className={`opmap-card opmap-card--${card.riskTone}`}
      onClick={() => onOpen(card.orderId)}
      aria-label={`${card.customer} sipariş ${card.orderNo}`}
    >
      <div className="opmap-card__head">
        <strong className="opmap-card__customer">{card.customer}</strong>
        <span className={`opmap-card__risk opmap-card__risk--${card.riskTone}`}>{card.riskLabel}</span>
      </div>
      <p className="opmap-card__order-no">{card.orderNo}</p>
      <dl className="opmap-card__meta">
        <div>
          <dt>Tutar</dt>
          <dd>{card.totalLabel}</dd>
        </div>
        <div>
          <dt>Kalan</dt>
          <dd>{card.remainingLabel}</dd>
        </div>
        <div>
          <dt>Tedarik</dt>
          <dd>{card.supplyStatusLabel}</dd>
        </div>
        <div>
          <dt>Sevk</dt>
          <dd>{card.shipmentStatusLabel}</dd>
        </div>
      </dl>
    </button>
  )
}
