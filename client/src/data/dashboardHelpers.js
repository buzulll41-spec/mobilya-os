import { DEMO_TODAY, DEMO_TOMORROW } from './constants.js'
import { remainingBalance } from '../utils/orderFinance.js'

/** @param {import('./seedOrders.js').Order[]} orders */
export function computeDashboardKpis(orders) {
  const active = orders.filter((o) => o.status !== 'Teslim Edildi')
  const pendingCollection = active.reduce((s, o) => s + remainingBalance(o), 0)
  const overdueOrders = active.filter(
    (o) => o.dueDate && o.dueDate < DEMO_TODAY,
  ).length
  const tomorrowShipments = active.filter(
    (o) => o.shipmentDate === DEMO_TOMORROW,
  ).length
  return { pendingCollection, overdueOrders, tomorrowShipments }
}

export function formatTry(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}
