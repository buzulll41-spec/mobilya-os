import { createApiClient } from '../lib/apiClient.js'
import { authRequestHeaders } from '../lib/operationActor.js'
import {
  mapClientPlanToApiBody,
  mapShipmentPlanDtoToClient,
  sanitizeShipmentPlans,
} from '../mappers/shipment-ops/mapShipmentPlanDto.js'

/** @param {string} baseUrl */
function apiClient(baseUrl) {
  return createApiClient(baseUrl, { headers: authRequestHeaders() })
}

/**
 * @param {string} baseUrl
 * @param {{ plannedDate?: string, salesOrderId?: string }} [query]
 */
export async function fetchShipmentPlansFromApi(baseUrl, query = {}) {
  const params = new URLSearchParams()
  if (query.plannedDate) params.set('plannedDate', query.plannedDate)
  if (query.salesOrderId) params.set('salesOrderId', query.salesOrderId)
  const qs = params.toString()
  const rows = await apiClient(baseUrl).get(`/v1/shipment-plans${qs ? `?${qs}` : ''}`)
  return sanitizeShipmentPlans(rows)
}

/**
 * @param {string} baseUrl
 * @param {import('../state/shipmentPlanStore.js').ShipmentPlan} plan
 */
export async function upsertShipmentPlanInApi(baseUrl, plan) {
  const body = mapClientPlanToApiBody(plan)
  if (plan.id) {
    const raw = await apiClient(baseUrl).patch(`/v1/shipment-plans/${plan.id}`, body)
    return mapShipmentPlanDtoToClient(raw)
  }
  const raw = await apiClient(baseUrl).post('/v1/shipment-plans', body)
  return mapShipmentPlanDtoToClient(raw)
}

/**
 * @param {string} baseUrl
 * @param {import('../state/shipmentPlanStore.js').ShipmentPlan[]} plans
 */
export async function upsertShipmentPlansBatchInApi(baseUrl, plans) {
  const saved = []
  for (const plan of plans) {
    const next = await upsertShipmentPlanInApi(baseUrl, plan)
    if (next) saved.push(next)
  }
  return saved
}

/**
 * @param {string} baseUrl
 * @param {{
 *   region: string
 *   plannedDate: string
 *   vehicleName?: string
 *   crewPrimary?: string
 *   crewSecondary?: string
 *   estimatedSaving: number
 *   orders: { salesOrderId: string, plannedTime?: string }[]
 * }} body
 */
export async function createShipmentGroupInApi(baseUrl, body) {
  return apiClient(baseUrl).post('/v1/shipment-groups', body)
}

/**
 * @param {string} baseUrl
 */
export async function fetchShipmentGroupsFromApi(baseUrl) {
  const rows = await apiClient(baseUrl).get('/v1/shipment-groups')
  return Array.isArray(rows) ? rows : []
}
