import { formatTry } from '../../data/dashboardHelpers.js'
import { formatShortDate } from '../../utils/dates.js'
import { PAYMENT_METHOD } from '../../contracts/v1/enums.js'
import {
  buildOrderPanelPaymentRows,
  resolveOrderPaymentStatus,
} from '../order/orderPanelPaymentsModel.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/payment.js').PaymentTransactionDto} PaymentTransactionDto */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

export const COLLECTION_PAYMENT_METHOD_OPTIONS = [
  { id: PAYMENT_METHOD.CASH, label: 'Nakit' },
  { id: PAYMENT_METHOD.TRANSFER, label: 'Havale' },
  { id: PAYMENT_METHOD.CARD, label: 'Kredi Kartı' },
  { id: PAYMENT_METHOD.CHECK, label: 'Senet' },
  { id: PAYMENT_METHOD.MAIL_ORDER, label: 'Tedarikçiye Direkt Ödeme (Mail Order)' },
  { id: PAYMENT_METHOD.OTHER, label: 'Diğer' },
]

/**
 * @param {Order} order
 * @param {number} remaining
 * @param {number} paidPct
 */
export function buildCollectionFinanceCards(order, remaining, paidPct) {
  const total = order.amount
  const collected = order.paid ? total : (order.paidAmount ?? 0)

  return [
    { id: 'order', label: 'Sipariş', value: formatTry(total), tone: 'neutral' },
    { id: 'collected', label: 'Tahsilat', value: formatTry(collected), tone: 'success' },
    {
      id: 'remaining',
      label: 'Kalan',
      value: formatTry(remaining),
      tone: remaining > 0.009 ? 'critical' : 'success',
    },
    {
      id: 'rate',
      label: 'Oran',
      value: `%${paidPct}`,
      tone: paidPct >= 100 ? 'success' : paidPct > 0 ? 'warning' : 'critical',
    },
  ]
}

/**
 * @param {Order} order
 * @param {number} remaining
 * @param {number} paidPct
 */
export function buildCollectionRiskBanner(order, remaining, paidPct) {
  const total = order.amount ?? 0
  const ratio = total > 0 ? remaining / total : 0

  if (remaining <= 0.009) {
    return {
      tone: 'ok',
      title: 'Tahsilat Tamamlandı',
      message: 'Sevk ve teslim için finansal engel yok.',
      showPreShipmentWarning: false,
    }
  }

  if (ratio >= 0.45 || paidPct < 15) {
    return {
      tone: 'critical',
      title: 'Tahsilat Riski Yüksek',
      message: `Kalan bakiye: ${formatTry(remaining)}. Sevk öncesi kontrol gerekli.`,
      showPreShipmentWarning: true,
    }
  }

  if (ratio >= 0.2) {
    return {
      tone: 'warning',
      title: 'Tahsilat Riski Orta',
      message: `Kalan bakiye: ${formatTry(remaining)}. Sevk öncesi bakiye kontrol edin.`,
      showPreShipmentWarning: true,
    }
  }

  return {
    tone: 'watch',
    title: 'Tahsilat Devam Ediyor',
    message: `Kalan bakiye: ${formatTry(remaining)}.`,
    showPreShipmentWarning: false,
  }
}

/**
 * @param {PaymentTransactionDto[]} transactions
 * @param {DomainEventDto[]} orderEvents
 */
export function buildCollectionPaymentHistory(transactions, orderEvents) {
  return buildOrderPanelPaymentRows(transactions, orderEvents).map((row) => ({
    id: row.id,
    dateLabel: row.dateLabel,
    methodLabel: row.methodLabel,
    supplierLabel: row.supplierLabel,
    amountLabel: row.amountLabel,
    description: row.description,
    statusLabel: row.statusLabel,
    isPendingApproval: row.statusTone === 'pending' && row.statusLabel === 'Onay Bekliyor',
  }))
}

/**
 * @param {Order} order
 * @param {number} remaining
 * @param {PaymentTransactionDto[]} transactions
 */
export function buildCollectionCenterHeaderMeta(order, remaining, transactions) {
  const paymentStatus = resolveOrderPaymentStatus(order, remaining, transactions)
  return {
    orderNumber: order.id,
    customerName: order.customer,
    paymentStatusLabel: paymentStatus.label,
    paymentStatusTone: paymentStatus.tone,
  }
}
