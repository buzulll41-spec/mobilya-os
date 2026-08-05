/** @param {import('../data/seedOrders.js').Order | import('../contracts/v1/orderListRowVm.js').OrderListRowVM | import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM | import('../contracts/v1/collectionRowVm.js').CollectionRowVM} o */
export function remainingBalance(o) {
  if (typeof o.remainingAmount === 'number') return Math.max(0, o.remainingAmount)
  if (o.paid) return 0
  const total = typeof o.totalAmount === 'number' ? o.totalAmount : o.amount
  const collected = o.paidAmount ?? 0
  return Math.max(0, total - collected)
}

/**
 * Aktif işte termin tarihi geçmiş mi?
 * @param {import('../data/seedOrders.js').Order | import('../contracts/v1/orderListRowVm.js').OrderListRowVM | import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM | import('../contracts/v1/collectionRowVm.js').CollectionRowVM} o
 * @param {string} todayIso
 */
export function isTerminOverdue(o, todayIso) {
  if (o.status === 'Teslim Edildi') return false
  if (!o.dueDate) return false
  return o.dueDate < todayIso
}
