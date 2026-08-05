/** @param {import('../data/constants.js').OrderStatus} status */
export function orderStatusStripeSlug(status) {
  const map = {
    Bekleniyor: 'bekleniyor',
    Üretimde: 'uretimde',
    Geldi: 'geldi',
    'Eksik Var': 'eksik',
    Hazır: 'hazir',
    'Teslim Edildi': 'teslim',
  }
  return map[status] ?? 'bekleniyor'
}

/**
 * @param {string | undefined} dueDate YYYY-MM-DD
 * @param {string | undefined} todayIso YYYY-MM-DD
 * @returns {number} Gecikme gün sayısı; yoksa 0
 */
export function terminDelayDays(dueDate, todayIso) {
  if (!dueDate || !todayIso) return 0
  if (dueDate >= todayIso) return 0
  const due = new Date(`${dueDate}T12:00:00`)
  const today = new Date(`${todayIso}T12:00:00`)
  const diff = today.getTime() - due.getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

/**
 * @param {import('../data/seedOrders.js').Order | import('../contracts/v1/orderListRowVm.js').OrderListRowVM} order
 * @returns {number} 0..100
 */
export function paymentCollectionPercent(order) {
  const total = order.amount ?? 0
  if (total <= 0.009) return 100
  const remaining =
    typeof order.remainingAmount === 'number'
      ? Math.max(0, order.remainingAmount)
      : order.paid
        ? 0
        : Math.max(0, total - (order.paidAmount ?? 0))
  const paid = Math.max(0, total - remaining)
  return Math.min(100, Math.max(0, (paid / total) * 100))
}

/**
 * @param {number} percent
 * @returns {'low' | 'mid' | 'high'}
 */
export function paymentCollectionTone(percent) {
  if (percent >= 70) return 'high'
  if (percent >= 30) return 'mid'
  return 'low'
}
