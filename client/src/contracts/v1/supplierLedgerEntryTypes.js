/** @typedef {'GOODS_RECEIPT' | 'PAYMENT' | 'MAIL_ORDER' | 'ADJUSTMENT' | 'NOTE'} SupplierLedgerEntryType */

export const SUPPLIER_LEDGER_ENTRY_TYPE = /** @type {const} */ ({
  GOODS_RECEIPT: 'GOODS_RECEIPT',
  PAYMENT: 'PAYMENT',
  MAIL_ORDER: 'MAIL_ORDER',
  ADJUSTMENT: 'ADJUSTMENT',
  NOTE: 'NOTE',
})

/** @param {string} value */
export function supplierLedgerEntryTypeDisplayCode(value) {
  switch (value) {
    case SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT:
      return 'PURCHASE'
    case SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT:
      return 'PAYMENT'
    case SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER:
      return 'MAIL_ORDER'
    case SUPPLIER_LEDGER_ENTRY_TYPE.ADJUSTMENT:
      return 'ADJUSTMENT'
    case SUPPLIER_LEDGER_ENTRY_TYPE.NOTE:
      return 'NOTE'
    default:
      return value
  }
}

/** @param {string} value */
export function supplierLedgerEntryTypeLabel(value) {
  switch (value) {
    case SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT:
      return 'Ürün alımı'
    case SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT:
      return 'Tedarikçiye yapılan havale'
    case SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER:
      return 'Tedarikçiye direkt ödeme'
    case SUPPLIER_LEDGER_ENTRY_TYPE.ADJUSTMENT:
      return 'Muhasebe düzeltmesi'
    case SUPPLIER_LEDGER_ENTRY_TYPE.NOTE:
      return 'Not'
    default:
      return value
  }
}
