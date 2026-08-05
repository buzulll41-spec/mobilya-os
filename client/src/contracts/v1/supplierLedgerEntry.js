/**
 * @typedef {import('./supplierLedgerEntryTypes.js').SupplierLedgerEntryType} SupplierLedgerEntryType
 *
 * @typedef {Object} SupplierLedgerEntryDto
 * @property {string} id
 * @property {string} supplierId
 * @property {SupplierLedgerEntryType | string} entryType
 * @property {string} occurredAt
 * @property {string} description
 * @property {string} debitAmount
 * @property {string} creditAmount
 * @property {string} balanceAfter
 * @property {string} currency
 * @property {string | null} paymentMethod
 * @property {string | null} documentNo
 * @property {string | null} [paymentTransactionId]
 * @property {string | null} [salesOrderId]
 * @property {string | null} [customerNameSnapshot]
 * @property {string | null} [productTitleSnapshot]
 * @property {string | null} [dueAt]
 * @property {string | null} [source]
 * @property {string} [status]
 * @property {string | null} [reversesEntryId]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} PostSupplierPaymentRequest
 * @property {number} amount
 * @property {string} method
 * @property {string} [occurredAt]
 * @property {string} [description]
 * @property {string} [documentNo]
 */

/**
 * @typedef {Object} PostSupplierPaymentResult
 * @property {SupplierLedgerEntryDto} entry
 * @property {import('./supplier.js').SupplierDetailDto} supplier
 */

export {}
