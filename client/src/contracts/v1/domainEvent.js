/**
 * @typedef {import('./domainEventTypes.js').DomainEventTypeWire} DomainEventTypeWire
 *
 * @typedef {Object} DomainEventDto
 * @property {string} id
 * @property {DomainEventTypeWire} type
 * @property {string} aggregateType Örn. SalesOrder
 * @property {string} aggregateId salesOrderId
 * @property {string} occurredAt ISO-8601 instant
 * @property {string} correlationId
 * @property {string} [causationId]
 * @property {string} payloadSchemaVersion
 * @property {Record<string, unknown>} payload
 */

export {}
