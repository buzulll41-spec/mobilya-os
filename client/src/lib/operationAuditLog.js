/** @typedef {'info' | 'warning' | 'critical'} AuditSeverity */

/**
 * @typedef {Object} OperationAuditEntry
 * @property {string} id
 * @property {string} action
 * @property {string} actorRole
 * @property {string} actorName
 * @property {string} detail
 * @property {AuditSeverity} severity
 * @property {string} occurredAt
 * @property {Record<string, unknown>} [meta]
 */

/** @type {OperationAuditEntry[]} */
const auditLog = []

const MAX_AUDIT = 500

/**
 * @param {{
 *   action: string
 *   actorRole?: string
 *   actorName?: string
 *   detail?: string
 *   severity?: AuditSeverity
 *   meta?: Record<string, unknown>
 * }} input
 */
export function recordOperationAudit(input) {
  const entry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action: input.action,
    actorRole: input.actorRole ?? 'system',
    actorName: input.actorName ?? 'Sistem',
    detail: input.detail ?? '',
    severity: input.severity ?? 'info',
    occurredAt: new Date().toISOString(),
    meta: input.meta,
  }
  auditLog.unshift(entry)
  if (auditLog.length > MAX_AUDIT) auditLog.pop()
  if (typeof globalThis !== 'undefined' && globalThis.dispatchEvent) {
    globalThis.dispatchEvent(new CustomEvent('mobilya:operation-audit', { detail: entry }))
  }
  return entry
}

/** @param {number} [limit] */
export function listOperationAudit(limit = 50) {
  return auditLog.slice(0, limit)
}

export function clearOperationAuditForTests() {
  auditLog.length = 0
}
