/**
 * @typedef {import('./missingItemStatuses.js').MissingItemStatus} MissingItemStatus
 *
 * @typedef {Object} MissingItemDto
 * @property {string} id
 * @property {string} orderId
 * @property {string | null} lineId
 * @property {string} title
 * @property {string} quantity
 * @property {string} reason
 * @property {MissingItemStatus} status
 * @property {string | null} supplierNote
 * @property {string} createdAt ISO instant
 * @property {string | null} resolvedAt ISO instant | null
 */

export {}
