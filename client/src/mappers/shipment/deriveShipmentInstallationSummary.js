import {
  IN_TRANSIT_SHIPMENT,
  SHIPMENT_OPERATION_STATUS,
  normalizeShipmentStatusValue,
} from '../../contracts/v1/shipmentStatuses.js'

/**
 * @param {{ status: string }[]} shipments
 * @returns {{ hasShipmentIssue: boolean, installationPending: boolean, inTransitShipmentCount: number }}
 */
export function deriveShipmentInstallationSummary(shipments) {
  let hasShipmentIssue = false
  let hasDelivered = false
  let hasInstallationDone = false
  let inTransitShipmentCount = 0

  for (const sh of shipments) {
    const status = normalizeShipmentStatusValue(sh.status)
    if (status === SHIPMENT_OPERATION_STATUS.ISSUE) hasShipmentIssue = true
    if (status === SHIPMENT_OPERATION_STATUS.DELIVERED) hasDelivered = true
    if (status === SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE) hasInstallationDone = true
    if (IN_TRANSIT_SHIPMENT.has(status)) inTransitShipmentCount += 1
  }

  const installationPending = hasDelivered && !hasInstallationDone && !hasShipmentIssue

  return { hasShipmentIssue, installationPending, inTransitShipmentCount }
}
