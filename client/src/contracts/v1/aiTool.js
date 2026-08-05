/**
 * FAZ 42 — AI Tool Engine contracts (client re-export from shared).
 */

export {
  TOOL_EXECUTION_STATUS,
  TOOL_PERMISSION,
  TOOL_CATEGORY,
  AI_TOOL_DOMAIN_EVENT,
  WORKER_TOOL_PERMISSIONS,
  isAiToolExecutionLiveEnabled,
} from '../../shared/ai-tool-engine/contracts.js'

export { AI_TOOL_CATALOG, listToolsForWorker, getToolMeta } from '../../shared/ai-tool-engine/catalog.js'

/**
 * @typedef {import('../../shared/ai-tool-engine/contracts.js').TOOL_EXECUTION_STATUS[keyof import('../../shared/ai-tool-engine/contracts.js').TOOL_EXECUTION_STATUS]} ToolExecutionStatus
 * @typedef {{
 *   id: string
 *   workerId: string
 *   workerCode: string | null
 *   toolName: string
 *   category: string
 *   permission: string
 *   approvalRequired: boolean
 *   parameters: Record<string, unknown>
 *   status: ToolExecutionStatus
 *   result: Record<string, unknown> | null
 *   orderId: string | null
 *   runId: string | null
 *   taskId: string | null
 *   managerName: string | null
 *   managerNote: string | null
 *   approvedAt: string | null
 *   rejectedAt: string | null
 *   durationMs: number | null
 *   safeMode: boolean
 *   createdAt: string
 *   updatedAt: string
 * }} AiToolExecutionDto
 * @typedef {{
 *   today: number
 *   success: number
 *   waiting: number
 *   rejected: number
 *   failed: number
 * }} AiExecutionSummaryDto
 */

export const TOOL_EXECUTION_STATUS_LABEL = /** @type {Record<string, string>} */ ({
  SUCCESS: 'Başarılı',
  FAILED: 'Başarısız',
  WAITING_APPROVAL: 'Onay Bekliyor',
  DENIED: 'Reddedildi',
  NOT_FOUND: 'Bulunamadı',
})

export const TOOL_EXECUTION_STATUS_TONE = /** @type {Record<string, string>} */ ({
  SUCCESS: 'success',
  FAILED: 'critical',
  WAITING_APPROVAL: 'warning',
  DENIED: 'critical',
  NOT_FOUND: 'muted',
})

export {}
