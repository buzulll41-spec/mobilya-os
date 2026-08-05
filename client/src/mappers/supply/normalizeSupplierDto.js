/** @typedef {import('../../contracts/v1/supplier.js').SupplierListItemDto} SupplierListItemDto */
/** @typedef {import('../../contracts/v1/supplier.js').SupplierDetailDto} SupplierDetailDto */
/** @typedef {import('../../contracts/v1/supplierLedgerEntry.js').SupplierLedgerEntryDto} SupplierLedgerEntryDto */

/**
 * @param {unknown} raw
 * @returns {SupplierListItemDto}
 */
export function normalizeSupplierListItemDto(raw) {
  const r = /** @type {Record<string, unknown>} */ (raw && typeof raw === 'object' ? raw : {})
  return {
    id: String(r.id ?? ''),
    code: typeof r.code === 'string' ? r.code : r.code === null ? null : null,
    companyName: String(r.companyName ?? ''),
    contactName:
      typeof r.contactName === 'string' ? r.contactName : r.contactName === null ? null : null,
    phone: typeof r.phone === 'string' ? r.phone : r.phone === null ? null : null,
    openBalance: String(r.openBalance ?? '0.00'),
    currency: String(r.currency ?? 'TRY'),
    lastMovementAt:
      typeof r.lastMovementAt === 'string' ? r.lastMovementAt : r.lastMovementAt === null ? null : null,
    isActive: r.isActive !== false,
  }
}

/**
 * @param {unknown} raw
 * @returns {SupplierDetailDto}
 */
export function normalizeSupplierDetailDto(raw) {
  const base = normalizeSupplierListItemDto(raw)
  const r = /** @type {Record<string, unknown>} */ (raw && typeof raw === 'object' ? raw : {})
  return {
    ...base,
    iban: typeof r.iban === 'string' ? r.iban : r.iban === null ? null : null,
    taxNumber: typeof r.taxNumber === 'string' ? r.taxNumber : r.taxNumber === null ? null : null,
    taxOffice: typeof r.taxOffice === 'string' ? r.taxOffice : r.taxOffice === null ? null : null,
    address: typeof r.address === 'string' ? r.address : r.address === null ? null : null,
    createdAt: String(r.createdAt ?? ''),
    updatedAt: String(r.updatedAt ?? ''),
  }
}

/**
 * @param {unknown} raw
 * @returns {SupplierLedgerEntryDto}
 */
export function normalizeSupplierLedgerEntryDto(raw) {
  const r = /** @type {Record<string, unknown>} */ (raw && typeof raw === 'object' ? raw : {})
  return {
    id: String(r.id ?? ''),
    supplierId: String(r.supplierId ?? ''),
    entryType: String(r.entryType ?? ''),
    occurredAt: String(r.occurredAt ?? ''),
    description: String(r.description ?? ''),
    debitAmount: String(r.debitAmount ?? '0.00'),
    creditAmount: String(r.creditAmount ?? '0.00'),
    balanceAfter: String(r.balanceAfter ?? '0.00'),
    currency: String(r.currency ?? 'TRY'),
    paymentMethod:
      typeof r.paymentMethod === 'string' ? r.paymentMethod : r.paymentMethod === null ? null : null,
    documentNo: typeof r.documentNo === 'string' ? r.documentNo : r.documentNo === null ? null : null,
    paymentTransactionId:
      typeof r.paymentTransactionId === 'string'
        ? r.paymentTransactionId
        : r.paymentTransactionId === null
          ? null
          : null,
    salesOrderId:
      typeof r.salesOrderId === 'string' ? r.salesOrderId : r.salesOrderId === null ? null : null,
    customerNameSnapshot:
      typeof r.customerNameSnapshot === 'string'
        ? r.customerNameSnapshot
        : r.customerNameSnapshot === null
          ? null
          : null,
    productTitleSnapshot:
      typeof r.productTitleSnapshot === 'string'
        ? r.productTitleSnapshot
        : r.productTitleSnapshot === null
          ? null
          : null,
    source: typeof r.source === 'string' ? r.source : r.source === null ? null : null,
    status: typeof r.status === 'string' ? r.status : 'APPROVED',
    reversesEntryId:
      typeof r.reversesEntryId === 'string'
        ? r.reversesEntryId
        : r.reversesEntryId === null
          ? null
          : null,
    createdAt: String(r.createdAt ?? ''),
  }
}

/**
 * @param {SupplierListItemDto[]} items
 */
export function sortSuppliersByName(items) {
  return [...items].sort((a, b) => a.companyName.localeCompare(b.companyName, 'tr'))
}

/**
 * @param {string} openBalance
 */
export function formatSupplierOpenBalanceLabel(openBalance) {
  const n = Number.parseFloat(openBalance)
  if (!Number.isFinite(n) || n <= 0.009) {
    return 'Açık bakiye: Borç yok'
  }
  return `Açık bakiye: ${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL borç`
}

/**
 * Liste satırı — kısa bakiye metni.
 * @param {string} openBalance
 */
export function formatSupplierListBalance(openBalance) {
  const n = Number.parseFloat(openBalance)
  if (!Number.isFinite(n) || n <= 0.009) return 'Borç yok'
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL borç`
}
