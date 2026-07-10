/** @typedef {import('../../contracts/v1/supplierLedgerEntry.js').SupplierLedgerEntryDto} SupplierLedgerEntryDto */
import { isSupplierLedgerBalanceStatus } from '../../contracts/v1/supplierLedgerStatuses.js'

/**
 * @param {SupplierLedgerEntryDto[]} entries
 */
export function computeOpenBalanceFromLedger(entries) {
  let credit = 0
  let debit = 0
  for (const e of entries) {
    if (!isSupplierLedgerBalanceStatus(e.status)) continue
    credit += Number.parseFloat(e.creditAmount) || 0
    debit += Number.parseFloat(e.debitAmount) || 0
  }
  return Math.max(0, credit - debit)
}
/**
 * @param {number} n
 */
export function formatLedgerMoney(n) {
  return n.toFixed(2)
}
