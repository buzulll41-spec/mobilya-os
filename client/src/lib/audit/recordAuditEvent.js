import { appendDomainEvent } from '../../services/mockDomainEventStore.js'
import { AUDIT_MODULE } from '../../contracts/v1/auditModule.js'
import { buildOperationActorPayload } from '../operationActor.js'

export { AUDIT_MODULE }

/**
 * Kalıcı audit kaydı — domain event store'a append-only yazar (silme yok).
 * @param {{
 *   id: string
 *   type: string
 *   aggregateType?: string
 *   aggregateId: string
 *   correlationId: string
 *   occurredAt?: string
 *   module: import('../../contracts/v1/auditModule.js').AuditModule | string
 *   recordId: string
 *   oldValue?: string | null
 *   newValue?: string | null
 *   description?: string
 *   extraPayload?: Record<string, unknown>
 * }} input
 */
export function recordAuditEvent(input) {
  const occurredAt = input.occurredAt ?? new Date().toISOString()
  const description = input.description ?? ''
  const payload = buildOperationActorPayload(input.type, {
    audit: {
      module: input.module,
      recordId: input.recordId,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      description,
    },
    recordId: input.recordId,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    description,
    ...(input.extraPayload ?? {}),
  })

  return appendDomainEvent({
    id: input.id,
    type: input.type,
    aggregateType: input.aggregateType ?? 'SalesOrder',
    aggregateId: input.aggregateId,
    occurredAt,
    correlationId: input.correlationId,
    payloadSchemaVersion: '1',
    payload,
  })
}

/**
 * @param {import('../../contracts/v1/domainEvent.js').DomainEventDto} event
 * @returns {import('../../contracts/v1/auditModule.js').AuditModule | string}
 */
export function resolveAuditModuleFromEvent(event) {
  const audit = event.payload?.audit
  if (audit && typeof audit === 'object' && !Array.isArray(audit)) {
    const mod = /** @type {Record<string, unknown>} */ (audit).module
    if (typeof mod === 'string' && mod) return mod
  }

  const type = event.type
  if (type.startsWith('payment.') || type.startsWith('mailOrder.')) return AUDIT_MODULE.COLLECTION
  if (type.startsWith('shipment.') || type.startsWith('dispatch.') || type.startsWith('delivery.')) {
    return AUDIT_MODULE.SHIPMENT
  }
  if (type.startsWith('supply.')) return AUDIT_MODULE.SUPPLY
  if (type.startsWith('incoming_goods.')) return AUDIT_MODULE.INCOMING_GOODS
  if (type.startsWith('supplier_ledger.')) return AUDIT_MODULE.SUPPLIER_LEDGER
  if (type.startsWith('missing_item.') || type === 'installation.issue') return AUDIT_MODULE.SSH
  if (type.startsWith('product.')) return AUDIT_MODULE.PRODUCT_MASTER
  if (type.startsWith('order.')) return AUDIT_MODULE.ORDER
  if (type.startsWith('ai_sales.') || type.startsWith('sales.follow_up')) return AUDIT_MODULE.SALES
  if (type.startsWith('ai.collection.')) return AUDIT_MODULE.COLLECTION
  if (type.startsWith('ai.shipment.')) return AUDIT_MODULE.SHIPMENT
  if (type.startsWith('ai.procurement.')) return AUDIT_MODULE.SUPPLY
  if (type.startsWith('ai.tool.')) return AUDIT_MODULE.SYSTEM
  return AUDIT_MODULE.SYSTEM
}

/**
 * @param {import('../../contracts/v1/domainEvent.js').DomainEventDto} event
 */
export function extractAuditFieldsFromEvent(event) {
  const p = event.payload ?? {}
  const audit =
    p.audit && typeof p.audit === 'object' && !Array.isArray(p.audit)
      ? /** @type {Record<string, unknown>} */ (p.audit)
      : {}

  const recordId =
    (typeof audit.recordId === 'string' && audit.recordId) ||
    (typeof p.recordId === 'string' && p.recordId) ||
    (typeof p.transactionId === 'string' && p.transactionId) ||
    (typeof p.shipmentId === 'string' && p.shipmentId) ||
    (typeof p.lineId === 'string' && p.lineId) ||
    (typeof p.orderLineId === 'string' && p.orderLineId) ||
    event.aggregateId

  const oldValue =
    audit.oldValue != null
      ? String(audit.oldValue)
      : p.from != null
        ? String(p.from)
        : p.fromStatus != null
          ? String(p.fromStatus)
          : p.oldValue != null
            ? String(p.oldValue)
            : null

  const newValue =
    audit.newValue != null
      ? String(audit.newValue)
      : p.to != null
        ? String(p.to)
        : p.toStatus != null
          ? String(p.toStatus)
          : p.newValue != null
            ? String(p.newValue)
            : null

  const description =
    (typeof audit.description === 'string' && audit.description) ||
    (typeof p.description === 'string' && p.description) ||
    ''

  return {
    module: resolveAuditModuleFromEvent(event),
    recordId,
    oldValue,
    newValue,
    description,
  }
}
