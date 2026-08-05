import { DEFAULT_CURRENCY } from '../contracts/index.js'
import { ORDER_CHANNELS, RISK_SEVERITY, SALES_ORDER_LIFECYCLE } from '../contracts/v1/enums.js'
import { remainingBalance } from '../utils/orderFinance.js'
import { numberToMoney } from './moneyHelpers.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

const STATUS_TO_LIFECYCLE = /** @type {Record<string, import('../contracts/v1/enums.js').SalesOrderLifecycleStatus>} */ ({
  Bekleniyor: SALES_ORDER_LIFECYCLE.CONFIRMED,
  Üretimde: SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  Geldi: SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  'Kısmi Geldi': SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  'Eksik Var': SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  Hazır: SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  'Sevke Hazır': SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  'Teslim Edildi': SALES_ORDER_LIFECYCLE.DELIVERED,
})

/**
 * @param {import('../data/constants.js').OrderStatus} status
 */
function fulfillmentProgressFromStatus(status) {
  switch (status) {
    case 'Teslim Edildi':
      return 1
    case 'Hazır':
      return 0.85
    case 'Geldi':
      return 0.7
    case 'Eksik Var':
      return 0.45
    case 'Üretimde':
      return 0.35
    case 'Bekleniyor':
      return 0.15
    default:
      return 0.2
  }
}

/**
 * @param {Order} o
 * @param {string} todayIso
 */
function riskSeverityFromOrder(o, todayIso) {
  if (o.status === 'Eksik Var') return RISK_SEVERITY.MEDIUM
  if (o.status !== 'Teslim Edildi' && o.dueDate && o.dueDate < todayIso) return RISK_SEVERITY.MEDIUM
  return RISK_SEVERITY.NONE
}

/**
 * @param {Order} order
 * @param {string} [todayIso] Risk için referans günü; verilmezse sadece satır sinyali
 * @returns {SalesOrderListItemDto}
 */
export function legacyOrderToSalesOrderListItemDto(order, todayIso = '1970-01-01') {
  const currency = DEFAULT_CURRENCY
  const total = typeof order.totalAmount === 'number' ? order.totalAmount : order.amount
  const subtotal = typeof order.subtotalAmount === 'number' ? order.subtotalAmount : total
  const discount = typeof order.discountAmount === 'number' ? order.discountAmount : 0
  const paidTotal = order.paid ? total : order.paidAmount ?? 0
  const due = remainingBalance({ ...order, amount: total, totalAmount: total })
  const lifecycle = STATUS_TO_LIFECYCLE[order.status] ?? SALES_ORDER_LIFECYCLE.IN_FULFILLMENT

  return {
    id: order.id,
    orderNumber: order.id,
    customerId: `C-${order.id.replace(/[^a-zA-Z0-9]/g, '')}`,
    customerDisplayName: order.customer,
    customerPhone: order.phone ?? null,
    channel: ORDER_CHANNELS.STORE,
    currency,
    placedAt: `${order.orderDate}T10:00:00.000Z`,
    lifecycleStatus: lifecycle,
    version: 1,
    subtotalAmount: numberToMoney(subtotal, currency),
    discountAmount: numberToMoney(discount, currency),
    totalAmount: numberToMoney(total, currency),
    amountPaid: numberToMoney(paidTotal, currency),
    amountDue: numberToMoney(due, currency),
    remainingAmount: numberToMoney(due, currency),
    fulfillmentProgress: fulfillmentProgressFromStatus(order.status),
    currentRiskSeverity: riskSeverityFromOrder(order, todayIso),
    earliestCommittedShipBy: order.dueDate ?? null,
    latestCommittedShipBy: order.dueDate ?? null,
    lineSummaryTitle: order.product,
    displayStatus: order.status,
    plannedShipmentDate: order.shipmentDate ?? null,
    salesPerson: order.salesPerson,
    lineCostAmount: typeof order.cost === 'number' ? numberToMoney(order.cost, currency) : null,
    notesSnapshot: order.notes ?? null,
  }
}
