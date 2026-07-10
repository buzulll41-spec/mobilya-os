import { formatTry } from '../../data/dashboardHelpers.js'
import { PAYMENT_METHOD, PAYMENT_TRANSACTION_KIND, PAYMENT_TRANSACTION_STATUS } from '../../contracts/v1/enums.js'

/** @typedef {import('./orderPanelProductsModel.js').OrderPanelProductRow} OrderPanelProductRow */
/** @typedef {import('../../contracts/v1/payment.js').PaymentTransactionDto} PaymentTransactionDto */

const num = (v) => {
  const n = Number.parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

function isSettledPayment(tx) {
  return tx.status === PAYMENT_TRANSACTION_STATUS.POSTED
}

/**
 * @param {PaymentTransactionDto[]} payments
 */
function sumApprovedMailOrderCost(payments) {
  return payments
    .filter((tx) => tx.kind === PAYMENT_TRANSACTION_KIND.MAIL_ORDER && isSettledPayment(tx))
    .reduce((sum, tx) => sum + num(tx.amount?.amount), 0)
}

/**
 * @param {PaymentTransactionDto[]} payments
 */
function sumApprovedCustomerCollections(payments) {
  return payments.filter(isSettledPayment).reduce((sum, tx) => sum + num(tx.amount?.amount), 0)
}

/**
 * @param {PaymentTransactionDto[]} payments
 */
function estimateCashAndBank(payments) {
  let cash = 0
  let bank = 0
  for (const tx of payments) {
    if (!isSettledPayment(tx)) continue
    const amount = num(tx.amount?.amount)
    if (tx.method === PAYMENT_METHOD.CASH) cash += amount
    else if (tx.method === PAYMENT_METHOD.TRANSFER || tx.method === PAYMENT_METHOD.CARD) bank += amount
  }
  return { cash, bank }
}

/**
 * Sipariş bazlı gerçek kâr: satış − net alış − mail order − sevkiyat − montaj.
 *
 * @param {OrderPanelProductRow[]} productRows
 * @param {PaymentTransactionDto[]} [payments]
 * @param {{ shipmentCost?: number, assemblyCost?: number }} [opsCosts]
 */
export function computeOrderRealProfit(productRows, payments = [], opsCosts = {}) {
  const saleTotal = productRows.reduce((s, r) => s + (r.lineTotal ?? 0), 0)
  const netPurchaseCost = productRows.reduce((s, r) => {
    if (r.unitCost == null) return s
    return s + r.unitCost * r.qtyOrdered
  }, 0)
  const mailOrderCost = sumApprovedMailOrderCost(payments)
  const shipmentCost = num(opsCosts.shipmentCost)
  const assemblyCost = num(opsCosts.assemblyCost)
  const grossMargin = saleTotal - netPurchaseCost
  const realProfit = saleTotal - netPurchaseCost - mailOrderCost - shipmentCost - assemblyCost

  return {
    saleTotal,
    netPurchaseCost,
    mailOrderCost,
    shipmentCost,
    assemblyCost,
    grossMargin,
    realProfit,
    marginPct: saleTotal > 0 ? (realProfit / saleTotal) * 100 : null,
  }
}

/**
 * @param {ReturnType<typeof computeOrderRealProfit>} profit
 */
export function buildOrderRealProfitMetrics(profit) {
  const tone =
    profit.realProfit > 0 ? /** @type {const} */ ('success') : profit.realProfit < 0 ? /** @type {const} */ ('critical') : /** @type {const} */ ('neutral')
  return [
    { id: 'sale', label: 'Satış', value: formatTry(profit.saleTotal) },
    { id: 'cost', label: 'Net Alış', value: formatTry(profit.netPurchaseCost), valueTone: /** @type {const} */ ('warning') },
    { id: 'mail-order', label: 'Mail Order', value: formatTry(profit.mailOrderCost) },
    { id: 'ops', label: 'Sevkiyat + Montaj', value: formatTry(profit.shipmentCost + profit.assemblyCost) },
    {
      id: 'real-profit',
      label: 'Gerçek Kâr',
      value: formatTry(profit.realProfit),
      valueTone: tone,
    },
  ]
}

export { sumApprovedCustomerCollections, estimateCashAndBank }
