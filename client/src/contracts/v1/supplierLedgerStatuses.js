/** @typedef {'PENDING' | 'APPROVED' | 'REJECTED' | 'REVERSED'} SupplierLedgerStatus */

export const SUPPLIER_LEDGER_STATUS = /** @type {const} */ ({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVERSED: 'REVERSED',
})

export const SUPPLIER_LEDGER_SOURCE = /** @type {const} */ ({
  MAIL_ORDER: 'MAIL_ORDER',
})

/** @param {string | null | undefined} status */
export function isSupplierLedgerBalanceStatus(status) {
  return (
    status === SUPPLIER_LEDGER_STATUS.APPROVED ||
    status === SUPPLIER_LEDGER_STATUS.REVERSED ||
    !status
  )
}

/** @param {string | null | undefined} status */
export function supplierLedgerStatusLabel(status) {
  switch (status) {
    case SUPPLIER_LEDGER_STATUS.PENDING:
      return 'Bekliyor'
    case SUPPLIER_LEDGER_STATUS.APPROVED:
      return 'Onaylandı'
    case SUPPLIER_LEDGER_STATUS.REJECTED:
      return 'Reddedildi'
    case SUPPLIER_LEDGER_STATUS.REVERSED:
      return 'İptal edildi'
    default:
      return 'Onaylandı'
  }
}

/**
 * @param {string} customerName
 * @param {string} orderId
 * @param {number} amount
 */
export function formatMailOrderLedgerDescription(customerName, orderId, amount) {
  const formatted = amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return `${customerName} - ${orderId} - Mail Order - ${formatted} ₺`
}
