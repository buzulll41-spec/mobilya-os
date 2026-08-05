import { getApiBaseUrl } from '../config/dataSource.js'
import { createApiClient } from '../lib/apiClient.js'
import { authRequestHeaders } from '../lib/operationActor.js'
import { mapShipmentPlanDtoToClient } from '../mappers/shipment-ops/mapShipmentPlanDto.js'
import * as mockApi from './mockApi.js'

/** @param {string} baseUrl */
function apiClient(baseUrl) {
  return createApiClient(baseUrl, { headers: authRequestHeaders() })
}

/**
 * @param {string} planId
 * @param {{ deliveredBy: string, vehicle: string, deliveredAt: string, deliveryNote?: string, customerConfirmNote?: string }} body
 */
export async function confirmPlanDelivery(planId, body) {
  const base = getApiBaseUrl()
  if (base) {
    const raw = await apiClient(base).post(`/v1/shipment-plans/${planId}/delivery/confirm`, body)
    return { plan: mapShipmentPlanDtoToClient(raw.plan ?? raw), order: raw.order }
  }
  return mockApi.confirmPlanDelivery(planId, body)
}

/**
 * @param {string} planId
 * @param {{ reason: string, note?: string }} body
 */
export async function failPlanDelivery(planId, body) {
  const base = getApiBaseUrl()
  if (base) {
    const raw = await apiClient(base).post(`/v1/shipment-plans/${planId}/delivery/fail`, body)
    return { plan: mapShipmentPlanDtoToClient(raw.plan ?? raw), order: raw.order }
  }
  return mockApi.failPlanDelivery(planId, body)
}

/**
 * @param {string} planId
 * @param {{ newDate: string, note?: string }} body
 */
export async function postponePlanDelivery(planId, body) {
  const base = getApiBaseUrl()
  if (base) {
    const raw = await apiClient(base).post(`/v1/shipment-plans/${planId}/delivery/postpone`, body)
    return { plan: mapShipmentPlanDtoToClient(raw.plan ?? raw), order: raw.order }
  }
  return mockApi.postponePlanDelivery(planId, body)
}

/** @param {string} planId */
export async function revertPlanDelivery(planId) {
  const base = getApiBaseUrl()
  if (base) {
    const raw = await apiClient(base).post(`/v1/shipment-plans/${planId}/delivery/revert`, {})
    return { plan: mapShipmentPlanDtoToClient(raw.plan ?? raw), order: raw.order }
  }
  return mockApi.revertPlanDelivery(planId)
}
