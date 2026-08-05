import { memo } from 'react'

/**
 * @param {{ items: { id: string, headline: string, message: string, timeLabel?: string, tone?: string }[] }} props
 */
function OperationFeedPanel({ items }) {
  return (
    <section className="mos-erp-cockpit-section dw-operation-feed" aria-label="Operation Feed">
      <h2 className="mos-erp-cockpit-section__title">Operation Feed</h2>
      {items.length === 0 ? (
        <p className="dw-operation-feed__empty">Henüz Company Manager kararı yok.</p>
      ) : (
        <ol className="dw-operation-feed__list">
          {items.map((item) => (
            <li key={item.id} className={`dw-operation-feed__item dw-operation-feed__item--${item.tone ?? 'info'}`}>
              <span className="dw-operation-feed__headline">{item.headline}</span>
              <span className="dw-operation-feed__arrow" aria-hidden="true">
                ↓
              </span>
              <span className="dw-operation-feed__message">{item.message}</span>
              {item.timeLabel ? <time className="dw-operation-feed__time">{item.timeLabel}</time> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default memo(OperationFeedPanel)
