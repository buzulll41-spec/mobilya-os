import {
  LOW_OCCUPANCY_THRESHOLD,
  MAX_STOPS_PER_VEHICLE,
  SHIPMENT_FLEET_VEHICLES,
} from './shipmentPlanConstants.js'
import { parseTimeToMinutes } from './shipmentPlanConflict.js'

/** @typedef {import('./shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @typedef {Object} VehiclePlanStop
 * @property {string} time
 * @property {boolean} hasTime
 * @property {string} customer
 * @property {string} region
 * @property {string} orderNumber
 * @property {string} statusLabel
 * @property {string} orderId
 */

/**
 * @typedef {Object} VehiclePlanColumn
 * @property {string} vehicle
 * @property {number} stopCount
 * @property {number} occupancyPercent
 * @property {boolean} lowOccupancy
 * @property {string} [occupancyHint]
 * @property {VehiclePlanStop[]} stops
 */

/**
 * @param {number} stopCount
 */
export function computeVehicleOccupancyPercent(stopCount) {
  return Math.min(100, Math.round((stopCount / MAX_STOPS_PER_VEHICLE) * 100))
}

/**
 * @param {ShipmentAgendaItem[]} agendaItems
 * @returns {VehiclePlanColumn[]}
 */
export function buildDailyVehiclePlan(agendaItems) {
  /** @type {Map<string, VehiclePlanStop[]>} */
  const byVehicle = new Map(SHIPMENT_FLEET_VEHICLES.map((v) => [v, []]))

  for (const item of agendaItems) {
    if (!item.hasVehicle) continue
    const vehicle = item.vehicleLabel
    if (!byVehicle.has(vehicle)) continue

    byVehicle.get(vehicle)?.push({
      time: item.hasScheduledTime ? item.timeLabel : '—',
      hasTime: Boolean(item.hasScheduledTime),
      customer: item.customer,
      region: item.region,
      orderNumber: item.orderNumber,
      statusLabel: item.statusLabel,
      orderId: item.orderId,
    })
  }

  return SHIPMENT_FLEET_VEHICLES.map((vehicle) => {
    const stops = (byVehicle.get(vehicle) ?? []).sort((a, b) => {
      const ta = parseTimeToMinutes(a.hasTime ? a.time : '')
      const tb = parseTimeToMinutes(b.hasTime ? b.time : '')
      if (ta != null && tb != null && ta !== tb) return ta - tb
      if (ta != null && tb == null) return -1
      if (ta == null && tb != null) return 1
      return a.customer.localeCompare(b.customer, 'tr')
    })

    const occupancyPercent = computeVehicleOccupancyPercent(stops.length)
    const lowOccupancy = stops.length > 0 && occupancyPercent < LOW_OCCUPANCY_THRESHOLD

    return {
      vehicle,
      stopCount: stops.length,
      occupancyPercent,
      lowOccupancy,
      occupancyHint: lowOccupancy ? 'Bu araç başka sevklerle birleştirilebilir.' : undefined,
      stops,
    }
  })
}

/**
 * @param {ShipmentPlan[]} plans
 * @param {string} dateIso
 */
export function countPlansByVehicleForDate(plans, dateIso) {
  /** @type {Record<string, number>} */
  const counts = Object.fromEntries(SHIPMENT_FLEET_VEHICLES.map((v) => [v, 0]))
  for (const plan of plans) {
    if (plan.plannedDate !== dateIso) continue
    if (plan.vehicle && counts[plan.vehicle] != null) {
      counts[plan.vehicle] += 1
    }
  }
  return counts
}

/**
 * @param {ShipmentPlan[]} plans
 * @param {string} dateIso
 * @returns {string}
 */
export function pickLeastLoadedVehicle(plans, dateIso) {
  const counts = countPlansByVehicleForDate(plans, dateIso)
  let best = SHIPMENT_FLEET_VEHICLES[0]
  let min = Number.POSITIVE_INFINITY
  for (const vehicle of SHIPMENT_FLEET_VEHICLES) {
    const count = counts[vehicle] ?? 0
    if (count < min) {
      min = count
      best = vehicle
    }
  }
  return best
}

/**
 * @param {number} minutes
 */
export function minutesToPlanTime(minutes) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * @param {import('./shipmentOpportunityEngine.js').ShipmentOpportunityGroup} group
 * @param {string} selectedDate
 * @param {ShipmentPlan[]} allPlans
 * @returns {ShipmentPlan[]}
 */
export function buildAutoGroupPlans(group, selectedDate, allPlans) {
  const vehicle = pickLeastLoadedVehicle(allPlans, selectedDate)
  const crew1 = 'Muhammet'
  const crew2 = 'Cihan'
  const baseMinutes = 9 * 60

  return group.orders.map((order, index) => ({
    orderId: order.orderId,
    plannedDate: selectedDate,
    plannedTime: minutesToPlanTime(baseMinutes + index * 120),
    region: group.region,
    vehicle,
    crew1,
    crew2,
    note: `${group.region} sevk grubu`,
    updatedAt: new Date().toISOString(),
  }))
}
