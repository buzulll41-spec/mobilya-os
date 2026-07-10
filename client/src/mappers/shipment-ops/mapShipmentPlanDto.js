import { SHIPMENT_PLAN_STATUS } from '../../constants/shipmentPlanStatuses.js'

/** @typedef {import('../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @param {unknown} raw
 * @returns {ShipmentPlan | null}
 */
export function mapShipmentPlanDtoToClient(raw) {
  if (!raw || typeof raw !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (raw)
  const orderId =
    typeof r.salesOrderId === 'string'
      ? r.salesOrderId
      : typeof r.orderId === 'string'
        ? r.orderId
        : ''
  if (!orderId) return null

  return {
    id: typeof r.id === 'string' ? r.id : undefined,
    orderId,
    plannedDate: typeof r.plannedDate === 'string' ? r.plannedDate.slice(0, 10) : '',
    plannedTime: typeof r.plannedTime === 'string' ? r.plannedTime : '',
    region: typeof r.region === 'string' ? r.region : '',
    vehicle: typeof r.vehicleName === 'string' ? r.vehicleName : typeof r.vehicle === 'string' ? r.vehicle : '',
    crew1: typeof r.crewPrimary === 'string' ? r.crewPrimary : typeof r.crew1 === 'string' ? r.crew1 : '',
    crew2:
      typeof r.crewSecondary === 'string'
        ? r.crewSecondary
        : typeof r.crew2 === 'string'
          ? r.crew2
          : '',
    note: typeof r.note === 'string' ? r.note : '',
    groupId: typeof r.groupId === 'string' ? r.groupId : undefined,
    status:
      typeof r.status === 'string' && r.status.trim()
        ? r.status.trim()
        : SHIPMENT_PLAN_STATUS.PLANNED,
    updatedAt:
      typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
  }
}

/**
 * @param {ShipmentPlan} plan
 */
export function mapClientPlanToApiBody(plan) {
  return {
    salesOrderId: plan.orderId,
    plannedDate: plan.plannedDate,
    plannedTime: plan.plannedTime || undefined,
    region: plan.region || undefined,
    vehicleName: plan.vehicle || undefined,
    crewPrimary: plan.crew1 || undefined,
    crewSecondary: plan.crew2 || undefined,
    note: plan.note || undefined,
    groupId: plan.groupId ?? undefined,
    status: plan.status || SHIPMENT_PLAN_STATUS.PLANNED,
  }
}

/**
 * @param {unknown[]} rows
 * @returns {ShipmentPlan[]}
 */
export function sanitizeShipmentPlans(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map(mapShipmentPlanDtoToClient).filter((r) => r != null)
}
