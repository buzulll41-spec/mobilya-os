/** @typedef {import('../../mappers/operation-map/operationMapKanbanModel.js').KanbanCard} KanbanCard */

/**
 * @param {{
 *   card: KanbanCard
 *   onOpen: (orderId: string) => void
 * }} props
 */
export default function OperationMapKanbanCard({ card, onOpen }) {
  const stripeTone = card.aiActivityTone ?? card.riskStripe
  const cardClass = card.aiActivityTone
    ? `opmap-kanban-card opmap-kanban-card--${card.riskStripe} opmap-kanban-card--ai-active opmap-kanban-card--ai-${card.aiActivityTone}`
    : `opmap-kanban-card opmap-kanban-card--${card.riskStripe}`

  return (
    <button
      type="button"
      className={cardClass}
      onClick={() => onOpen(card.orderId)}
      aria-label={`${card.customer} sipariş ${card.orderNo}`}
      draggable={false}
    >
      <div className={`opmap-kanban-card__stripe opmap-kanban-card__stripe--${stripeTone}`} />
      <div className="opmap-kanban-card__top">
        <strong className="opmap-kanban-card__customer">{card.customer}</strong>
        <span className="opmap-kanban-card__order-no">{card.orderNo}</span>
      </div>
      {card.badges.length > 0 ? (
        <div className="opmap-kanban-card__badges" aria-label="Durum rozetleri">
          {card.badges.map((badge) => (
            <span key={badge.id} className="opmap-kanban-card__badge" title={badge.label}>
              {badge.icon} {badge.label}
            </span>
          ))}
        </div>
      ) : null}
      <dl className="opmap-kanban-card__meta">
        <div>
          <dt>Toplam</dt>
          <dd>{card.totalLabel}</dd>
        </div>
        <div>
          <dt>Kalan</dt>
          <dd>{card.remainingLabel}</dd>
        </div>
        <div>
          <dt>Kapora</dt>
          <dd>{card.depositPercentLabel}</dd>
        </div>
        <div>
          <dt>Termin</dt>
          <dd>{card.terminLabel}</dd>
        </div>
        <div>
          <dt>Sevk</dt>
          <dd>{card.shipmentDateLabel}</dd>
        </div>
        <div>
          <dt>Tedarik</dt>
          <dd>{card.supplyStatusLabel}</dd>
        </div>
        <div className="opmap-kanban-card__meta-risk">
          <dt>Risk</dt>
          <dd>{card.riskLabel}</dd>
        </div>
      </dl>
    </button>
  )
}
