import { memo } from 'react'

/**
 * @param {{
 *   items: { id: string, timeLabel: string, actor: string, message: string, tone?: string }[]
 * }} props
 */
function ExecutiveLiveFeed({ items }) {
  return (
    <aside className="ecc-live-feed" aria-label="CEO canlı operasyon akışı">
      <div className="ecc-live-feed__head">
        <h2 className="ecc-live-feed__title">CEO Live Feed</h2>
        <span className="ecc-live-feed__live-dot" aria-hidden />
      </div>
      {items.length === 0 ? (
        <p className="ecc-empty">Canlı akış başlıyor…</p>
      ) : (
        <ul className="ecc-live-feed__list">
          {items.map((item) => (
            <li key={item.id} className={`ecc-live-feed__item ecc-live-feed__item--${item.tone ?? 'neutral'}`}>
              <span className="ecc-live-feed__time">{item.timeLabel}</span>
              <strong className="ecc-live-feed__actor">{item.actor}</strong>
              <p className="ecc-live-feed__message">{item.message}</p>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

export default memo(ExecutiveLiveFeed)
