import {
  IN_TRANSIT_SHIPMENT,
  OPEN_SHIPMENT_PIPELINE,
  SHIPMENT_OPERATION_STATUS,
  normalizeShipmentStatusValue,
} from '../constants/shipmentStatuses.js'

export type ShipmentStatusRow = { status: string }

export type ShipmentInstallationSummary = {
  hasShipmentIssue: boolean
  installationPending: boolean
  inTransitShipmentCount: number
}

export function deriveShipmentInstallationSummary(
  shipments: ShipmentStatusRow[],
): ShipmentInstallationSummary {
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

  return {
    hasShipmentIssue,
    installationPending,
    inTransitShipmentCount,
  }
}

export function openPipelineShipmentsFromRows(shipments: ShipmentStatusRow[]): ShipmentStatusRow[] {
  return shipments.filter((s) => OPEN_SHIPMENT_PIPELINE.has(normalizeShipmentStatusValue(s.status)))
}
