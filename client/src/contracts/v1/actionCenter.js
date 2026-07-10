/**
 * Otomatik Aksiyon Merkezi DTO'ları (backend `actionCenterDto.ts` ile eş).
 * Görevler kural tabanlı/deterministiktir; her görevin stabil bir `id`'si ve
 * sayısal `evidence` dayanağı vardır. Durum yönetimi ilk sürümde in-memory.
 *
 * @typedef {'P1'|'P2'|'P3'|'P4'|'P5'} ActionPriority
 * @typedef {'COLLECTION'|'SHIPMENT'|'DATA_QUALITY'|'SALES'|'SUPPLIER'|'OPERATIONS'|'RISK'} ActionCategory
 * @typedef {'OPEN'|'ASSIGNED'|'IN_PROGRESS'|'COMPLETED'|'DISMISSED'} ActionStatus
 *
 * @typedef {Object} ActionDto
 * @property {string} id
 * @property {ActionPriority} priority
 * @property {ActionCategory} category
 * @property {string} title
 * @property {string} reason
 * @property {string} recommendedAction
 * @property {string} assignedRole
 * @property {'order'|'orderLine'|'shipment'|'supplier'|'source'|null} relatedEntityType
 * @property {string|null} relatedEntityId
 * @property {ActionStatus} status
 * @property {Record<string, string|number|boolean|null>} evidence
 * @property {string} createdAt
 * @property {string} lastActionAt
 * @property {string} updatedAt
 * @property {string|null} [riskLabel]
 * @property {string|null} [relatedCustomer]
 * @property {string|null} [relatedOrder]
 * @property {string|null} [relatedShipment]
 *
 * @typedef {Object} ActionCenterSummaryDto
 * @property {number} totalOpen
 * @property {number} p1Count
 * @property {number} p2Count
 * @property {number} completedCount
 * @property {number} dismissedCount
 * @property {number} completionRate
 *
 * @typedef {Object} ActionCenterResponseDto
 * @property {ActionCenterSummaryDto} summary
 * @property {ActionDto[]} actions
 * @property {Object} filters
 * @property {string} currency
 * @property {string} today
 * @property {string} generatedAt
 */

export const ACTION_PRIORITIES = ['P1', 'P2', 'P3', 'P4', 'P5']
export const ACTION_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED']
export const ACTION_CATEGORIES = [
  'COLLECTION',
  'SHIPMENT',
  'DATA_QUALITY',
  'SALES',
  'SUPPLIER',
  'OPERATIONS',
  'RISK',
]

export {}
