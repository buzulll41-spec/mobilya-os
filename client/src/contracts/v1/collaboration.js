/** FAZ 108 — Multi-Agent Collaboration contracts. */

export const COLLABORATION_MESSAGE_TYPE = {
  REQUEST_HELP: 'REQUEST_HELP',
  RISK_ALERT: 'RISK_ALERT',
  TASK_TRANSFER: 'TASK_TRANSFER',
  WAIT: 'WAIT',
  CONTINUE: 'CONTINUE',
  PRIORITY_CHANGE: 'PRIORITY_CHANGE',
  INFO: 'INFO',
}

/**
 * @typedef {Object} WorkerCollaborationMessageDto
 * @property {string} id
 * @property {string} fromWorkerId
 * @property {string} toWorkerId
 * @property {string} fromWorkerLabel
 * @property {string} toWorkerLabel
 * @property {keyof typeof COLLABORATION_MESSAGE_TYPE} type
 * @property {string} reason
 * @property {string} [orderId]
 * @property {string} [status]
 * @property {string} occurredAt
 * @property {number} priority 1-5
 */

/**
 * @typedef {Object} CollaborationGraphEdgeDto
 * @property {string} id
 * @property {string} fromWorkerId
 * @property {string} toWorkerId
 * @property {keyof typeof COLLABORATION_MESSAGE_TYPE} messageType
 * @property {number} weight
 */

/**
 * @typedef {Object} WorkerCollaborationProfileDto
 * @property {string} workerId
 * @property {string} workerLabel
 * @property {WorkerCollaborationMessageDto[]} inbox
 * @property {WorkerCollaborationMessageDto[]} outbox
 * @property {number} messagesSent
 * @property {number} messagesReceived
 * @property {number} helpRequestsSent
 * @property {string[]} activeEffects
 */

/**
 * @typedef {Object} CollaborationFeedDto
 * @property {WorkerCollaborationMessageDto[]} messages
 * @property {number} todayCount
 * @property {{ durationMs: number }} meta
 */

/**
 * @typedef {Object} CollaborationHistoryDto
 * @property {WorkerCollaborationMessageDto[]} records
 * @property {number} total
 */

/**
 * @typedef {Object} CompanyCollaborationSummaryDto
 * @property {WorkerCollaborationMessageDto[]} feed
 * @property {CollaborationGraphEdgeDto[]} graph
 * @property {WorkerCollaborationProfileDto[]} workers
 * @property {string} mostHelpRequestsWorkerId
 * @property {string} busiestTeamLabel
 * @property {number} todayMessageCount
 * @property {{ durationMs: number }} meta
 */

export {}
