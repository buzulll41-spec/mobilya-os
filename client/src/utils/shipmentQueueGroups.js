/** @typedef {import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */

/**
 * Sevk sayfası — 3 operasyon grubu.
 * @param {ShipmentRowVM[]} rows
 */
export function groupShipmentQueue(rows) {
  if (!Array.isArray(rows)) {
    return { planned: [], inTransit: [], delivered: [] }
  }

  /** @type {ShipmentRowVM[]} */
  const planned = []
  /** @type {ShipmentRowVM[]} */
  const inTransit = []
  /** @type {ShipmentRowVM[]} */
  const delivered = []

  for (const row of rows) {
    if (!row?.id) continue
    if (row.queueBucket === 'delivered') {
      delivered.push(row)
      continue
    }
    if (row.queueBucket === 'in_transit') {
      inTransit.push(row)
      continue
    }
    if (row.queueBucket === 'planned') {
      planned.push(row)
      continue
    }

    if (row.status === 'Teslim Edildi' || row.installationPending) {
      delivered.push(row)
    } else if ((row.inTransitShipmentCount ?? 0) > 0) {
      inTransit.push(row)
    } else if ((row.shipmentSummaryOpenCount ?? 0) > 0 || row.shipmentDate || row.plannedShipDate) {
      planned.push(row)
    }
  }

  const byDate = (/** @type {ShipmentRowVM} */ a, /** @type {ShipmentRowVM} */ b) =>
    (a.shipmentDate ?? a.plannedShipDate ?? '').localeCompare(
      b.shipmentDate ?? b.plannedShipDate ?? '',
    )

  return {
    planned: planned.sort(byDate),
    inTransit: inTransit.sort(byDate),
    delivered: delivered.sort(byDate),
  }
}
