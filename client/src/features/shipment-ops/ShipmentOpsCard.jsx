import { formatShortDate } from '../../utils/dates.js'
import { shipmentQueueCardStatusLabel } from '../../mappers/shipment/shipmentOperationUx.js'
import { RISK_SEVERITY } from '../../contracts/v1/enums.js'

/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */

/**
 * @param {string | undefined} severity
 */
function riskBadgeLabel(severity) {
  switch (severity) {
    case RISK_SEVERITY.HIGH:
    case 'HIGH':
      return 'Yüksek risk'
    case RISK_SEVERITY.MEDIUM:
    case 'MEDIUM':
      return 'Risk'
    default:
      return null
  }
}

/**
 * @param {ShipmentRowVM} row
 */
function remainingLabel(row) {
  const rem = row.remainingQty
  if (row.partiallyShipped && rem != null && Number.isFinite(rem)) {
    return `Kalan ${rem.toFixed(0)} adet`
  }
  if (row.partiallyShipped) return 'Kısmi sevk'
  return null
}

/**
 * @param {{
 *   row: ShipmentRowVM
 *   onOpen?: (row: ShipmentRowVM) => void
 * }} props
 */
export default function ShipmentOpsCard({ row, onOpen }) {
  const customer = row.customer?.trim() || '—'
  const product = row.product?.trim() || '—'
  const dateRaw = row.plannedShipDate ?? row.shipmentDate
  const dateLabel = dateRaw ? formatShortDate(dateRaw) : 'Tarih yok'
  const statusLabel = shipmentQueueCardStatusLabel(row.shipmentStatus, {
    installationPending: row.installationPending,
    hasShipmentIssue: row.hasShipmentIssue,
  })
  const riskLabel = riskBadgeLabel(row.riskSeverity)
  const remLabel = remainingLabel(row)
  const installLabel = row.installationPending ? 'Montaj bekliyor' : null

  return (
    <article className="sops-card">
      <button type="button" className="sops-card__hit" onClick={() => onOpen?.(row)}>
        <div className="sops-card__head">
          <p className="sops-card__customer">{customer}</p>
          <time className="sops-card__date" dateTime={dateRaw ?? undefined}>
            {dateLabel}
          </time>
        </div>
        <p className="sops-card__product">{product}</p>
        <div className="sops-card__foot">
          <span className="sops-card__status">{statusLabel}</span>
          {installLabel ? <span className="sops-badge sops-badge--install">{installLabel}</span> : null}
          {remLabel ? <span className="sops-badge sops-badge--partial">{remLabel}</span> : null}
          {riskLabel ? <span className="sops-badge sops-badge--risk">{riskLabel}</span> : null}
        </div>
      </button>
    </article>
  )
}
