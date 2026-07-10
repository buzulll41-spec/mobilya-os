import {
  computeLineTotal,
  computeSubtotalFromLineTotals,
  resolveCommerceTotals,
  roundMoney,
} from '../commerce/commerceFinance.js'
import {
  computeTotalFromLines,
  formatProductSummaryFromLines,
  parseCreateOrderLine,
  sortLinesByOrder,
} from './orderLineCreate.js'

/** @typedef {import('../../contracts/v1/createOrderRequest.js').CreateOrderRequest} CreateOrderRequest */
/** @typedef {import('./orderLineCreate.js').CreateOrderLineInput} CreateOrderLineInput */

/**
 * @typedef {Object} NormalizedCreateOrderRequest
 * @property {string} customerName
 * @property {string} productTitle
 * @property {number} subtotalAmount
 * @property {number} discountAmount
 * @property {string} discountType
 * @property {number | null} discountPercent
 * @property {number | null} discountFixedAmount
 * @property {string | null} discountNote
 * @property {number} totalAmount
 * @property {number} paidAmount
 * @property {number} remainingAmount
 * @property {boolean} isFullyPaid
 * @property {import('../../data/constants.js').OrderStatus} status
 * @property {CreateOrderLineInput[]} lines
 */

/**
 * @param {CreateOrderLineInput[]} lines
 * @returns {CreateOrderLineInput[]}
 */
function ensureLineTotals(lines) {
  return lines.map((ln) => ({
    ...ln,
    lineTotal:
      typeof ln.lineTotal === 'number' && Number.isFinite(ln.lineTotal)
        ? roundMoney(ln.lineTotal)
        : computeLineTotal(ln.quantity, ln.unitPrice),
  }))
}

/**
 * @param {CreateOrderRequest} body
 * @returns {NormalizedCreateOrderRequest}
 */
export function normalizeCreateOrderRequest(body) {
  const customerName = body.customerName.trim()
  const paidAmount = body.paidAmount
  const status = body.status

  /** @type {CreateOrderLineInput[]} */
  let lines

  if (Array.isArray(body.lines) && body.lines.length > 0) {
    lines = body.lines
      .map((raw, i) => parseCreateOrderLine({ ...raw, sortOrder: raw.sortOrder ?? i }))
      .filter((l) => l != null)
    if (lines.length === 0) {
      throw new Error('Geçersiz sipariş satırları')
    }
    lines = sortLinesByOrder(ensureLineTotals(lines))
  } else {
    const productTitle = typeof body.productTitle === 'string' ? body.productTitle.trim() : ''
    const totalAmount = typeof body.totalAmount === 'number' ? body.totalAmount : Number.NaN
    if (!productTitle || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error('Ürün ve toplam tutar zorunludur')
    }
    const unit = roundMoney(totalAmount)
    lines = [
      {
        title: productTitle,
        quantity: 1,
        unitPrice: unit,
        lineTotal: unit,
        sortOrder: 0,
      },
    ]
  }

  const lineSubtotal = computeSubtotalFromLineTotals(lines.map((l) => l.lineTotal))
  const commerce = resolveCommerceTotals({
    subtotalAmount:
      typeof body.subtotalAmount === 'number' && Number.isFinite(body.subtotalAmount)
        ? body.subtotalAmount
        : lineSubtotal,
    paidAmount,
    totalAmount: body.totalAmount,
    discountType: body.discountType,
    discountPercent: body.discountPercent,
    discountFixedAmount: body.discountFixedAmount,
    discountAmount: body.discountAmount,
    discountNote: body.discountNote,
  })

  const productTitle = formatProductSummaryFromLines(lines)

  return {
    customerName,
    productTitle,
    subtotalAmount: commerce.subtotalAmount,
    discountAmount: commerce.discountAmount,
    discountType: commerce.discountType,
    discountPercent: commerce.discountPercent,
    discountFixedAmount: commerce.discountFixedAmount,
    discountNote: commerce.discountNote,
    totalAmount: commerce.totalAmount,
    paidAmount: commerce.paidAmount,
    remainingAmount: commerce.remainingAmount,
    isFullyPaid: commerce.isFullyPaid,
    status,
    lines,
  }
}

/**
 * @param {import('../../data/seedOrders.js').Order} draft
 * @returns {NormalizedCreateOrderRequest}
 */
export function normalizeLegacyOrderDraft(draft) {
  const paidAmount = draft.paid ? draft.amount : (draft.paidAmount ?? 0)
  const subtotal = typeof draft.subtotalAmount === 'number' ? draft.subtotalAmount : draft.amount
  const discount = typeof draft.discountAmount === 'number' ? draft.discountAmount : 0
  const total = typeof draft.totalAmount === 'number' ? draft.totalAmount : draft.amount
  return normalizeCreateOrderRequest({
    customerName: draft.customer,
    productTitle: draft.product,
    subtotalAmount: subtotal,
    discountAmount: discount,
    totalAmount: total,
    paidAmount,
    status: draft.status,
    lines: [
      {
        title: draft.product,
        quantity: 1,
        unitPrice: total,
        lineTotal: total,
        sortOrder: 0,
      },
    ],
  })
}

/**
 * @param {CreateOrderRequest | import('../../data/seedOrders.js').Order} draft
 * @returns {NormalizedCreateOrderRequest}
 */
export function normalizeCreateOrderInput(draft) {
  if (draft && typeof draft === 'object' && 'customerName' in draft) {
    return normalizeCreateOrderRequest(/** @type {CreateOrderRequest} */ (draft))
  }
  return normalizeLegacyOrderDraft(/** @type {import('../../data/seedOrders.js').Order} */ (draft))
}
