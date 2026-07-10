import { parseQty } from '../receiving/productReadiness.js'

/**
 * @param {{ orderLineId?: string | null, salesOrderId?: string | null }[]} incoming
 */
export function buildSupplierLinkage(incoming) {
  const orderLineIds = new Set()
  const salesOrderIds = new Set()
  for (const row of incoming) {
    if (row.orderLineId) orderLineIds.add(row.orderLineId)
    if (row.salesOrderId) salesOrderIds.add(row.salesOrderId)
  }
  return { orderLineIds, salesOrderIds }
}

/**
 * @param {import('./supplierOperationsCoreTypes.js').PendingLineCore} line
 * @param {{ orderLineIds: Set<string>, salesOrderIds: Set<string> }} linkage
 * @param {string | null | undefined} supplierId
 */
export function isLineLinkedToSupplier(line, linkage, supplierId) {
  if (supplierId && line.supplierId === supplierId) return true
  if (linkage.orderLineIds.size === 0 && linkage.salesOrderIds.size === 0) return false
  return linkage.orderLineIds.has(line.orderLineId) || linkage.salesOrderIds.has(line.salesOrderId)
}

/**
 * @param {import('./supplierOperationsCoreTypes.js').PendingLineCore[]} pendingLines
 * @param {{ orderLineIds: Set<string>, salesOrderIds: Set<string> }} linkage
 * @param {string} todayIso
 * @param {string | null | undefined} [supplierId]
 */
export function filterOpenProductsForSupplier(pendingLines, linkage, todayIso, supplierId) {
  /** @type {import('../../contracts/v1/supplierOperations.js').SupplierOpenProductDto[]} */
  const openProducts = []
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

    const unitCost = line.estimatedUnitCost ?? 0
    openProducts.push({
      orderLineId: line.orderLineId,
      salesOrderId: line.salesOrderId,
      orderNumber: line.orderNumber,
      customerName: line.customerName,
      productTitle: line.productTitle,
      qtyOrdered: line.qtyOrdered.toFixed(2),
      qtyReceived: line.qtyReceived.toFixed(2),
      qtyMissing: missing.toFixed(2),
      orderDate: line.orderDate ?? null,
      dueDate: line.dueDate,
      estimatedUnitCost: unitCost.toFixed(2),
      isOverdue,
    })
  }

  /** @type {Map<string, import('../../contracts/v1/supplierOperations.js').SupplierPendingOrderDto>} */
  const orderMap = new Map()
  for (const p of openProducts) {
    let bucket = orderMap.get(p.salesOrderId)
    if (!bucket) {
      bucket = {
        salesOrderId: p.salesOrderId,
        orderNumber: p.orderNumber,
        customerName: p.customerName,
        openLineCount: 0,
        missingQtyTotal: '0.00',
        dueDate: p.dueDate,
      }
      orderMap.set(p.salesOrderId, bucket)
    }
    bucket.openLineCount += 1
    const prev = parseQty(bucket.missingQtyTotal)
    bucket.missingQtyTotal = (prev + parseQty(p.qtyMissing)).toFixed(2)
    if (p.dueDate && (!bucket.dueDate || p.dueDate < bucket.dueDate)) bucket.dueDate = p.dueDate
  }

  return {
    openProducts,
    pendingOrders: [...orderMap.values()],
    openProductCount: openProducts.length,
    pendingOrderCount: orderMap.size,
    missingQtyTotal,
    pendingQtyTotal,
    hasOverdueDelivery,
  }
}

/**
 * @param {string | null | undefined} address
 */
export function extractSupplierCity(address) {
  if (!address?.trim()) return null
  const s = address.trim()
  const first = s.includes(',') ? s.split(',')[0].trim() : s
  return first.length > 0 ? first : null
}

/**
 * @param {{ debitAmount?: string, creditAmount?: string }[]} entries
 */
export function sumLedgerTotals(entries) {
  let totalPayments = 0
  let totalPurchases = 0
  for (const e of entries) {
    totalPayments += parseQty(e.debitAmount ?? '0')
    totalPurchases += parseQty(e.creditAmount ?? '0')
  }
  return { totalPayments, totalPurchases }
}
