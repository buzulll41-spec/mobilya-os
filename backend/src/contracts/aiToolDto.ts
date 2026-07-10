/**
 * FAZ 42 — AI Tool Engine contracts (backend mirror of shared/ai-tool-engine).
 */

export const TOOL_EXECUTION_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  WAITING_APPROVAL: 'WAITING_APPROVAL',
  DENIED: 'DENIED',
  NOT_FOUND: 'NOT_FOUND',
} as const

export type ToolExecutionStatus = (typeof TOOL_EXECUTION_STATUS)[keyof typeof TOOL_EXECUTION_STATUS]

export const TOOL_PERMISSION = {
  ORDER_READ: 'ORDER_READ',
  ORDER_WRITE: 'ORDER_WRITE',
  COLLECTION_READ: 'COLLECTION_READ',
  COLLECTION_WRITE: 'COLLECTION_WRITE',
  SHIPMENT_READ: 'SHIPMENT_READ',
  SHIPMENT_WRITE: 'SHIPMENT_WRITE',
  PROCUREMENT_READ: 'PROCUREMENT_READ',
  PROCUREMENT_WRITE: 'PROCUREMENT_WRITE',
  EXECUTIVE_READ: 'EXECUTIVE_READ',
  EXECUTIVE_WRITE: 'EXECUTIVE_WRITE',
} as const

export type ToolPermission = (typeof TOOL_PERMISSION)[keyof typeof TOOL_PERMISSION]

export const TOOL_CATEGORY = {
  ORDER: 'ORDER',
  COLLECTION: 'COLLECTION',
  SHIPMENT: 'SHIPMENT',
  PROCUREMENT: 'PROCUREMENT',
  CEO: 'CEO',
} as const

export type ToolCategory = (typeof TOOL_CATEGORY)[keyof typeof TOOL_CATEGORY]

export const AI_TOOL_DOMAIN_EVENT = {
  REQUESTED: 'ai.tool.requested',
  EXECUTED: 'ai.tool.executed',
  FAILED: 'ai.tool.failed',
  WAITING_APPROVAL: 'ai.tool.waiting_approval',
  APPROVED: 'ai.tool.approved',
  REJECTED: 'ai.tool.rejected',
  DENIED: 'ai.tool.denied',
} as const

export type AiToolDefinition = {
  name: string
  description: string
  category: ToolCategory
  permission: ToolPermission
  approvalRequired: boolean
  workerIds: string[]
  parameters: Record<string, unknown>
}

export type AiToolExecutionDto = {
  id: string
  workerId: string
  workerCode: string | null
  toolName: string
  category: ToolCategory
  permission: ToolPermission
  approvalRequired: boolean
  parameters: Record<string, unknown>
  status: ToolExecutionStatus
  result: Record<string, unknown> | null
  orderId: string | null
  runId: string | null
  taskId: string | null
  managerName: string | null
  managerNote: string | null
  approvedAt: string | null
  rejectedAt: string | null
  durationMs: number | null
  safeMode: boolean
  createdAt: string
  updatedAt: string
}

export type ExecuteToolRequest = {
  workerId: string
  toolName: string
  parameters: Record<string, unknown>
  orderId?: string
  runId?: string
  taskId?: string
  actorRole?: string
  skipApproval?: boolean
}

export type ExecuteToolResponse = AiToolExecutionDto

export type AiExecutionSummaryDto = {
  today: number
  success: number
  waiting: number
  rejected: number
  failed: number
}

export function isAiToolExecutionLiveEnabled(): boolean {
  return process.env.AI_TOOL_EXECUTION_ENABLED === 'true'
}

export const WORKER_TOOL_PERMISSIONS: Record<string, ToolPermission[]> = {
  'dw-sales-follow-up': [TOOL_PERMISSION.ORDER_READ, TOOL_PERMISSION.ORDER_WRITE],
  'dw-collection': [TOOL_PERMISSION.COLLECTION_READ, TOOL_PERMISSION.COLLECTION_WRITE],
  'dw-shipment': [TOOL_PERMISSION.SHIPMENT_READ, TOOL_PERMISSION.SHIPMENT_WRITE],
  'dw-procurement': [TOOL_PERMISSION.PROCUREMENT_READ, TOOL_PERMISSION.PROCUREMENT_WRITE],
  'dw-ceo-assistant': [TOOL_PERMISSION.EXECUTIVE_READ, TOOL_PERMISSION.EXECUTIVE_WRITE],
}
