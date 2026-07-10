import { SHIPMENT_PLAN_STATUS } from '../../constants/shipmentPlanStatuses.js'

const QUEUE_ELIGIBLE = new Set([
  SHIPMENT_PLAN_STATUS.PLANNED,
  SHIPMENT_PLAN_STATUS.APPLIED,
  SHIPMENT_PLAN_STATUS.IN_TRANSIT,
])

/**
 * @param {import('../../state/shipmentPlanStore.js').ShipmentPlan} plan
 * @param {string} todayIso
 * @param {string | undefined} orderDisplayStatus
 */
export function shouldPromoteToConfirmationQueue(plan, todayIso, orderDisplayStatus) {
  if (!plan?.plannedDate) return false
  if (plan.plannedDate >= todayIso) return false
  if (orderDisplayStatus === 'Teslim Edildi') return false
  if (plan.status === SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) return false
  if (plan.status === SHIPMENT_PLAN_STATUS.DELIVERED) return false
  if (plan.status === SHIPMENT_PLAN_STATUS.DELIVERY_FAILED) return false
  if (plan.status === SHIPMENT_PLAN_STATUS.CANCELLED) return false
  if (plan.status === SHIPMENT_PLAN_STATUS.POSTPONED) return false
  return QUEUE_ELIGIBLE.has(plan.status ?? SHIPMENT_PLAN_STATUS.PLANNED)
}

/**
 * @param {import('../../state/shipmentPlanStore.js').ShipmentPlan[]} plans
 * @param {Map<string, string>} orderStatusById orderId -> displayStatus
 * @param {string} todayIso
 * @returns {import('../../state/shipmentPlanStore.js').ShipmentPlan[]}
 */
export function processDeliveryConfirmationQueue(plans, orderStatusById, todayIso) {
  let changed = false
  const next = plans.map((plan) => {
    const orderStatus = orderStatusById.get(plan.orderId)
    if (!shouldPromoteToConfirmationQueue(plan, todayIso, orderStatus)) return plan
    changed = true
    return {
      ...plan,
      status: SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM,
      updatedAt: new Date().toISOString(),
    }
  })
  return changed ? next : plans
}

/**
 * @param {import('../../state/shipmentPlanStore.js').ShipmentPlan[]} plans
 */
export function countPendingDeliveryConfirmations(plans) {
  return plans.filter((p) => p.status === SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM).length
}

/**
 * @param {import('../../state/shipmentPlanStore.js').ShipmentPlan[]} plans
 */
export function countDelayedShipmentKpi(plans) {
  return plans.filter(
    (p) =>
      p.status === SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM ||
      p.status === SHIPMENT_PLAN_STATUS.DELIVERY_FAILED,
  ).length
}
