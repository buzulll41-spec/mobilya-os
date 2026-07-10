/** @typedef {import('../contracts/v1/auditEvent.js').AuditEventDto} AuditEventDto */

/** @type {AuditEventDto[]} */
let memoryAuditEvents = []

export function resetMockAuditEventStore() {
  memoryAuditEvents = []
}

/** @returns {AuditEventDto[]} */
export function getAllAuditEventsSnapshot() {
  return memoryAuditEvents.map((a) => ({ ...a, diff: a.diff ? { ...a.diff } : null }))
}
