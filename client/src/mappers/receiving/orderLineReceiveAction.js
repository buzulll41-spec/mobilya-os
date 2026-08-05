import { parseQty, PRODUCT_READINESS_STATUS } from './productReadiness.js'

/** @typedef {'receive' | 'add' | 'done'} LineReceiveActionVariant */

export const RECEIVE_ALREADY_COMPLETE_MESSAGE =
  'Bu ürünün tamamı daha önce depoya alınmıştır.'

/**
 * @param {string | number | undefined} qtyOrdered
 * @param {string | number | undefined} qtyReceived
 */
export function computeReceivePendingQty(qtyOrdered, qtyReceived) {
  return Math.max(0, parseQty(qtyOrdered) - parseQty(qtyReceived))
}

/**
 * @param {string | number | undefined} qtyOrdered
 * @param {string | number | undefined} qtyReceived
 */
export function isReceivePendingExhausted(qtyOrdered, qtyReceived) {
  return computeReceivePendingQty(qtyOrdered, qtyReceived) <= 0.0001
}

/**
 * @typedef {Object} LineReceiveAction
 * @property {string} label
 * @property {boolean} disabled
 * @property {LineReceiveActionVariant} variant
 */

/**
 * @param {import('../../contracts/v1/incomingGoods.js').OrderLineReceivingDto} line
 * @param {{ supplySent?: boolean }} [options]
 * @returns {LineReceiveAction}
 */
export function getLineReceiveAction(line, options = {}) {
  const { supplySent = true } = options
  if (!supplySent) {
    return { label: 'Tedarik bekleniyor', disabled: true, variant: 'done' }
  }
  const pending = parseQty(line.qtyPending)
  if (pending <= 0.0001) {
    return { label: 'Tamamlandı', disabled: true, variant: 'done' }
  }
  if (line.readinessStatus === PRODUCT_READINESS_STATUS.PARTIAL) {
    return { label: 'Gelen ekle', disabled: false, variant: 'add' }
  }
  return { label: 'Depoya geldi işaretle', disabled: false, variant: 'receive' }
}

/**
 * @param {{
 *   supplierId?: string
 *   qty: number
 *   maxPending: number
 *   unitPurchasePrice?: number
 * }} input
 * @returns {string | null}
 */
export function validateQuickLineReceive({ supplierId, qty, maxPending, unitPurchasePrice }) {
  if (maxPending <= 0.0001) {
    return RECEIVE_ALREADY_COMPLETE_MESSAGE
  }
  if (!supplierId?.trim()) {
    return 'Tedarikçi seçilmeden ürün girişi yapılamaz.'
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    return "Gelen adet 0'dan büyük olmalıdır."
  }
  if (qty > maxPending + 0.0001) {
    const cap = Number.isInteger(maxPending) ? String(maxPending) : maxPending.toFixed(2)
    return `Gelen adet bekleyen miktarı (${cap}) aşamaz.`
  }
  const price = unitPurchasePrice ?? 0
  if (!Number.isFinite(price) || price < 0) {
    return 'Alış fiyatı geçersiz.'
  }
  return null
}
