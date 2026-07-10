/** FAZ 108 — Multi-Agent Collaboration contracts. */

export const COLLABORATION_MESSAGE_TYPE = {
  REQUEST_HELP: 'REQUEST_HELP',
  RISK_ALERT: 'RISK_ALERT',
  TASK_TRANSFER: 'TASK_TRANSFER',
  WAIT: 'WAIT',
  CONTINUE: 'CONTINUE',
  PRIORITY_CHANGE: 'PRIORITY_CHANGE',
  INFO: 'INFO',
} as const

export type CollaborationMessageType =
  (typeof COLLABORATION_MESSAGE_TYPE)[keyof typeof COLLABORATION_MESSAGE_TYPE]

export type WorkerCollaborationMessageDto = {
  id: string
  fromWorkerId: string
  toWorkerId: string
  fromWorkerLabel: string
  toWorkerLabel: string
  type: CollaborationMessageType
  reason: string
  orderId?: string
  status?: string
  occurredAt: string
  priority: number
}

export type CollaborationGraphEdgeDto = {
  id: string
  fromWorkerId: string
  toWorkerId: string
  messageType: CollaborationMessageType
  weight: number
}

export type WorkerCollaborationProfileDto = {
  workerId: string
  workerLabel: string
  inbox: WorkerCollaborationMessageDto[]
  outbox: WorkerCollaborationMessageDto[]
  messagesSent: number
  messagesReceived: number
  helpRequestsSent: number
  activeEffects: string[]
}

export type CollaborationFeedDto = {
  messages: WorkerCollaborationMessageDto[]
  todayCount: number
  meta: { durationMs: number }
}

export type CollaborationHistoryDto = {
  records: WorkerCollaborationMessageDto[]
  total: number
}

export type CompanyCollaborationSummaryDto = {
  feed: WorkerCollaborationMessageDto[]
  graph: CollaborationGraphEdgeDto[]
  workers: WorkerCollaborationProfileDto[]
  mostHelpRequestsWorkerId: string
  busiestTeamLabel: string
  todayMessageCount: number
  meta: { durationMs: number }
}
