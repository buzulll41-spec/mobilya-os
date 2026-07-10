/**
 * @param {{
 *   items: import('../../mappers/dashboard/computeDashboardControlTower.js').DashboardFeedItem[]
 *   onOrderClick?: (orderId: string) => void
 * }} props
 */
export default function DashboardTodayFeed({ items, onOrderClick }) {
  return (
    <section className="dct-card dct-feed" aria-labelledby="dct-feed-title">
      <header className="dct-card-head">
        <h2 id="dct-feed-title" className="dct-card-title">
          Bugünkü operasyon akışı
        </h2>
        <p className="dct-card-sub">Son hareketler — bugün ne oldu?</p>
      </header>
      {items.length === 0 ? (
        <p className="dct-empty dct-empty--ok" role="status">
          Bugün henüz kayıtlı hareket yok. Sakin bir gün.
        </p>
      ) : (
        <ol className="dct-feed-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`dct-feed-item dct-feed-item--${item.tone}`}
                onClick={() => onOrderClick?.(item.orderId)}
              >
                <span className={`dct-feed-dot dct-feed-dot--${item.tone}`} aria-hidden />
                <span className="dct-feed-body">
                  <span className="dct-feed-label">{item.label}</span>
                  <span className="dct-feed-detail">{item.detail}</span>
                </span>
                <span className="dct-feed-time">{item.timeLabel}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
