import { formatShortDate } from '../../utils/dates.js'
import { shipmentQueueCardStatusLabel } from '../../mappers/shipment/shipmentOperationUx.js'

/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */

/**
 * @param {{
 *   row: ShipmentRowVM
 *   onOpen?: (row: ShipmentRowVM) => void
 * }} props
 */
export default function ShipmentQueueCard({ row, onOpen }) {
  const orderNo = row.orderNumber ?? row.id ?? '—'
  const customer = row.customer?.trim() || '—'
  const dateRaw = row.plannedShipDate ?? row.shipmentDate
  const dateLabel = dateRaw ? formatShortDate(dateRaw) : 'Tarih yok'
  const statusLabel = shipmentQueueCardStatusLabel(row.shipmentStatus, {
    installationPending: row.installationPending,
    hasShipmentIssue: row.hasShipmentIssue,
  })

  return (
    <article className="mos-shipment-card">
      <div className="mos-shipment-card__main">
        <p className="mos-shipment-card__order">{orderNo}</p>
        <p className="mos-shipment-card__customer">{customer}</p>
        <p className="mos-shipment-card__meta">
          <span>{dateLabel}</span>
          <span className="mos-shipment-card__dot" aria-hidden>
            ·
          </span>
          <span className="mos-shipment-card__status">{statusLabel}</span>
        </p>
      </div>
      {onOpen ? (
        <button
          type="button"
          className="mos-btn mos-btn--sm mos-shipment-card__open"
          onClick={() => onOpen(row)}
        >
          Aç
        </button>
      ) : null}
    </article>
  )
}
