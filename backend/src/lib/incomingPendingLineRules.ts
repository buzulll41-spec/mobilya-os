import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../constants/supplyOrderStatus.js'

export type IncomingPendingLineSnapshot = {
  supplyStatus: string
  warehouseEntryStatus: string
  shipmentReady: boolean
  qtyOrdered: number
  qtyReceived: number
}

export function isOrderLinePendingForIncomingEntry(line: IncomingPendingLineSnapshot): boolean {
  if (line.supplyStatus !== SUPPLY_STATUS.SENT) return false
  if (line.shipmentReady) return false
  const pending = line.qtyOrdered - line.qtyReceived
  if (pending <= 0.0001) return false
  if (line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED) return false
  return true
}

export function matchesIncomingPendingSearch(
  fields: {
    customerName?: string | null
    orderNumber?: string | null
    salesOrderId?: string | null
    productTitle?: string | null
    supplierName?: string | null
  },
  q?: string,
): boolean {
  const raw = q?.trim()
  if (!raw) return true
  const tokens = raw.toLocaleLowerCase('tr-TR').split(/\s+/).filter(Boolean)
  const hay = [
    fields.customerName,
    fields.orderNumber,
    fields.salesOrderId,
    fields.productTitle,
    fields.supplierName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('tr-TR')
  return tokens.every((token) => hay.includes(token))
}
