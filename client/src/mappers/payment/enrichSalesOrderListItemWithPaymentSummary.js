import {
  PAYMENT_TRANSACTION_KIND,
  PAYMENT_TRANSACTION_STATUS,
} from '../../contracts/v1/enums.js'
import { moneyToNumber, numberToMoney } from '../moneyHelpers.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/payment.js').PaymentTransactionDto} PaymentTransactionDto */

/**
 * POSTED ledger tutarı (CAPTURE +, REFUND -, ADJUSTMENT işareti amount ile).
 * @param {PaymentTransactionDto[]} transactions
 */
function ledgerPostedTotal(transactions) {
  let sum = 0
  for (const tx of transactions) {
    if (tx.status !== PAYMENT_TRANSACTION_STATUS.POSTED) continue
    const v = moneyToNumber(tx.amount)
    if (tx.kind === PAYMENT_TRANSACTION_KIND.CAPTURE) sum += v
    else if (tx.kind === PAYMENT_TRANSACTION_KIND.MAIL_ORDER) sum += v
    else if (tx.kind === PAYMENT_TRANSACTION_KIND.REFUND) sum -= v
    else if (tx.kind === PAYMENT_TRANSACTION_KIND.ADJUSTMENT) sum += v
    else if (tx.kind === PAYMENT_TRANSACTION_KIND.CHARGEBACK) sum -= v
  }
  return Math.max(0, sum)
}

/**
 * @param {PaymentTransactionDto[]} transactions
 */
function lastPostedCaptureAt(transactions) {
  /** @type {string[]} */
  const times = []
  for (const tx of transactions) {
    if (tx.status !== PAYMENT_TRANSACTION_STATUS.POSTED) continue
    if (tx.kind !== PAYMENT_TRANSACTION_KIND.CAPTURE) continue
    times.push(tx.occurredAt)
  }
  if (!times.length) return null
  return times.sort().at(-1) ?? null
}

/**
 * @param {Order} order
 * @param {string} todayIso
 */
function terminOverdue(order, todayIso) {
  if (order.status === 'Teslim Edildi') return false
  if (!order.dueDate) return false
  return order.dueDate < todayIso
}

/**
 * @param {SalesOrderListItemDto} dto
 * @param {Order} order
 * @param {PaymentTransactionDto[]} transactions
 * @param {string} todayIso
 * @returns {SalesOrderListItemDto}
 */
export function enrichSalesOrderListItemWithPaymentSummary(dto, order, transactions, todayIso) {
  const currency = dto.currency
  const total = moneyToNumber(dto.totalAmount)

  const ledgerPaid = ledgerPostedTotal(transactions)
  const paidNum = transactions.length > 0 ? ledgerPaid : moneyToNumber(dto.amountPaid)

  const dueNum = Math.max(0, total - paidNum)
  const paymentProgress = total > 0.0001 ? Math.min(1, paidNum / total) : 0
  const overdueBal = dueNum > 0.009 && terminOverdue(order, todayIso)
  const lastAt = transactions.length ? lastPostedCaptureAt(transactions) : null

  return {
    ...dto,
    amountPaid: numberToMoney(paidNum, currency),
    amountDue: numberToMoney(dueNum, currency),
    remainingAmount: numberToMoney(dueNum, currency),
    paymentProgress,
    hasOverdueBalance: overdueBal,
    lastPaymentAt: lastAt,
  }
}
