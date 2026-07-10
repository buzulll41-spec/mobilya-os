import { memo } from 'react'

/**
 * @param {{ items: { id: string, type: string, message: string, timeLabel: string, scenarioId: string, tone: string }[] }} props
 */
function AiDecisionLogPanel({ items }) {
  return (
    <section className="mos-erp-cockpit-section dw-ai-decisions" aria-label="AI Decisions">
      <h2 className="mos-erp-cockpit-section__title">AI DECISIONS</h2>
      <ul className="dw-ai-decisions__list">
        {items.length === 0 ? (
          <li className="dw-ai-decisions__empty">Henüz karar yok</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className={`dw-ai-decisions__item dw-ai-decisions__item--${item.tone}`}>
              <span className="dw-ai-decisions__time">{item.timeLabel}</span>
              <span className="dw-ai-decisions__type">{item.type}</span>
              <span className="dw-ai-decisions__msg">{item.message}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}

export default memo(AiDecisionLogPanel)
