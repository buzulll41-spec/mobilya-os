export const SUPPLIER_LEDGER_ENTRY_TYPE = {
  GOODS_RECEIPT: 'GOODS_RECEIPT',
  PAYMENT: 'PAYMENT',
  MAIL_ORDER: 'MAIL_ORDER',
  ADJUSTMENT: 'ADJUSTMENT',
  NOTE: 'NOTE',
} as const

export type SupplierLedgerEntryType =
  (typeof SUPPLIER_LEDGER_ENTRY_TYPE)[keyof typeof SUPPLIER_LEDGER_ENTRY_TYPE]

const ALLOWED = new Set<string>(Object.values(SUPPLIER_LEDGER_ENTRY_TYPE))

export function isSupplierLedgerEntryType(value: string): value is SupplierLedgerEntryType {
  return ALLOWED.has(value)
}
