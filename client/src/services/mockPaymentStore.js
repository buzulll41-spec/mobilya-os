import { INITIAL_PAYMENT_TRANSACTIONS } from '../data/mock/paymentFixtures.js'
import { PAYMENT_TRANSACTION_STATUS } from '../contracts/v1/enums.js'

/** @typedef {import('../contracts/v1/payment.js').PaymentTransactionDto} PaymentTransactionDto */

function cloneTxs(/** @type {PaymentTransactionDto[]} */ rows) {
  return rows.map((t) => ({ ...t, amount: { ...t.amount } }))
}

/** @type {PaymentTransactionDto[]} */
let memoryPaymentTransactions = cloneTxs(INITIAL_PAYMENT_TRANSACTIONS)

export function resetMockPaymentStore() {
  memoryPaymentTransactions = cloneTxs(INITIAL_PAYMENT_TRANSACTIONS)
}

/**
 * @param {string} salesOrderId
 * @returns {PaymentTransactionDto[]}
 */
export function getPaymentTransactionsForSalesOrder(salesOrderId) {
  return memoryPaymentTransactions.filter((t) => t.salesOrderId === salesOrderId)
}

/**
 * @param {PaymentTransactionDto} tx
 */
export function appendPaymentTransaction(tx) {
  memoryPaymentTransactions = [...memoryPaymentTransactions, { ...tx, amount: { ...tx.amount } }]
}

/**
 * @param {string} id
 * @param {Partial<PaymentTransactionDto>} patch
 */
export function updatePaymentTransaction(id, patch) {
  memoryPaymentTransactions = memoryPaymentTransactions.map((t) =>
    t.id === id ? { ...t, ...patch, amount: patch.amount ? { ...patch.amount } : t.amount } : t,
  )
}

/** @returns {number} */
export function countPendingApprovalPayments() {
  return memoryPaymentTransactions.filter(
    (t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL,
  ).length
}

/** @returns {number} */
export function sumPendingApprovalPaymentAmount() {
  return memoryPaymentTransactions
    .filter((t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL)
    .reduce((sum, t) => sum + Number.parseFloat(t.amount.amount), 0)
}

/** @returns {PaymentTransactionDto[]} */
export function getPendingApprovalPayments() {
  return memoryPaymentTransactions.filter(
    (t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL,
  )
}

/** @returns {number} */
export function countPendingMailOrderApprovals() {
  return memoryPaymentTransactions.filter(
    (t) =>
      t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL &&
      t.kind === 'MAIL_ORDER',
  ).length
}

/** @returns {PaymentTransactionDto[]} */
export function getAllPaymentsSnapshot() {
  return cloneTxs(memoryPaymentTransactions)
}

/** @param {PaymentTransactionDto[]} rows */
export function hydratePaymentStore(rows) {
  memoryPaymentTransactions = cloneTxs(rows)
}
