/**
 * @typedef {import('./money.js').Money} Money
 * @typedef {import('./enums.js').PaymentTransactionKind} PaymentTransactionKind
 * @typedef {import('./enums.js').PaymentTransactionStatus} PaymentTransactionStatus
 * @typedef {import('./enums.js').PaymentMethod} PaymentMethod
 *
 * @typedef {Object} PaymentTransactionDto
 * @property {string} id
 * @property {string} salesOrderId
 * @property {string | null} invoiceId
 * @property {Money} amount Tutar (yön `kind` ile)
 * @property {PaymentTransactionKind} kind
 * @property {PaymentMethod} method
 * @property {PaymentTransactionStatus} status
 * @property {string} occurredAt ISO-8601 instant
 * @property {string} idempotencyKey
 * @property {string | null} [externalRef]
 * @property {string | null} [mailOrderSupplierId]
 * @property {string | null} [mailOrderSupplierName]
 */

export {}
