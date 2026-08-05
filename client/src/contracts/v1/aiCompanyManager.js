/**
 * FAZ 45 — AI Company Manager (Digital Operations Manager).
 */

/** Company Manager worker id (seed: dw-ceo-assistant). */
export const AI_COMPANY_MANAGER_WORKER_ID = 'dw-ceo-assistant'

/** @typedef {'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'} CompanyPriorityLevel */

/** @typedef {'RUN_SALES' | 'COLLECTION_WAIT' | 'COLLECTION_PRIORITY' | 'SHIPMENT_PRIORITY' | 'SHIPMENT_PAUSE' | 'SALES_PAUSE' | 'PROCUREMENT_STOP' | 'CREATE_TASK' | 'CANCEL_TASK' | 'REASSIGN_TASK' | 'WORKLOAD_REASSIGN' | 'WORKER_PRIORITY_SET' | 'RESUME_WORKER' | 'RISK_REDUCED' | 'CEO_NOTIFY'} CompanyManagerDecisionType */

export const COMPANY_MANAGER_DECISION = /** @type {Record<CompanyManagerDecisionType, CompanyManagerDecisionType>} */ ({
  RUN_SALES: 'RUN_SALES',
  COLLECTION_WAIT: 'COLLECTION_WAIT',
  COLLECTION_PRIORITY: 'COLLECTION_PRIORITY',
  SHIPMENT_PRIORITY: 'SHIPMENT_PRIORITY',
  SHIPMENT_PAUSE: 'SHIPMENT_PAUSE',
  SALES_PAUSE: 'SALES_PAUSE',
  PROCUREMENT_STOP: 'PROCUREMENT_STOP',
  CREATE_TASK: 'CREATE_TASK',
  CANCEL_TASK: 'CANCEL_TASK',
  REASSIGN_TASK: 'REASSIGN_TASK',
  WORKLOAD_REASSIGN: 'WORKLOAD_REASSIGN',
  WORKER_PRIORITY_SET: 'WORKER_PRIORITY_SET',
  RESUME_WORKER: 'RESUME_WORKER',
  RISK_REDUCED: 'RISK_REDUCED',
  CEO_NOTIFY: 'CEO_NOTIFY',
})

/** @type {Record<CompanyPriorityLevel, number>} */
export const COMPANY_PRIORITY_RANK = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
}

/**
 * @typedef {Object} CompanyManagerDecisionDto
 * @property {string} id
 * @property {CompanyManagerDecisionType} type
 * @property {string} message
 * @property {string} [workerId]
 * @property {string} [targetWorkerId]
 * @property {string} [taskId]
 * @property {string} [orderId]
 * @property {CompanyPriorityLevel} [priority]
 * @property {string} occurredAt
 * @property {string} [reason]
 * @property {string} [scenarioId]
 * @property {string} [goalKey]
 */

export {}
