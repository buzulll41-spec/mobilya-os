import { PAYMENT_TRANSACTION_STATUS } from '../../contracts/v1/enums.js'
import { formatTry } from '../../data/dashboardHelpers.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/payment.js').PaymentTransactionDto} PaymentTransactionDto */

/**
 * @typedef {Object} HotSalesPulse
 * @property {number} lastHourSales
 * @property {string} lastHourSalesLabel
 * @property {string} topProductToday
 * @property {string} topSalesPerson
 * @property {string} topCategory
 * @property {number} todayOrderCount
 * @property {number} todayOrderVolume
 * @property {number} densityPercent 0..100 mağaza yoğunluğu
 * @property {'calm' | 'busy' | 'peak'} densityTone
 */

/**
 * @param {string} product
 */
function inferProductCategory(product) {
  const p = product.toLowerCase()
  if (/yatak|baza|başlık/.test(p)) return 'Yatak odası'
  if (/koltuk|köşe|kanepe|oturma/.test(p)) return 'Oturma grubu'
  if (/gardrop|dolap|şifonyer/.test(p)) return 'Gardırop & depolama'
  if (/masa|sandalye|yemek/.test(p)) return 'Yemek & çalışma'
  if (/mutfak/.test(p)) return 'Mutfak'
  return 'Diğer kategoriler'
}

/**
 * @param {Order[]} orders
 * @param {PaymentTransactionDto[]} payments
 * @param {string} todayIso
 * @param {Date} [referenceNow]
 * @returns {HotSalesPulse}
 */
export function computeHotSalesPulse(orders, payments, todayIso, referenceNow = new Date(`${todayIso}T14:00:00`)) {
  const todayOrders = orders.filter((o) => o.orderDate === todayIso)
  const oneHourAgo = new Date(referenceNow.getTime() - 60 * 60 * 1000)

  const lastHourPayments = payments.filter((p) => {
    const t = new Date(p.occurredAt)
    return t >= oneHourAgo && t <= referenceNow && p.status === PAYMENT_TRANSACTION_STATUS.POSTED
  })
  const lastHourSales = lastHourPayments.reduce(
    (s, p) => s + Number.parseFloat(p.amount.amount),
    0,
  )

  /** @type {Record<string, number>} */
  const productCounts = {}
  /** @type {Record<string, number>} */
  const personCounts = {}
  /** @type {Record<string, number>} */
  const categoryCounts = {}

  for (const o of todayOrders) {
    productCounts[o.product] = (productCounts[o.product] ?? 0) + 1
    const person = o.salesPerson?.trim() || 'Atanmamış'
    personCounts[person] = (personCounts[person] ?? 0) + 1
    const cat = inferProductCategory(o.product)
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
  }

  const topProductToday = pickTopKey(productCounts, 'Henüz sipariş yok')
  const topSalesPerson = pickTopKey(personCounts, '—')
  const topCategory = pickTopKey(categoryCounts, '—')

  const todayOrderVolume = todayOrders.reduce((s, o) => s + o.amount, 0)
  const todayOrderCount = todayOrders.length

  const hourlyNorm = 3
  const densityRaw = Math.min(100, Math.round((todayOrderCount / hourlyNorm) * 28))
  const densityPercent = Math.max(8, densityRaw)
  const densityTone =
    densityPercent >= 75 ? 'peak' : densityPercent >= 45 ? 'busy' : 'calm'

  return {
    lastHourSales,
    lastHourSalesLabel: formatTry(lastHourSales),
    topProductToday,
    topSalesPerson,
    topCategory,
    todayOrderCount,
    todayOrderVolume,
    densityPercent,
    densityTone,
  }
}

/**
 * @param {Record<string, number>} map
 * @param {string} fallback
 */
function pickTopKey(map, fallback) {
  const entries = Object.entries(map)
  if (entries.length === 0) return fallback
  entries.sort((a, b) => b[1] - a[1])
  const [key, count] = entries[0]
  return count > 1 ? `${key} (${count})` : key
}
