import { addDays } from '../../data/constants.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { normalizeShipmentRegion } from './shipmentRegionNormalize.js'
import { TRIP_SAVINGS_TRY } from './shipmentPlanConstants.js'

/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @typedef {Object} ShipmentOpportunityCandidate
 * @property {string} orderId
 * @property {string} customer
 * @property {string} region
 * @property {boolean} regionKnown
 * @property {string} shipDate
 * @property {string} status
 * @property {number} amount
 * @property {number} remaining
 * @property {string} product
 * @property {boolean} shippable
 */

/**
 * @typedef {Object} ShipmentOpportunityGroup
 * @property {string} id
 * @property {string} region
 * @property {number} orderCount
 * @property {number} totalAmount
 * @property {number} totalRemaining
 * @property {string} dateFrom
 * @property {string} dateTo
 * @property {number} score
 * @property {'high' | 'mid' | 'low'} scoreTone
 * @property {number} estimatedSavings
 * @property {number} vehiclesNeeded
 * @property {ShipmentOpportunityCandidate[]} orders
 */

/**
 * @typedef {Object} RegionShipmentSummary
 * @property {string} region
 * @property {number} orderCount
 * @property {number} estimatedSavings
 * @property {ShipmentOpportunityCandidate[]} orders
 */

/** @param {number} orderCount */
export function estimateRegionalSavings(orderCount) {
  if (orderCount < 2) return 0
  return (orderCount - 1) * TRIP_SAVINGS_TRY
}

const ELIGIBLE_STATUSES = new Set(['Hazır', 'Üretimde', 'Bekleniyor', 'Geldi', 'Eksik Var'])

/**
 * @param {string} isoA
 * @param {string} isoB
 */
