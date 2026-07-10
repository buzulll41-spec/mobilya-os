/**
 * @param {{
 *   cards: import('../../../mappers/order/orderCommandCenterModel.js').CommandKpiCard[]
 * }} props
 */
export default function OperationCommandKpis({ cards }) {
  return (
    <div className="oop-cmd-kpis oop-cmd-kpis--v9 oop-cmd-kpis--overview" aria-label="Operasyon göstergeleri">
      {cards.map((card) => (
        <article
          key={card.id}
          className={`oop-cmd-kpi oop-cmd-kpi--${card.tone}${card.emphasis ? ' oop-cmd-kpi--emphasis' : ''}`}
        >
          <div className="oop-cmd-kpi__body">
            <span className="oop-cmd-kpi__label">{card.label}</span>
            {card.showAsBadge ? (
              <span className={`oop-cmd-kpi__badge oop-cmd-kpi__badge--${card.badgeTone ?? 'wait'}`}>
                {card.value}
              </span>
            ) : (
              <strong className="oop-cmd-kpi__value">{card.value}</strong>
            )}
            {card.sub ? <span className="oop-cmd-kpi__sub">{card.sub}</span> : null}
          </div>
        </article>
      ))}
    </div>
  )
}
