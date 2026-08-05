/**
 * Operasyon Orkestrasyon Merkezi — Vaka DTO'ları (backend `operationCaseDto.ts` ile eş).
 * Vakalar Faz 8 görevlerinin (ActionDto) deterministik gruplanmasıyla üretilir.
 * Durum/sahip/timeline yönetimi ilk sürümde in-memory.
 *
 * @typedef {'OPEN'|'ASSIGNED'|'IN_PROGRESS'|'WAITING'|'RESOLVED'|'CLOSED'} CaseStatus
 * @typedef {'P1'|'P2'|'P3'|'P4'|'P5'} CasePriority
 *
 * @typedef {Object} CaseTimelineEventDto
 * @property {string} at
 * @property {string} type
 * @property {string} message
 * @property {string|null} [actor]
 *
 * @typedef {Object} OperationCaseDto
 * @property {string} id
 * @property {string} caseNumber
 * @property {CasePriority} priority
 * @property {CaseStatus} status
 * @property {string} title
 * @property {string} description
 * @property {string|null} customerId
 * @property {string|null} customerName
 * @property {string[]} orderIds
 * @property {string[]} actionIds
 * @property {string|null} riskLevel
 * @property {string|null} ownerUserId
 * @property {string|null} ownerRole
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} closedAt
 * @property {number} actionCount
 * @property {number} orderCount
 * @property {string|null} primaryOrderNumber
 *
 * @typedef {Object} CaseRelatedOrderDto
 * @property {string} orderId
 * @property {string|null} orderNumber
 * @property {string|null} customerName
 *
 * @typedef {Object} OperationCaseDetailDto
 * @property {OperationCaseDto} case
 * @property {import('./actionCenter.js').ActionDto[]} relatedActions
 * @property {CaseTimelineEventDto[]} timeline
 * @property {CaseRelatedOrderDto[]} relatedOrders
 * @property {string[]} notes
 *
 * @typedef {Object} OperationCasesSummaryDto
 * @property {number} openCases
 * @property {number} p1Cases
 * @property {number} unassigned
 * @property {number} waiting
 * @property {number} resolved
 * @property {number} avgResolutionHours
 *
 * @typedef {Object} OperationCasesResponseDto
 * @property {OperationCasesSummaryDto} summary
 * @property {OperationCaseDto[]} cases
 * @property {Object} filters
 * @property {string} currency
 * @property {string} today
 * @property {string} generatedAt
 */

export const CASE_PRIORITIES = ['P1', 'P2', 'P3', 'P4', 'P5']
export const CASE_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']

export {}
