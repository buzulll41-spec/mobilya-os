import { addDays } from '../data/constants.js'
import { isTerminOverdue } from './orderFinance.js'

/**
 * @typedef {Object} OrderFilterState
 * @property {string} status
 * @property {string} delivery
 * @property {string} salesPerson
 */

/**
 * @param {import('../data/seedOrders.js').Order[]} orders
 * @param {OrderFilterState} f
 * @param {string} todayIso
 */
export function applyOrderFilters(orders, f, todayIso) {
  let r = orders

  if (f.status !== 'all') {
    r = r.filter((o) => o.status === f.status)
  }

  if (f.salesPerson !== 'all') {
    r = r.filter((o) => (o.salesPerson ?? '') === f.salesPerson)
  }

  if (f.delivery === 'today') {
    r = r.filter((o) => o.shipmentDate === todayIso)
  } else if (f.delivery === 'week') {
    const end = addDays(todayIso, 7)
    r = r.filter(
      (o) =>
        o.shipmentDate &&
        o.shipmentDate >= todayIso &&
        o.shipmentDate <= end,
    )
  } else if (f.delivery === 'overdue') {
    r = r.filter((o) => isTerminOverdue(o, todayIso))
  }

  return r
}

/**
 * @param {import('../data/seedOrders.js').Order[]} orders
 * @returns {string[]}
 */
export function uniqueSalesPeople(orders) {
  const s = new Set()
  for (const o of orders) {
    if (o.salesPerson) s.add(o.salesPerson)
  }
  return [...s].sort((a, b) => a.localeCompare(b, 'tr'))
}
