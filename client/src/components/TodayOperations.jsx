import { formatShortDate } from '../utils/dates.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */

/**
 * @param {{
 *   todayIso: string
 *   deliveries: Order[]
 *   missing: Order[]
 *   crews: { id: string; ad: string; uyeler: string; saat: string; not: string }[]
 *   onOrderClick?: (order: Order) => void
 * }} props
 */
export default function TodayOperations({
  todayIso,
  deliveries,
  missing,
  crews,
  onOrderClick,
}) {
  return (
    <section className="mos-card mos-card--saas mos-today-card" aria-labelledby="mos-today-title">
      <div className="mos-today-head">
        <h2 id="mos-today-title" className="mos-panel-title">
          Bugünkü operasyon
        </h2>
        <span className="mos-today-date">{formatShortDate(todayIso)}</span>
      </div>

      <div className="mos-today-grid">
        <div className="mos-today-col">
          <h3 className="mos-today-col-title">Teslimatlar</h3>
          {deliveries.length === 0 ? (
            <p className="mos-today-empty">Bugün planlı sevk yok.</p>
          ) : (
            <ul className="mos-today-list">
              {deliveries.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className="mos-today-hit"
                    onClick={() => onOrderClick?.(o)}
                  >
                    <span className="mos-today-strong">{o.customer}</span>
                    <span className="mos-today-muted">{o.product}</span>
                    <span className="mos-today-id">{o.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mos-today-col">
          <h3 className="mos-today-col-title">Montaj ekipleri</h3>
          <ul className="mos-today-list mos-today-list--crews">
            {crews.map((c) => (
              <li key={c.id} className="mos-today-crew">
                <span className="mos-today-crew-name">{c.ad}</span>
                <span className="mos-today-crew-meta">{c.uyeler}</span>
                <span className="mos-today-crew-time">{c.saat}</span>
                <span className="mos-today-crew-note">{c.not}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mos-today-col">
          <h3 className="mos-today-col-title">Eksik ürün uyarıları</h3>
          {missing.length === 0 ? (
            <p className="mos-today-empty">Eksik kayıt yok.</p>
          ) : (
            <ul className="mos-today-list">
              {missing.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className="mos-today-hit mos-today-hit--alert"
                    onClick={() => onOrderClick?.(o)}
                  >
                    <span className="mos-today-strong">{o.id}</span>
                    <span className="mos-today-muted">{o.product}</span>
                    <span className="mos-today-alert-pill">Eksik var</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
