export const SUPPLIER_LEDGER_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVERSED: 'REVERSED',
} as const

export type SupplierLedgerStatus =
  (typeof SUPPLIER_LEDGER_STATUS)[keyof typeof SUPPLIER_LEDGER_STATUS]

export const SUPPLIER_LEDGER_SOURCE = {
  MAIL_ORDER: 'MAIL_ORDER',
} as const

export function isSupplierLedgerBalanceStatus(status: string | null | undefined): boolean {
  return (
    status === SUPPLIER_LEDGER_STATUS.APPROVED ||
    status === SUPPLIER_LEDGER_STATUS.REVERSED ||
    status == null ||
    status === ''
  )
}
