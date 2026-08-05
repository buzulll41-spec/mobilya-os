/** @typedef {'info' | 'warning' | 'critical'} AuditSeverity */

const OP_AUDIT_STORAGE_KEY = 'mos-operation-audit-log-v2'

/**
 * @typedef {Object} OperationAuditEntry
 * @property {string} id
 * @property {string} action
 * @property {string} actorRole
 * @property {string} actorName
 * @property {string} detail
 * @property {AuditSeverity} severity
 * @property {string} occurredAt
 * @property {{ platform: string, userAgent: string }} device
 * @property {Record<string, unknown>} [meta]
 */

/** @type {OperationAuditEntry[]} */
const auditLog = readPersistedAuditLog()

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
  const device = detectDeviceContext()
  const entry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action: input.action,
    actorRole: input.actorRole ?? 'system',
    actorName: input.actorName ?? 'Sistem',
    detail: input.detail ?? '',
    severity: input.severity ?? 'info',
    occurredAt: new Date().toISOString(),
    device,
    meta: input.meta,
  }
  auditLog.unshift(entry)
  if (auditLog.length > MAX_AUDIT) auditLog.pop()
  persistAuditLog(auditLog)
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
  persistAuditLog(auditLog)
}

function detectDeviceContext() {
  if (typeof navigator === 'undefined') {
    return {
      platform: 'unknown',
      userAgent: 'server',
    }
  }
  return {
    platform: String(navigator.platform || 'unknown'),
    userAgent: String(navigator.userAgent || 'unknown'),
  }
}

/** @returns {OperationAuditEntry[]} */
function readPersistedAuditLog() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(OP_AUDIT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry) => entry && typeof entry.id === 'string').slice(0, MAX_AUDIT)
  } catch {
    return []
  }
}

/** @param {OperationAuditEntry[]} rows */
function persistAuditLog(rows) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(OP_AUDIT_STORAGE_KEY, JSON.stringify(rows.slice(0, MAX_AUDIT)))
  } catch {
    // ignore storage errors
  }
}
