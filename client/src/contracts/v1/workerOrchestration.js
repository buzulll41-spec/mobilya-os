/**
 * FAZ 30 — Digital Employee Orchestration contracts.
 */

/** @typedef {'SALES' | 'SHIPMENT' | 'COLLECTION' | 'PROCUREMENT' | 'CHAIN_COMPLETE'} OrchestrationPipelineStage */

/** Kullanıcı tanımlı operasyon zinciri: Sales → Shipment → Collection → Procurement */
export const WORKER_PIPELINE_ORDER = /** @type {const} */ ([
  'dw-sales-follow-up',
  'dw-shipment',
  'dw-collection',
  'dw-procurement',
])

/** @type {Record<string, OrchestrationPipelineStage>} */
export const WORKER_PIPELINE_STAGE = {
  'dw-sales-follow-up': 'SALES',
  'dw-shipment': 'SHIPMENT',
  'dw-collection': 'COLLECTION',
  'dw-procurement': 'PROCUREMENT',
}

/** @type {Record<string, string>} */
export const WORKER_DISPLAY_NAMES = {
  'dw-sales-follow-up': 'AI Sales',
  'dw-shipment': 'AI Shipment',
  'dw-collection': 'AI Collection',
  'dw-procurement': 'AI Procurement',
}

/**
 * @typedef {Object} OrchestrationHistoryEntry
 * @property {string} id
 * @property {string} taskId
 * @property {string} orderId
 * @property {string} fromWorkerId
 * @property {string | null} toWorkerId
 * @property {string | null} routedTaskId
 * @property {OrchestrationPipelineStage} pipelineStage
 * @property {string} chainId
 * @property {number} durationMs
 * @property {number} durationSeconds
 * @property {string} durationLabel
 * @property {string} outcome
 * @property {string} taskTitle
 * @property {string} finishedAt ISO instant
 *
 * @typedef {Object} CeoOrchestrationTimelineItem
 * @property {string} id
 * @property {string} timeLabel e.g. "14:20"
 * @property {string} workerLabel e.g. "AI Sales"
 * @property {string} workerId
 * @property {string} message
 * @property {string} orderId
 * @property {string} occurredAt ISO instant
 * @property {'worker' | 'chain'} kind
 * @property {string} [tone]
 */

export {}
