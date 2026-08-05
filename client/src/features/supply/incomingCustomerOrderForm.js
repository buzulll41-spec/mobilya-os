import { INCOMING_GOODS_PURPOSE } from '../../contracts/v1/incomingGoodsPurpose.js'

export const PENDING_CUSTOMER_ORDER_EMPTY_MESSAGE =
  'Bekleyen müşteri siparişi bulunamadı. Tedarik verilmiş ve depo bekleyen ürünleri kontrol edin.'

export const SUPPLIER_LOCKED_HINT =
  'Tedarikçi sipariş kaydından otomatik alınmıştır.'

/**
 * @param {string} purpose
 */
export function isSupplierEditableForIncomingPurpose(purpose) {
  return (
    purpose === INCOMING_GOODS_PURPOSE.STOCK || purpose === INCOMING_GOODS_PURPOSE.DISPLAY
  )
}

/**
 * Müşteri siparişi + bekleyen kalem seçiliyken tedarikçi kilitlenir.
 * @param {string} purpose
 * @param {import('../../contracts/v1/incomingGoods.js').PendingOrderLineForIncomingDto | null | undefined} selectedLine
 */
export function isSupplierLockedForIncomingForm(purpose, selectedLine) {
  return purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER && Boolean(selectedLine)
}

/**
 * @param {import('../../contracts/v1/incomingGoods.js').PendingOrderLineForIncomingDto} row
 * @param {import('../../contracts/v1/supplier.js').SupplierListItemDto[]} suppliers
 */
export function resolveSupplierIdForPendingLine(row, suppliers) {
  if (row.supplierId && suppliers.some((s) => s.id === row.supplierId)) {
    return row.supplierId
  }
  if (row.defaultSupplierId && suppliers.some((s) => s.id === row.defaultSupplierId)) {
    return row.defaultSupplierId
  }
  return ''
}

/**
 * @param {import('../../contracts/v1/incomingGoods.js').PendingOrderLineForIncomingDto} row
 * @param {import('../../contracts/v1/supplier.js').SupplierListItemDto[]} suppliers
 */
export function resolveSupplierNameForPendingLine(row, suppliers) {
  if (row.supplierName?.trim()) return row.supplierName.trim()
  const id = resolveSupplierIdForPendingLine(row, suppliers)
  if (!id) return ''
  return suppliers.find((s) => s.id === id)?.companyName ?? ''
}

/**
 * @param {import('../../contracts/v1/incomingGoods.js').PendingOrderLineForIncomingDto | null | undefined} row
 * @param {import('../../contracts/v1/supplier.js').SupplierListItemDto[]} suppliers
 */
export function resolveIncomingFormSupplier(row, purpose, suppliers, manualSupplierId) {
  if (isSupplierLockedForIncomingForm(purpose, row) && row) {
    return resolveSupplierIdForPendingLine(row, suppliers)
  }
  return manualSupplierId
}

/**
 * @param {import('../../contracts/v1/incomingGoods.js').PendingOrderLineForIncomingDto} row
 */
export function pendingQtyFromLine(row) {
  const pending = Number.parseFloat(String(row.qtyPending).replace(',', '.'))
  return Number.isFinite(pending) && pending > 0 ? pending : null
}
