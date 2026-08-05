import { getAuthToken, loadAuthSession } from '../services/authSessionStore.js'
import { createApiClient } from './apiClient.js'

/**
 * Authenticated kullanıcı — header/env yok.
 * @returns {import('../contracts/v1/user.js').UserDto | null}
 */
export function getCurrentAuthUser() {
  return loadAuthSession()?.user ?? null
}

/**
 * @returns {Record<string, string>}
 */
export function authRequestHeaders() {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * @param {string} baseUrl
 * @param {Parameters<typeof createApiClient>[1]} [options]
 */
export function createAuthedApiClient(baseUrl, options = {}) {
  return createApiClient(baseUrl, {
    ...options,
    headers: { ...authRequestHeaders(), ...options.headers },
  })
}

/**
 * @param {string} action
 * @param {Record<string, unknown>} [metadata]
 */
export function buildOperationActorPayload(action, metadata = {}) {
  const user = getCurrentAuthUser()
  const at = new Date().toISOString()
  if (!user) {
    return {
      ...metadata,
      printedBy: 'Anonim',
      printedAt: at,
      operationActor: {
        actorId: 'anonymous',
        actorName: 'Anonim',
        role: 'UNKNOWN',
        actor: 'Anonim',
        action,
        at,
      },
    }
  }
  return {
    ...metadata,
    operationActor: {
      actorId: user.id,
      actorName: user.fullName,
      role: user.role,
      actor: user.fullName,
      action,
      at,
    },
    printedBy: user.fullName,
    printedAt: at,
  }
}

/**
 * @param {{ source?: string }} [opts]
 */
export function contractPrintedMetadata(opts = {}) {
  return buildOperationActorPayload('sales.contract_printed', {
    source: opts.source ?? 'contract_preview',
  })
}

/**
 * @param {{
 *   vehicleName: string
 *   plannedDate: string
 *   orderIds: string[]
 *   source?: string
 * }} input
 */
export function dispatchSheetPrintedMetadata(input) {
  return buildOperationActorPayload('shipment.dispatch_sheet_printed', {
    vehicleName: input.vehicleName,
    plannedDate: input.plannedDate,
    orderIds: input.orderIds,
    source: input.source ?? 'dispatch_sheet_preview',
  })
}

/**
 * @param {{
 *   selectedDate: string
 *   healthScore: number
 *   savingsCount: number
 *   waitCount: number
 *   riskCount: number
 *   orderIds: string[]
 * }} input
 */
export function dispatchAdviceGeneratedMetadata(input) {
  return buildOperationActorPayload('dispatch.advice.generated', {
    ...input,
    generatedBy: getCurrentAuthUser()?.fullName ?? 'Anonim',
    generatedAt: new Date().toISOString(),
  })
}

/**
 * @param {{
 *   vehicleName: string
 *   plannedDate: string
 *   orderIds: string[]
 *   region: string
 *   estimatedSaving: number
 * }} input
 */
export function dispatchAutoPlannedMetadata(input) {
  return buildOperationActorPayload('dispatch.auto_planned', {
    ...input,
    plannedBy: getCurrentAuthUser()?.fullName ?? 'Anonim',
    plannedAt: new Date().toISOString(),
  })
}

/**
 * @param {{
 *   riskType: string
 *   title: string
 *   recommendation: string
 *   selectedDate: string
 * }} input
 */
export function dispatchRiskDetectedMetadata(input) {
  return buildOperationActorPayload('dispatch.risk_detected', {
    ...input,
    detectedBy: getCurrentAuthUser()?.fullName ?? 'Anonim',
    detectedAt: new Date().toISOString(),
  })
}

/** @deprecated use getCurrentAuthUser */
export function getOperationActor() {
  return getCurrentAuthUser()?.fullName ?? 'Anonim'
}

/** @deprecated */
export function setOperationActor() {
  /* no-op — actor artık auth session'dan */
}

/** @deprecated use authRequestHeaders */
export function operationActorRequestHeaders() {
  return authRequestHeaders()
}
