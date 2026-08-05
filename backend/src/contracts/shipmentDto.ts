import type { ShipmentOperationStatus } from '../constants/shipmentStatuses.js'
import { normalizeShipmentStatusValue } from '../constants/shipmentStatuses.js'
import { optionalIsoDate } from '../lib/isoDate.js'

export type ShipmentLineDto = {
  id: string
  shipmentId: string
  orderLineId: string
  qty: string
}

export type ShipmentDto = {
  id: string
  salesOrderId: string
  status: ShipmentOperationStatus | string
  plannedShipDate: string | null
  crewName: string | null
  vehicleNote: string | null
  note: string | null
  lines: ShipmentLineDto[]
}

export function mapShipmentRow(row: {
  id: string
  salesOrderId: string
  status: string
  plannedShipDate: Date | null
  crewName: string | null
  vehicleNote: string | null
  note: string | null
  lines: {
    id: string
    shipmentId: string
    orderLineId: string
    quantity?: { toString(): string }
    qty?: { toString(): string }
  }[]
}): ShipmentDto {
  return {
    id: row.id,
    salesOrderId: row.salesOrderId,
    status: normalizeShipmentStatusValue(row.status),
    plannedShipDate: optionalIsoDate(row.plannedShipDate),
    crewName: row.crewName,
    vehicleNote: row.vehicleNote,
    note: row.note,
    lines: row.lines.map((ln) => ({
      id: ln.id,
      shipmentId: ln.shipmentId,
      orderLineId: ln.orderLineId,
      qty: Number(ln.qty?.toString() ?? ln.quantity?.toString() ?? '0').toFixed(2),
    })),
  }
}
