import { CRITICAL_AUDIT_ACTION } from '../contracts/v1/goLive.js'
import { recordOperationAudit } from './operationAuditLog.js'

/**
 * @param {{
 *   action: string
 *   actorRole?: string
 *   actorName?: string
 *   detail?: string
 *   severity?: 'info' | 'warning' | 'critical'
 *   meta?: Record<string, unknown>
 * }} input
 */
export function recordCriticalAudit(input) {
  return recordOperationAudit(input)
}

/**
 * @param {{ role?: string, name?: string, email?: string }} user
 */
export function auditLogin(user) {
  return recordCriticalAudit({
    action: CRITICAL_AUDIT_ACTION.LOGIN,
    actorRole: user.role ?? 'unknown',
    actorName: user.name ?? user.email ?? 'Kullanıcı',
    detail: 'Oturum açıldı',
  })
}

/**
 * @param {{ role?: string, name?: string }} [user]
 */
export function auditLogout(user) {
  return recordCriticalAudit({
    action: CRITICAL_AUDIT_ACTION.LOGOUT,
    actorRole: user?.role ?? 'unknown',
    actorName: user?.name ?? 'Kullanıcı',
    detail: 'Oturum kapatıldı',
  })
}

/**
 * @param {string} detail
 * @param {{ role?: string, name?: string, orderId?: string }} [ctx]
 */
export function auditOrderMutation(detail, ctx = {}) {
  return recordCriticalAudit({
    action: CRITICAL_AUDIT_ACTION.ORDER,
    actorRole: ctx.role,
    actorName: ctx.name,
    detail,
    meta: ctx.orderId ? { orderId: ctx.orderId } : undefined,
  })
}

/**
 * @param {string} detail
 * @param {{ role?: string, name?: string }} [ctx]
 */
export function auditCollectionMutation(detail, ctx = {}) {
  return recordCriticalAudit({
    action: CRITICAL_AUDIT_ACTION.COLLECTION,
    actorRole: ctx.role,
    actorName: ctx.name,
    detail,
  })
}

/**
 * @param {string} detail
 * @param {{ role?: string, name?: string }} [ctx]
 */
export function auditShipmentMutation(detail, ctx = {}) {
  return recordCriticalAudit({
    action: CRITICAL_AUDIT_ACTION.SHIPMENT,
    actorRole: ctx.role,
    actorName: ctx.name,
    detail,
  })
}

/**
 * @param {string} detail
 * @param {{ workerId?: string, type?: string }} [meta]
 */
export function auditAiDecision(detail, meta = {}) {
  return recordCriticalAudit({
    action: CRITICAL_AUDIT_ACTION.AI_DECISION,
    actorRole: 'AI',
    actorName: meta.workerId ?? 'AI Worker',
    detail,
    meta,
  })
}

/**
 * @param {string} detail
 * @param {{ toolId?: string, workerId?: string }} [meta]
 */
export function auditAiTool(detail, meta = {}) {
  return recordCriticalAudit({
    action: CRITICAL_AUDIT_ACTION.AI_TOOL,
    actorRole: 'AI',
    actorName: meta.workerId ?? 'Tool Engine',
    detail,
    meta,
  })
}

/**
 * @param {string} detail
 */
export function auditMemoryMutation(detail) {
  return recordCriticalAudit({
    action: CRITICAL_AUDIT_ACTION.MEMORY,
    actorRole: 'system',
    actorName: 'Memory',
    detail,
  })
}
