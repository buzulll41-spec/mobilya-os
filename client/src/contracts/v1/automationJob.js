/**
 * Operasyon Otomasyonu DTO'ları (backend `automationJobDto.ts` ile eş).
 *
 * @typedef {'CREATE_COLLECTION_CASE'|'CREATE_SHIPMENT_CASE'|'CREATE_DATA_QUALITY_CASE'|'CREATE_SOURCE_REVIEW_CASE'|'CREATE_PROFIT_REVIEW_CASE'|'CREATE_SALES_REVIEW_CASE'} AutomationJobType
 * @typedef {'CREATED'|'WAITING_APPROVAL'|'APPROVED'|'EXECUTING'|'COMPLETED'|'FAILED'|'CANCELLED'} AutomationJobStatus
 *
 * @typedef {Object} AutomationJobDto
 * @property {string} id
 * @property {AutomationJobType} jobType
 * @property {import('./actionCenter.js').ActionPriority} priority
 * @property {AutomationJobStatus} status
 * @property {string} triggerSource
 * @property {string|null} relatedCaseId
 * @property {string|null} relatedOrderId
 * @property {string} recommendedAction
 * @property {boolean} requiresApproval
 * @property {string|null} approvedBy
 * @property {string|null} executedAt
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} [title]
 * @property {string} [reason]
 * @property {string|null} [salesPerson]
 * @property {boolean} [aggregate]
 *
 * @typedef {Object} AutomationJobsSummaryDto
 * @property {number} totalJobs
 * @property {number} pendingCount
 * @property {number} waitingApprovalCount
 * @property {number} executingCount
 * @property {number} completedCount
 * @property {number} failedCount
 * @property {number} cancelledCount
 * @property {number} autoRunReadyCount
 *
 * @typedef {Object} AutomationQueueDto
 * @property {AutomationJobDto[]} pending
 * @property {AutomationJobDto[]} waitingApproval
 * @property {AutomationJobDto[]} executing
 * @property {AutomationJobDto[]} completed
 * @property {AutomationJobDto[]} failed
 *
 * @typedef {Object} AutomationJobsResponseDto
 * @property {AutomationJobsSummaryDto} summary
 * @property {AutomationJobDto[]} jobs
 * @property {AutomationQueueDto} queue
 * @property {Object} filters
 * @property {string} currency
 * @property {string} today
 * @property {string} generatedAt
 */

export {}
