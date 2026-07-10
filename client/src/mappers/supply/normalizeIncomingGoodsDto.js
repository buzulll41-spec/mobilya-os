import { incomingGoodsPurposeLabel } from '../../contracts/v1/incomingGoodsPurpose.js'
import { computeOrderReadinessSummary } from '../receiving/productReadiness.js'

/**
 * @param {unknown} raw
 * @returns {import('../../contracts/v1/incomingGoods.js').IncomingGoodsRecordDto}
 */
export function normalizeIncomingGoodsRecordDto(raw) {
  const o = /** @type {Record<string, unknown>} */ (raw ?? {})
  const purpose = String(o.purpose ?? '')
  return {
    id: String(o.id ?? ''),
    supplierId: String(o.supplierId ?? ''),
    supplierName: String(o.supplierName ?? ''),
    receivedAt: String(o.receivedAt ?? ''),
    productTitle: String(o.productTitle ?? ''),
    productGroup: o.productGroup != null ? String(o.productGroup) : null,
    qty: String(o.qty ?? '0'),
    unitPurchasePrice: String(o.unitPurchasePrice ?? '0'),
    lineTotal: String(o.lineTotal ?? '0'),
    currency: String(o.currency ?? 'TRY'),
    purpose,
    purposeLabel: String(o.purposeLabel ?? incomingGoodsPurposeLabel(purpose)),
    orderLineId: o.orderLineId != null ? String(o.orderLineId) : null,
    salesOrderId: o.salesOrderId != null ? String(o.salesOrderId) : null,
    orderNumber: o.orderNumber != null ? String(o.orderNumber) : null,
    customerName: o.customerName != null ? String(o.customerName) : null,
    invoiceNo: o.invoiceNo != null ? String(o.invoiceNo) : null,
    documentNo: o.documentNo != null ? String(o.documentNo) : null,
    note: o.note != null ? String(o.note) : null,
    productId: o.productId != null ? String(o.productId) : null,
    createdAt: String(o.createdAt ?? ''),
  }
}

/**
 * @param {unknown} raw
 * @returns {import('../../contracts/v1/incomingGoods.js').PendingOrderLineForIncomingDto}
 */
export function normalizePendingOrderLineDto(raw) {
  const o = /** @type {Record<string, unknown>} */ (raw ?? {})
  return {
    orderLineId: String(o.orderLineId ?? ''),
    salesOrderId: String(o.salesOrderId ?? ''),
    orderNumber: String(o.orderNumber ?? o.salesOrderId ?? ''),
    customerName: String(o.customerName ?? ''),
    productTitle: String(o.productTitle ?? ''),
    qtyOrdered: String(o.qtyOrdered ?? '0'),
    qtyReceived: String(o.qtyReceived ?? '0'),
    qtyPending: String(o.qtyPending ?? '0'),
    dueDate: o.dueDate != null ? String(o.dueDate) : null,
    productId: o.productId != null ? String(o.productId) : null,
    supplierName: o.supplierName != null ? String(o.supplierName) : null,
    supplierId: o.supplierId != null ? String(o.supplierId) : null,
    defaultSupplierId: o.defaultSupplierId != null ? String(o.defaultSupplierId) : null,
  }
}

/**
 * @param {unknown} raw
 * @returns {import('../../contracts/v1/incomingGoods.js').OrderLineReceivingDto}
 */
function normalizeReadinessStatus(raw) {
  const s = String(raw ?? '')
  if (s === 'waiting' || s === 'partial' || s === 'ready' || s === 'missing') return s
  return 'waiting'
}

function normalizeReadinessTone(raw) {
  const t = String(raw ?? '')
  if (t === 'ok' || t === 'caution' || t === 'warn' || t === 'danger') return t
  return 'warn'
}

export function normalizeOrderLineReceivingDto(raw) {
  const o = /** @type {Record<string, unknown>} */ (raw ?? {})
  const readinessStatus = normalizeReadinessStatus(o.readinessStatus ?? o.badge)
  const readinessLabel = String(o.readinessLabel ?? o.badgeLabel ?? '')
  return {
    orderLineId: String(o.orderLineId ?? ''),
    title: String(o.title ?? ''),
    qtyOrdered: String(o.qtyOrdered ?? '0'),
    qtyReceived: String(o.qtyReceived ?? '0'),
    qtyPending: String(o.qtyPending ?? '0'),
    readinessStatus,
    readinessLabel,
    readinessTone: normalizeReadinessTone(o.readinessTone),
    badge: readinessStatus,
    badgeLabel: String(o.badgeLabel ?? readinessLabel),
    productId: o.productId != null ? String(o.productId) : null,
    defaultSupplierId: o.defaultSupplierId != null ? String(o.defaultSupplierId) : null,
    suggestedPurchasePrice:
      o.suggestedPurchasePrice != null ? String(o.suggestedPurchasePrice) : null,
  }
}

/**
 * @param {unknown} raw
 * @returns {import('../../contracts/v1/incomingGoods.js').OrderReadinessSummaryDto}
 */
export function normalizeOrderReadinessSummaryDto(raw) {
  const o = /** @type {Record<string, unknown>} */ (raw ?? {})
  const detailLines = Array.isArray(o.detailLines)
    ? o.detailLines.map((x) => String(x))
    : []
  return {
    readyCount: Number(o.readyCount ?? 0),
    partialCount: Number(o.partialCount ?? 0),
    waitingCount: Number(o.waitingCount ?? 0),
    missingCount: Number(o.missingCount ?? 0),
    totalLines: Number(o.totalLines ?? 0),
    allReady: Boolean(o.allReady),
    orderReadyToShip: Boolean(o.orderReadyToShip),
    headline: String(o.headline ?? ''),
    detailLines,
    orderBadgeLabel: o.orderBadgeLabel != null ? String(o.orderBadgeLabel) : null,
  }
}

/**
 * @param {unknown} raw
 * @returns {import('../../contracts/v1/incomingGoods.js').OrderLineReceivingResponse}
 */
export function normalizeOrderLineReceivingResponse(raw) {
  if (Array.isArray(raw)) {
    const lines = raw.map((row) => normalizeOrderLineReceivingDto(row))
    const summary = computeOrderReadinessSummary(lines)
    return {
      lines,
      summary: {
        ...summary,
        orderBadgeLabel: summary.orderReadyToShip ? 'Sevke hazır' : null,
      },
    }
  }
  const o = /** @type {Record<string, unknown>} */ (raw ?? {})
  const lines = Array.isArray(o.lines) ? o.lines.map((row) => normalizeOrderLineReceivingDto(row)) : []
  const summary = o.summary
    ? normalizeOrderReadinessSummaryDto(o.summary)
    : normalizeOrderReadinessSummaryDto({})
  return { lines, summary }
}

/**
 * @param {unknown} raw
 * @returns {import('../../contracts/v1/incomingGoods.js').IncomingGoodsKpisDto}
 */
export function normalizeIncomingGoodsKpisDto(raw) {
  const o = /** @type {Record<string, unknown>} */ (raw ?? {})
  return {
    todayCount: Number(o.todayCount ?? 0),
    customerOrderCount: Number(o.customerOrderCount ?? 0),
    stockCount: Number(o.stockCount ?? 0),
    displayCount: Number(o.displayCount ?? 0),
    totalSupplierDebt: String(o.totalSupplierDebt ?? '0'),
    currency: String(o.currency ?? 'TRY'),
  }
}
