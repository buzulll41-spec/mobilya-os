import {
  SHIPMENT_OPERATION_STATUS,
  normalizeShipmentStatusValue,
} from '../../contracts/v1/shipmentStatuses.js'

/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */

/** @typedef {'planned' | 'preparing' | 'in_transit' | 'delivered' | 'installation' | 'issue'} ShipmentPipelineColumnId */

/** @type {{ id: ShipmentPipelineColumnId, label: string }[]} */
export const SHIPMENT_OPS_PIPELINE_COLUMNS = [
  { id: 'planned', label: 'Planlandı' },
  { id: 'preparing', label: 'Hazırlanıyor' },
  { id: 'in_transit', label: 'Yolda' },
  { id: 'delivered', label: 'Teslim' },
  { id: 'installation', label: 'Montaj' },
  { id: 'issue', label: 'Sorunlu' },
]

/**
 * @param {ShipmentRowVM} row
 * @returns {ShipmentPipelineColumnId | null} null = tamamlanan / listede gösterme
 */
export function resolveShipmentPipelineColumn(row) {
  if (row.hasShipmentIssue) return 'issue'

  const status = normalizeShipmentStatusValue(String(row.shipmentStatus ?? ''))

  if (status === SHIPMENT_OPERATION_STATUS.ISSUE) return 'issue'
  if (status === SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE) return null
  if (status === 'CLOSED') return null

  if (status === SHIPMENT_OPERATION_STATUS.DELIVERED) {
    return row.installationPending ? 'installation' : 'delivered'
  }
  if (status === SHIPMENT_OPERATION_STATUS.DISPATCHED) return 'in_transit'
  if (status === SHIPMENT_OPERATION_STATUS.LOADED) return 'preparing'

  if (
    status === SHIPMENT_OPERATION_STATUS.PLANNED ||
    status === 'PICKING' ||
    status === 'READY_TO_DISPATCH' ||
    status === 'ON_HOLD' ||
    !status
  ) {
    if (row.queueBucket === 'in_transit') return 'in_transit'
    if (row.queueBucket === 'delivered') {
      return row.installationPending ? 'installation' : 'delivered'
    }
    return 'planned'
  }

  if (row.queueBucket === 'in_transit' || (row.inTransitShipmentCount ?? 0) > 0) {
    return 'in_transit'
  }
  if (row.installationPending) return 'installation'
  if (row.queueBucket === 'delivered') return 'delivered'

  return 'planned'
}

/**
 * @param {ShipmentRowVM[]} rows
 */
export function groupShipmentOpsPipeline(rows) {
  /** @type {Record<ShipmentPipelineColumnId, ShipmentRowVM[]>} */
  const groups = {
    planned: [],
    preparing: [],
    in_transit: [],
    delivered: [],
    installation: [],
    issue: [],
  }

  for (const row of rows) {
    if (!row?.id) continue
    const col = resolveShipmentPipelineColumn(row)
    if (!col) continue
    groups[col].push(row)
  }

  const byDate = (/** @type {ShipmentRowVM} */ a, /** @type {ShipmentRowVM} */ b) =>
    (a.plannedShipDate ?? a.shipmentDate ?? '').localeCompare(
      b.plannedShipDate ?? b.shipmentDate ?? '',
    )

  for (const key of Object.keys(groups)) {
    groups[/** @type {ShipmentPipelineColumnId} */ (key)].sort(byDate)
  }

  return groups
}
