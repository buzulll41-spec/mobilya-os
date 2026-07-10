import { useOrderLineReceiving } from '../../hooks/useOrderLineReceiving.js'

/**
 * @param {{ orderId: string, refreshKey?: number }} props
 */
export default function ProductReadinessSummary({ orderId, refreshKey = 0 }) {
  const { summary, loading } = useOrderLineReceiving(orderId, refreshKey)

  if (loading || !summary || summary.totalLines === 0) return null

  return (
    <section
      className={`oop-readiness-summary${summary.orderReadyToShip ? ' oop-readiness-summary--ready' : ''}`}
      aria-label="Ürün hazırlık durumu"
    >
      <div className="oop-readiness-summary__head">
        <h3 className="oop-readiness-summary__title">Ürün hazırlık durumu</h3>
        {summary.orderBadgeLabel ? (
          <span className="oop-readiness-summary__order-badge">{summary.orderBadgeLabel}</span>
        ) : null}
      </div>
      <p className="oop-readiness-summary__headline">{summary.headline}</p>
      {!summary.orderReadyToShip && summary.detailLines.length > 0 ? (
        <ul className="oop-readiness-summary__chips">
          {summary.readyCount > 0 ? (
            <li className="oop-readiness-chip oop-readiness-chip--ok">{summary.readyCount} hazır</li>
          ) : null}
          {summary.missingCount > 0 ? (
            <li className="oop-readiness-chip oop-readiness-chip--danger">{summary.missingCount} eksik</li>
          ) : null}
          {summary.waitingCount > 0 ? (
            <li className="oop-readiness-chip oop-readiness-chip--warn">{summary.waitingCount} bekleniyor</li>
          ) : null}
          {summary.partialCount > 0 ? (
            <li className="oop-readiness-chip oop-readiness-chip--caution">{summary.partialCount} kısmi</li>
          ) : null}
        </ul>
      ) : null}
    </section>
  )
}
