import { getApiBaseUrl } from '../config/dataSource.js'
import { ApiClientError } from '../lib/apiClient.js'
import {
  createShipmentGroupInApi,
  fetchShipmentPlansFromApi,
  upsertShipmentPlanInApi,
  upsertShipmentPlansBatchInApi,
} from './realShipmentPlansApi.js'
import {
  loadAllShipmentPlans,
  saveShipmentPlan,
  saveShipmentPlansBatch,
} from '../state/shipmentPlanStore.js'
import { createShipmentGroup, loadAllShipmentGroups } from '../state/shipmentGroupStore.js'

/** @typedef {import('../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @param {{ plannedDate?: string, salesOrderId?: string }} [query]
 */
export async function listShipmentPlans(query) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      return await fetchShipmentPlansFromApi(base, query)
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) return []
      throw err
    }
  }
  return loadAllShipmentPlans()
}

/**
 * @param {ShipmentPlan} plan
 */
export async function upsertShipmentPlan(plan) {
  const base = getApiBaseUrl()
  if (base) {
    const saved = await upsertShipmentPlanInApi(base, plan)
    if (!saved) throw new Error('Plan kaydedilemedi')
    return saved
  }
  return saveShipmentPlan(plan)
}

/**
 * @param {ShipmentPlan[]} plans
 */
export async function upsertShipmentPlansBatch(plans) {
  const base = getApiBaseUrl()
  if (base) return upsertShipmentPlansBatchInApi(base, plans)
  return saveShipmentPlansBatch(plans)
}

/**
 * @param {Parameters<typeof createShipmentGroupInApi>[1]} body
 */
export async function createShipmentGroupRemote(body) {
  const base = getApiBaseUrl()
  if (base) return createShipmentGroupInApi(base, body)
  return createShipmentGroup({
    region: body.region,
    vehicle: body.vehicleName ?? 'Araç 1',
    crewLabel: [body.crewPrimary, body.crewSecondary].filter(Boolean).join(' + '),
    plannedDate: body.plannedDate,
    orderIds: body.orders.map((o) => o.salesOrderId),
    totalAmount: 0,
    estimatedSavings: body.estimatedSaving,
  })
}

export async function listShipmentGroupsRemote() {
  const base = getApiBaseUrl()
  if (base) {
    const { fetchShipmentGroupsFromApi } = await import('./realShipmentPlansApi.js')
    return fetchShipmentGroupsFromApi(base)
  }
  return loadAllShipmentGroups()
}
