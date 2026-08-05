/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

const CONFLICT_WINDOW_MINUTES = 120

/**
 * @param {string} time
 * @returns {number | null}
 */
export function parseTimeToMinutes(time) {
  const m = typeof time === 'string' ? time.match(/^(\d{2}):(\d{2})$/) : null
  if (!m) return null
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10)
}

/**
 * @param {number | null} a
 * @param {number | null} b
 */
function withinWindow(a, b) {
  if (a == null || b == null) return false
  return Math.abs(a - b) <= CONFLICT_WINDOW_MINUTES
}

/**
 * @param {ShipmentPlan} plan
 */
function crewMembers(plan) {
  return [plan.crew1, plan.crew2]
    .map((c) => (typeof c === 'string' ? c.trim() : ''))
    .filter((c) => c && c !== 'Belirlenmedi' && c !== 'Dış ekip')
}

/**
 * @param {ShipmentPlan} plan
 * @param {ShipmentPlan[]} allPlans
 * @param {string} [excludeOrderId]
 * @returns {{ vehicleWarnings: string[], crewWarnings: string[] }}
 */
export function detectPlanConflicts(plan, allPlans, excludeOrderId) {
  /** @type {string[]} */
  const vehicleWarnings = []
  /** @type {string[]} */
  const crewWarnings = []

  if (!plan.plannedDate || !plan.plannedTime) {
    return { vehicleWarnings, crewWarnings }
  }

  const planMinutes = parseTimeToMinutes(plan.plannedTime)
  if (planMinutes == null) return { vehicleWarnings, crewWarnings }

  const vehicle = plan.vehicle?.trim()
  const members = crewMembers(plan)

  for (const other of allPlans) {
    if (!other || other.orderId === plan.orderId) continue
    if (excludeOrderId && other.orderId === excludeOrderId) continue
    if (other.plannedDate !== plan.plannedDate) continue
    if (!other.plannedTime) continue

    const otherMinutes = parseTimeToMinutes(other.plannedTime)
    if (otherMinutes == null) continue
    if (!withinWindow(planMinutes, otherMinutes)) continue

    if (vehicle && other.vehicle?.trim() === vehicle) {
      vehicleWarnings.push(`⚠️ ${vehicle} bu saate yakın başka sevkte kullanılıyor.`)
    }

    for (const member of members) {
      const otherMembers = crewMembers(other)
      if (otherMembers.includes(member)) {
        crewWarnings.push(`⚠️ ${member} aynı saat aralığında başka sevkte.`)
      }
    }
  }

  return {
    vehicleWarnings: [...new Set(vehicleWarnings)],
    crewWarnings: [...new Set(crewWarnings)],
  }
}
