import { parseCurrencyInput } from '../../lib/formatCurrencyInput.js'

/** @typedef {import('./newOrderWizardModel.js').WizardProductLine} WizardProductLine */

/**
 * @param {string} raw
 */
function parseMoneyInput(raw) {
  const n = parseCurrencyInput(raw)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

/**
 * @param {WizardProductLine} line
 */
function lineTotalAmount(line) {
  const qty = Number.parseFloat(line.qty) || 0
  return Math.round(qty * parseMoneyInput(line.unitPrice))
}

/**
 * @typedef {Object} OrderTotalsBreakdown
 * @property {number} subtotal
 * @property {number} percentageDiscountAmount
 * @property {number} fixedDiscountAmount
 * @property {number} totalDiscount
 * @property {number} grandTotal
 */

/**
 * @param {WizardProductLine[]} products
 */
export function computeProductsSubtotal(products) {
  let subtotal = 0
  for (let i = 0; i < products.length; i++) {
    subtotal += lineTotalAmount(products[i])
  }
  return subtotal
}

/**
 * @param {string} [raw]
 */
export function parseDiscountPercent(raw) {
  const s = String(raw ?? '').trim().replace(',', '.')
  if (!s) return 0
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}

/**
 * @param {{
 *   products: WizardProductLine[]
 *   discountPercent?: string
 *   discountFixed?: string
 * }} input
 * @returns {OrderTotalsBreakdown}
 */
export function calculateOrderTotals(input) {
  const subtotal = computeProductsSubtotal(input.products)
  const pct = parseDiscountPercent(input.discountPercent)
  const percentageDiscountAmount = Math.round(subtotal * (pct / 100))
  const afterPercent = subtotal - percentageDiscountAmount
  const fixedRaw = parseMoneyInput(input.discountFixed ?? '')
  const fixedDiscountAmount = Math.min(Math.max(0, fixedRaw), afterPercent)
  const totalDiscount = percentageDiscountAmount + fixedDiscountAmount
  const grandTotal = Math.max(0, subtotal - totalDiscount)

  return {
    subtotal,
    percentageDiscountAmount,
    fixedDiscountAmount,
    totalDiscount,
    grandTotal,
  }
}
