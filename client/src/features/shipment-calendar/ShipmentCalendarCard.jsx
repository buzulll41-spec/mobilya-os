/**
 * @param {{
 *   entry: import('../../mappers/shipment-calendar/shipmentCalendarModel.js').ShipmentCalendarEntry
 *   onSelect?: () => void
 *   onSelectOrder?: (orderId: string) => void
 * }} props
 */
export default function ShipmentCalendarCard({ entry, onSelect, onSelectOrder }) {
  return (
    <button
      type="button"
      className={`scl-card scl-card--${entry.tone}`}
      onClick={() => (onSelect ? onSelect() : onSelectOrder?.(entry.orderId))}
      title={entry.sshDetail ?? undefined}
    >
      <div className="scl-card__head">
        <strong className="scl-card__customer">{entry.customer}</strong>
        <span className="scl-card__time">{entry.timeLabel}</span>
      </div>
      <p className="scl-card__region">{entry.region}</p>
      <div className="scl-card__badges">
        <span className="scl-badge scl-badge--status">{entry.statusLabel}</span>
        <span className={`scl-badge scl-badge--tone scl-badge--${entry.tone}`}>
          {entry.toneLabel}
        </span>
        {entry.hasSsh ? (
          <span className="scl-badge scl-badge--ssh" title={entry.sshDetail ?? ''}>
            SSH Takibi
          </span>
        ) : null}
      </div>
      <p className="scl-card__meta">
        {entry.deliveryType} · {entry.paymentLabel}
      </p>
    </button>
  )
}
