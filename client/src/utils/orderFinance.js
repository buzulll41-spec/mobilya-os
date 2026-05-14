/** @param {import('../data/seedOrders.js').Order} o */
export function remainingBalance(o) {
  if (o.paid) return 0
  const collected = o.paidAmount ?? 0
  return Math.max(0, o.amount - collected)
}

/**
 * Aktif işte termin tarihi geçmiş mi?
 * @param {import('../data/seedOrders.js').Order} o
 * @param {string} todayIso
 */
export function isTerminOverdue(o, todayIso) {
  if (o.status === 'Teslim Edildi') return false
  if (!o.dueDate) return false
  return o.dueDate < todayIso
}
