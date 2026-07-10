import { decimalToNumber } from './money.js'

export type PendingLineCore = {
  orderLineId: string
  salesOrderId: string
  orderNumber: string
  customerName: string
  productTitle: string
  qtyOrdered: number
  qtyReceived: number
  supplierId: string | null
  orderDate: string | null
  estimatedUnitCost: number
  dueDate: string | null
}

export type IncomingLinkCore = {
  orderLineId: string | null
  salesOrderId: string | null
}

export type SupplierLinkage = {
  orderLineIds: Set<string>
  salesOrderIds: Set<string>
}

export function buildSupplierLinkage(incoming: IncomingLinkCore[]): SupplierLinkage {
  const orderLineIds = new Set<string>()
  const salesOrderIds = new Set<string>()
  for (const row of incoming) {
    if (row.orderLineId) orderLineIds.add(row.orderLineId)
    if (row.salesOrderId) salesOrderIds.add(row.salesOrderId)
  }
  return { orderLineIds, salesOrderIds }
}

export function isLineLinkedToSupplier(
  line: PendingLineCore,
  linkage: SupplierLinkage,
  supplierId?: string | null,
): boolean {
  if (supplierId && line.supplierId === supplierId) return true
  if (linkage.orderLineIds.size === 0 && linkage.salesOrderIds.size === 0) return false
  return linkage.orderLineIds.has(line.orderLineId) || linkage.salesOrderIds.has(line.salesOrderId)
}

export function filterOpenProductsForSupplier(
  pendingLines: PendingLineCore[],
  linkage: SupplierLinkage,
  todayIso: string,
  supplierId?: string | null,
): {
  openProducts: Array<{
    orderLineId: string
    salesOrderId: string
    orderNumber: string
    customerName: string
    productTitle: string
    qtyOrdered: string
    qtyReceived: string
    qtyMissing: string
    orderDate: string | null
    dueDate: string | null
    estimatedUnitCost: string
    isOverdue: boolean
  }>
  pendingOrders: Array<{
    salesOrderId: string
    orderNumber: string
    customerName: string
    openLineCount: number
    missingQtyTotal: string
    dueDate: string | null
  }>
  openProductCount: number
  pendingOrderCount: number
  missingQtyTotal: number
  pendingQtyTotal: number
  hasOverdueDelivery: boolean
} {
  const openProducts: Array<{
    orderLineId: string
    salesOrderId: string
    orderNumber: string
    customerName: string
    productTitle: string
    qtyOrdered: string
    qtyReceived: string
    qtyMissing: string
    orderDate: string | null
    dueDate: string | null
    estimatedUnitCost: string
    isOverdue: boolean
  }> = []

  let missingQtyTotal = 0
  let pendingQtyTotal = 0
  let hasOverdueDelivery = false

  for (const line of pendingLines) {
    if (!isLineLinkedToSupplier(line, linkage, supplierId)) continue
    const missing = Math.max(0, line.qtyOrdered - line.qtyReceived)
    if (missing <= 0.0001) continue

    pendingQtyTotal += line.qtyOrdered - line.qtyReceived
    missingQtyTotal += missing

    const isOverdue =
      Boolean(line.dueDate && line.dueDate < todayIso) && line.qtyReceived < line.qtyOrdered - 0.0001
    if (isOverdue) hasOverdueDelivery = true

    openProducts.push({
      orderLineId: line.orderLineId,
      salesOrderId: line.salesOrderId,
      orderNumber: line.orderNumber,
      customerName: line.customerName,
      productTitle: line.productTitle,
      qtyOrdered: line.qtyOrdered.toFixed(2),
      qtyReceived: line.qtyReceived.toFixed(2),
      qtyMissing: missing.toFixed(2),
      orderDate: line.orderDate,
      dueDate: line.dueDate,
      estimatedUnitCost: line.estimatedUnitCost.toFixed(2),
      isOverdue,
    })
  }

  /** @type {Map<string, { salesOrderId: string, orderNumber: string, customerName: string, openLineCount: number, missingQty: number, dueDate: string | null }>} */
  const orderMap = new Map()
  for (const p of openProducts) {
    let bucket = orderMap.get(p.salesOrderId)
    if (!bucket) {
      bucket = {
        salesOrderId: p.salesOrderId,
        orderNumber: p.orderNumber,
        customerName: p.customerName,
        openLineCount: 0,
        missingQty: 0,
        dueDate: p.dueDate,
      }
      orderMap.set(p.salesOrderId, bucket)
    }
    bucket.openLineCount += 1
    bucket.missingQty += Number.parseFloat(p.qtyMissing)
    if (p.dueDate && (!bucket.dueDate || p.dueDate < bucket.dueDate)) bucket.dueDate = p.dueDate
  }

  const pendingOrders = [...orderMap.values()].map((o) => ({
    salesOrderId: o.salesOrderId,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    openLineCount: o.openLineCount,
    missingQtyTotal: o.missingQty.toFixed(2),
    dueDate: o.dueDate,
  }))

  return {
    openProducts,
    pendingOrders,
    openProductCount: openProducts.length,
    pendingOrderCount: pendingOrders.length,
    missingQtyTotal,
    pendingQtyTotal,
    hasOverdueDelivery,
  }
}

export function extractSupplierCity(address: string | null | undefined): string | null {
  if (!address?.trim()) return null
  const s = address.trim()
  const first = s.includes(',') ? s.split(',')[0].trim() : s
  return first.length > 0 ? first : null
}

export function sumLedgerTotals(
  entries: { debitAmount: unknown; creditAmount: unknown }[],
): { totalPayments: number; totalPurchases: number } {
  let totalPayments = 0
  let totalPurchases = 0
  for (const e of entries) {
    totalPayments += decimalToNumber(e.debitAmount)
    totalPurchases += decimalToNumber(e.creditAmount)
  }
  return { totalPayments, totalPurchases }
}