export function daysBetweenIso(isoA, isoB) {
  const a = new Date(`${isoA}T12:00:00`)
  const b = new Date(`${isoB}T12:00:00`)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/**
 * @param {ShipmentOpportunityCandidate} order
 * @param {string} anchorDate
 */
export function scoreOpportunityOrder(order, anchorDate) {
  let score = 0
  if (order.regionKnown) score += 40
  else return Math.min(59, score)

  const dayDiff = Math.abs(daysBetweenIso(order.shipDate, anchorDate))
  if (dayDiff <= 1) score += 25
  else if (dayDiff <= 2) score += 15

  if (order.status === 'Hazır') score += 15
  else if (order.status === 'Üretimde') score += 8

  const ratio = order.amount > 0 ? order.remaining / order.amount : 1
  if (ratio <= 0.2) score += 10
  else if (ratio <= 0.45) score += 5

  if (order.shippable) score += 10

  return Math.min(100, Math.max(0, score))
}

/** @param {number} score @returns {'high' | 'mid' | 'low'} */
export function opportunityScoreTone(score) {
  if (score >= 80) return 'high'
  if (score >= 60) return 'mid'
  return 'low'
}

/**
 * @param {ShipmentRowVM | Order} row
 * @param {string} anchorDate
 * @param {ShipmentPlan | undefined} [plan]
 * @returns {ShipmentOpportunityCandidate | null}
 */
export function toOpportunityCandidate(row, anchorDate, plan) {
  if (row.status === 'Teslim Edildi') return null
  if (!ELIGIBLE_STATUSES.has(row.status)) return null

  const shipDate =
    plan?.plannedDate ||
    ('plannedShipDate' in row && row.plannedShipDate) ||
    row.shipmentDate ||
    row.dueDate ||
    null
  if (!shipDate) return null

  const diff = Math.abs(daysBetweenIso(shipDate, anchorDate))
  if (diff > 2) return null

  const fromNotes = normalizeShipmentRegion(row.notes ?? '')
  const region = plan?.region?.trim() || fromNotes.region
  const regionKnown = Boolean(plan?.region?.trim()) || fromNotes.known
  if (!regionKnown) return null

  const amount = row.amount ?? 0
  const remaining = remainingBalance(row)
  const shippable =
    row.status === 'Hazır' ||
    (('remainingQty' in row ? row.remainingQty : 0) ?? 0) > 0 ||
    row.status !== 'Eksik Var'

  return {
    orderId: row.id,
    customer: row.customer ?? '—',
    region,
    regionKnown,
    shipDate,
    status: row.status,
    amount,
    remaining,
    product: row.product ?? '—',
    shippable,
  }
}

/**
 * @param {ShipmentOpportunityCandidate[]} candidates
 * @param {string} anchorDate
 * @returns {ShipmentOpportunityGroup[]}
 */
export function groupShipmentOpportunities(candidates, anchorDate) {
  /** @type {Map<string, ShipmentOpportunityCandidate[]>} */
  const byRegion = new Map()
  for (const c of candidates) {
    if (!c.shippable) continue
    const list = byRegion.get(c.region) ?? []
    list.push(c)
    byRegion.set(c.region, list)
  }

  /** @type {ShipmentOpportunityGroup[]} */
  const groups = []
  for (const [region, orders] of byRegion.entries()) {
    if (orders.length < 2) continue
    const dates = orders.map((o) => o.shipDate).sort()
    const totalAmount = orders.reduce((s, o) => s + o.amount, 0)
    const totalRemaining = orders.reduce((s, o) => s + o.remaining, 0)
    const avgScore =
      orders.reduce((s, o) => s + scoreOpportunityOrder(o, anchorDate), 0) / orders.length
    const score = Math.round(avgScore + Math.min(10, orders.length * 2))

    const estimatedSavings = estimateRegionalSavings(orders.length)

    groups.push({
      id: `opp-${region}-${dates[0]}`,
      region,
      orderCount: orders.length,
      totalAmount,
      totalRemaining,
      dateFrom: dates[0],
      dateTo: dates[dates.length - 1],
      score: Math.min(100, score),
      scoreTone: opportunityScoreTone(Math.min(100, score)),
      estimatedSavings,
      vehiclesNeeded: 1,
      orders: [...orders].sort((a, b) => a.shipDate.localeCompare(b.shipDate)),
    })
  }

  return groups.sort((a, b) => b.score - a.score || b.orderCount - a.orderCount)
}

/**
 * @param {string} anchorDate
 */
export function opportunityWindowDates(anchorDate) {
  return [addDays(anchorDate, -2), addDays(anchorDate, -1), anchorDate, addDays(anchorDate, 1), addDays(anchorDate, 2)]
}

/**
 * @param {ShipmentOpportunityCandidate[]} candidates
 * @returns {RegionShipmentSummary[]}
 */
export function buildRegionShipmentMap(candidates) {
  /** @type {Map<string, ShipmentOpportunityCandidate[]>} */
  const byRegion = new Map()
  for (const c of candidates) {
    if (!c.shippable || !c.regionKnown) continue
    const list = byRegion.get(c.region) ?? []
    list.push(c)
    byRegion.set(c.region, list)
  }

  return [...byRegion.entries()]
    .map(([region, orders]) => ({
      region,
      orderCount: orders.length,
      estimatedSavings: estimateRegionalSavings(orders.length),
      orders: [...orders].sort((a, b) => a.shipDate.localeCompare(b.shipDate)),
    }))
    .sort((a, b) => b.orderCount - a.orderCount || b.estimatedSavings - a.estimatedSavings)
}

/**
 * @param {Iterable<ShipmentRowVM | Order>} rows
 * @param {string} todayIso
 * @param {Map<string, ShipmentPlan>} [plansByOrderId]
 */
export function computeWeeklySavingsPotential(rows, todayIso, plansByOrderId = new Map()) {
  /** @type {Set<string>} */
  const seenGroupIds = new Set()
  let total = 0

  for (let i = 0; i < 7; i++) {
    const day = addDays(todayIso, i)
    /** @type {ShipmentOpportunityCandidate[]} */
    const candidates = []
    for (const row of rows) {
      const plan = plansByOrderId.get(row.id)
      const c = toOpportunityCandidate(row, day, plan)
      if (c) candidates.push(c)
    }
    for (const group of groupShipmentOpportunities(candidates, day)) {
      if (seenGroupIds.has(group.id)) continue
      seenGroupIds.add(group.id)
      total += group.estimatedSavings
    }
  }

  return total
}
