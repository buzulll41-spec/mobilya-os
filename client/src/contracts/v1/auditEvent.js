/**
 * @typedef {'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'COMMENT'} AuditAction
 * @typedef {'USER' | 'SYSTEM' | 'INTEGRATION'} AuditActorType
 *
 * @typedef {Object} AuditEventDto
 * @property {string} id
 * @property {string} entityType Örn. SalesOrder
 * @property {string} entityId
 * @property {AuditAction} action
 * @property {AuditActorType} actorType
 * @property {string | null} actorId
 * @property {string} occurredAt ISO-8601 instant
 * @property {Record<string, unknown> | null} [diff]
 */

export {}
