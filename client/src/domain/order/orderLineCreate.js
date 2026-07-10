import { parseLineConfiguration } from '../../constants/productConfigurationSchema.js'
import { computeLineTotal } from '../commerce/commerceFinance.js'

/**
 * Sipariş satırı oluşturma — wizard / mock / API ile aynı kurallar.
 */

/**
 * @typedef {Object} CreateOrderLineInput
 * @property {string} title
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {string} [productGroup]
 * @property {string} [lineNote] Kumaş / renk / ölçü notu (legacy)
 * @property {Record<string, string>} [configuration] Üretim konfigürasyonu
 * @property {string} [productId] Ürün kartı referansı
 * @property {number} [lineTotal]
 * @property {string} [supplierId]
 * @property {string} [supplierNameSnapshot]
 * @property {number} sortOrder
 */

/**
 * @param {number} n
 */
export function roundMoney(n) {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

/**
 * @param {Pick<CreateOrderLineInput, 'quantity' | 'unitPrice'>} line
 */
export function lineExtendedTotal(line) {
  return roundMoney(line.quantity * roundMoney(line.unitPrice))
}

/**
 * @param {Pick<CreateOrderLineInput, 'title' | 'quantity'>[]} lines
 */
export function formatProductSummaryFromLines(lines) {
  const valid = lines.filter((l) => l.title.trim())
  if (valid.length === 0) return ''
  if (valid.length === 1) {
    const p = valid[0]
    const qty = p.quantity
    return qty > 1 ? `${p.title.trim()} (${qty} adet)` : p.title.trim()
  }
  return valid
    .map((p) => `${p.title.trim()} × ${p.quantity}`).join(' · ')
}

/**
 * @param {CreateOrderLineInput[]} lines
 */
export function computeTotalFromLines(lines) {
  return roundMoney(lines.reduce((sum, ln) => sum + lineExtendedTotal(ln), 0))
}

/**
 * @param {CreateOrderLineInput[]} lines
 */
export function sortLinesByOrder(lines) {
  return [...lines].sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * @param {string} orderId
 * @param {number} count
 */
export function buildOrderLineIds(orderId, count) {
  return Array.from({ length: count }, (_, i) => `OL-${orderId}-${i + 1}`)
}

/**
 * @param {unknown} raw
 * @returns {CreateOrderLineInput | null}
 */
export function parseCreateOrderLine(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const quantity = typeof o.quantity === 'number' ? o.quantity : Number.NaN
  const unitPrice = typeof o.unitPrice === 'number' ? o.unitPrice : Number.NaN
  const sortOrder = typeof o.sortOrder === 'number' && Number.isInteger(o.sortOrder) ? o.sortOrder : 0
  const productGroup = typeof o.productGroup === 'string' ? o.productGroup.trim() : undefined
  const productId = typeof o.productId === 'string' && o.productId.trim() ? o.productId.trim() : undefined
  const lineNote = typeof o.lineNote === 'string' && o.lineNote.trim() ? o.lineNote.trim() : undefined
  let configuration = parseLineConfiguration(o.configuration)
  if (!configuration && lineNote) configuration = { note: lineNote }
  if ((!title && !productId) || !Number.isFinite(quantity) || quantity <= 0) return null
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return null
  const unit = roundMoney(unitPrice)
  const lineTotal = computeLineTotal(quantity, unit)
  if (lineTotal <= 0) return null
  const supplierId = typeof o.supplierId === 'string' && o.supplierId.trim() ? o.supplierId.trim() : undefined
  const supplierNameSnapshot =
    typeof o.supplierNameSnapshot === 'string' && o.supplierNameSnapshot.trim()
      ? o.supplierNameSnapshot.trim()
      : undefined
  return {
    title,
    quantity,
    unitPrice: unit,
    lineTotal,
    sortOrder,
    ...(productGroup ? { productGroup } : {}),
    ...(productId ? { productId } : {}),
    ...(lineNote ? { lineNote } : {}),
    ...(configuration ? { configuration } : {}),
    ...(supplierId ? { supplierId } : {}),
    ...(supplierNameSnapshot ? { supplierNameSnapshot } : {}),
  }
}
