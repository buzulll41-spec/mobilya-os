import { formatShortDate } from './dates.js'

/** @typedef {'done' | 'current' | 'pending'} TimelineStepState */

/**
 * @typedef {Object} TimelineStep
 * @property {string} key
 * @property {string} label
 * @property {TimelineStepState} state
 * @property {string} [dateLabel]
 */

/** @param {import('../data/seedOrders.js').Order} order */
function hasDeposit(order) {
  return Boolean(order.paid) || (order.paidAmount ?? 0) > 0
}

/** @param {import('../data/seedOrders.js').Order} order */
function inProductionFlow(order) {
  return ['Üretimde', 'Geldi', 'Eksik Var', 'Hazır', 'Teslim Edildi'].includes(order.status)
}

/** @param {import('../data/seedOrders.js').Order} order */
function productArrived(order) {
  return ['Geldi', 'Eksik Var', 'Hazır', 'Teslim Edildi'].includes(order.status)
}

/** @param {import('../data/seedOrders.js').Order} order */
function delivered(order) {
  return order.status === 'Teslim Edildi'
}

/**
 * Operasyon zaman çizelgesi — sipariş verisinden türetilir.
 * @param {import('../data/seedOrders.js').Order} order
 * @returns {TimelineStep[]}
 */
export function buildOrderTimeline(order) {
  const d0 = formatShortDate(order.orderDate)
  const dShip = order.shipmentDate ? formatShortDate(order.shipmentDate) : undefined

  const checks = [
    { key: 'created', label: 'Sipariş oluşturuldu', done: true, dateLabel: d0 },
    {
      key: 'deposit',
      label: 'Kapora alındı',
      done: hasDeposit(order),
      dateLabel: hasDeposit(order) ? d0 : undefined,
    },
    {
      key: 'production',
      label: 'Üretime gönderildi',
      done: inProductionFlow(order),
      dateLabel: inProductionFlow(order) ? formatShortDate(order.orderDate) : undefined,
    },
    {
      key: 'arrived',
      label: 'Ürün geldi',
      done: productArrived(order),
      dateLabel: productArrived(order) ? formatShortDate(order.dueDate ?? order.orderDate) : undefined,
    },
    {
      key: 'shipment',
      label: 'Sevk planlandı',
      done: Boolean(order.shipmentDate),
      dateLabel: dShip,
    },
    {
      key: 'delivered',
      label: 'Teslim edildi',
      done: delivered(order),
      dateLabel: delivered(order) ? formatShortDate(order.shipmentDate ?? order.dueDate) : undefined,
    },
  ]

  let seenCurrent = false
  return checks.map((s) => {
    let state = /** @type {TimelineStepState} */ ('pending')
    if (s.done) {
      state = 'done'
    } else if (!seenCurrent) {
      state = 'current'
      seenCurrent = true
    }
    return { key: s.key, label: s.label, state, dateLabel: s.dateLabel }
  })
}
