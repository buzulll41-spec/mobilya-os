import { isTerminOverdue } from './orderFinance.js'

/** @param {import('../data/seedOrders.js').Order[]} orders @param {string} todayIso */
export function getRiskyOrders(orders, todayIso) {
  return orders
    .filter((o) => o.status !== 'Teslim Edildi' && isTerminOverdue(o, todayIso))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
}

/** Bugün sevk / teslimat planı */
export function getTodayDeliveries(orders, todayIso) {
  return orders
    .filter((o) => o.status !== 'Teslim Edildi' && o.shipmentDate === todayIso)
    .sort((a, b) => (a.customer ?? '').localeCompare(b.customer ?? ''))
}

/** @param {import('../data/seedOrders.js').Order[]} orders */
export function getMissingProductOrders(orders) {
  return orders.filter((o) => o.status === 'Eksik Var')
}
