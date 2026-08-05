/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

/**
 * API wire → DomainEventDto
 * @param {unknown} row
 * @returns {DomainEventDto}
 */
export function mapDomainEventWireRow(row) {
  const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {}
  return {
    id: typeof r.id === 'string' ? r.id : '',
    type:
      typeof r.type === 'string'
        ? /** @type {DomainEventDto['type']} */ (r.type)
        : 'order.placed',
    aggregateType: typeof r.aggregateType === 'string' ? r.aggregateType : 'SalesOrder',
    aggregateId: typeof r.aggregateId === 'string' ? r.aggregateId : '',
    occurredAt: typeof r.occurredAt === 'string' ? r.occurredAt : new Date().toISOString(),
    correlationId: typeof r.correlationId === 'string' ? r.correlationId : '',
    payloadSchemaVersion: typeof r.payloadSchemaVersion === 'string' ? r.payloadSchemaVersion : '1',
    payload:
      r.payload && typeof r.payload === 'object' && !Array.isArray(r.payload)
        ? /** @type {Record<string, unknown>} */ (r.payload)
        : {},
  }
}
