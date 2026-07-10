import { optionalIsoDate } from '../lib/isoDate.js'
import { normalizeShipmentStatusValue } from '../constants/shipmentStatuses.js'
import {
  IN_TRANSIT_SHIPMENT,
  OPEN_SHIPMENT_PIPELINE,
  SHIPMENT_OPERATION_STATUS,
} from '../constants/shipmentStatuses.js'

export type ShipmentQueueItemDto = {
  shipmentId: string
  salesOrderId: string
  plannedShipDate: string | null
  shipmentStatus: string
  crewName: string | null
  customerDisplayName: string
  lineSummaryTitle: string
  displayStatus: string
  customerPhone: string | null
  installationPending: boolean
  hasShipmentIssue: boolean
  inTransit: boolean
  queueBucket: 'planned' | 'in_transit' | 'delivered'
}

export function queueBucketForShipment(
  shipmentStatus: string,
  orderDisplayStatus: string,
  installationPending: boolean,
): ShipmentQueueItemDto['queueBucket'] {
  const st = normalizeShipmentStatusValue(shipmentStatus)
  if (
    st === SHIPMENT_OPERATION_STATUS.DELIVERED ||
    st === SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE ||
    orderDisplayStatus === 'Teslim Edildi' ||
    installationPending
  ) {
    return 'delivered'
  }
  if (IN_TRANSIT_SHIPMENT.has(st)) return 'in_transit'
  if (OPEN_SHIPMENT_PIPELINE.has(st)) return 'planned'
  return 'planned'
}

export function mapShipmentQueueRow(row: {
  id: string
  salesOrderId: string
  status: string
  plannedShipDate: Date | null
  crewName: string | null
  salesOrder: {
    displayStatus: string
    customerName: string
    customerPhone: string | null
    productSummary: string
  }
  installationPending?: boolean
  hasShipmentIssue?: boolean
}): ShipmentQueueItemDto {
  const shipmentStatus = normalizeShipmentStatusValue(row.status)
  const installationPending = Boolean(row.installationPending)
  return {
    shipmentId: row.id,
    salesOrderId: row.salesOrderId,
    plannedShipDate: optionalIsoDate(row.plannedShipDate),
    shipmentStatus,
    crewName: row.crewName,
    customerDisplayName: row.salesOrder.customerName,
    lineSummaryTitle: row.salesOrder.productSummary,
    displayStatus: row.salesOrder.displayStatus,
    customerPhone: row.salesOrder.customerPhone,
    installationPending,
    hasShipmentIssue: Boolean(row.hasShipmentIssue),
    inTransit: IN_TRANSIT_SHIPMENT.has(shipmentStatus),
    queueBucket: queueBucketForShipment(
      shipmentStatus,
      row.salesOrder.displayStatus,
      installationPending,
    ),
  }
}
