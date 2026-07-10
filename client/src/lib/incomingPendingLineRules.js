import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../constants/supplyOrderStatus.js'
import { computeReceivePendingQty } from '../mappers/receiving/orderLineReceiveAction.js'

/**
 * @typedef {Object} IncomingPendingLineSnapshot
 * @property {string} supplyStatus
 * @property {string} warehouseEntryStatus
 * @property {boolean} shipmentReady
 * @property {number | string} qtyOrdered
 * @property {number | string} qtyReceived
 */

/**
 * Tedarik & Gelen Ürün — bekleyen kalem listesi filtresi.
 * @param {IncomingPendingLineSnapshot} line
 */
export function isOrderLinePendingForIncomingEntry(line) {
  if (line.supplyStatus !== SUPPLY_STATUS.SENT) return false
  if (line.shipmentReady) return false
  const pending = computeReceivePendingQty(line.qtyOrdered, line.qtyReceived)
  if (pending <= 0.0001) return false
  if (line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED) return false
  return true
}

/**
 * @param {{
 *   customerName?: string | null
 *   orderNumber?: string | null
 *   salesOrderId?: string | null
 *   productTitle?: string | null
 *   supplierName?: string | null
 * }} fields
 * @param {string | undefined} q
 */
export function matchesIncomingPendingSearch(fields, q) {
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
