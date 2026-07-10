/**
 * FAZ 44 — Digital employee live activity phases.
 */

/** @typedef {'IDLE' | 'READING_MEMORY' | 'ANALYZING_ORDER' | 'THINKING' | 'SELECTING_TOOL' | 'WAITING_APPROVAL' | 'EXECUTING_TOOL' | 'COMPLETED' | 'FAILED'} AiEmployeeActivityPhase */

export const AI_EMPLOYEE_ACTIVITY = /** @type {Record<AiEmployeeActivityPhase, AiEmployeeActivityPhase>} */ ({
  IDLE: 'IDLE',
  READING_MEMORY: 'READING_MEMORY',
  ANALYZING_ORDER: 'ANALYZING_ORDER',
  THINKING: 'THINKING',
  SELECTING_TOOL: 'SELECTING_TOOL',
  WAITING_APPROVAL: 'WAITING_APPROVAL',
  EXECUTING_TOOL: 'EXECUTING_TOOL',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
})

/** @type {AiEmployeeActivityPhase[]} */
export const AI_EMPLOYEE_ACTIVITY_ORDER = [
  AI_EMPLOYEE_ACTIVITY.IDLE,
  AI_EMPLOYEE_ACTIVITY.READING_MEMORY,
  AI_EMPLOYEE_ACTIVITY.ANALYZING_ORDER,
  AI_EMPLOYEE_ACTIVITY.THINKING,
  AI_EMPLOYEE_ACTIVITY.SELECTING_TOOL,
  AI_EMPLOYEE_ACTIVITY.WAITING_APPROVAL,
  AI_EMPLOYEE_ACTIVITY.EXECUTING_TOOL,
  AI_EMPLOYEE_ACTIVITY.COMPLETED,
  AI_EMPLOYEE_ACTIVITY.FAILED,
]

/** @type {Record<AiEmployeeActivityPhase, { label: string, tone: string, emoji: string }>} */
export const AI_EMPLOYEE_ACTIVITY_META = {
  [AI_EMPLOYEE_ACTIVITY.IDLE]: { label: 'Idle', tone: 'neutral', emoji: '⚪' },
  [AI_EMPLOYEE_ACTIVITY.READING_MEMORY]: { label: 'Reading Memory', tone: 'info', emoji: '📚' },
  [AI_EMPLOYEE_ACTIVITY.ANALYZING_ORDER]: { label: 'Analyzing Order', tone: 'info', emoji: '🔍' },
  [AI_EMPLOYEE_ACTIVITY.THINKING]: { label: 'Thinking', tone: 'info', emoji: '🔵' },
  [AI_EMPLOYEE_ACTIVITY.SELECTING_TOOL]: { label: 'Selecting Tool', tone: 'warning', emoji: '🧰' },
  [AI_EMPLOYEE_ACTIVITY.WAITING_APPROVAL]: { label: 'Waiting Approval', tone: 'warning', emoji: '⏳' },
  [AI_EMPLOYEE_ACTIVITY.EXECUTING_TOOL]: { label: 'Executing Tool', tone: 'success', emoji: '⚙️' },
  [AI_EMPLOYEE_ACTIVITY.COMPLETED]: { label: 'Completed', tone: 'success', emoji: '✅' },
  [AI_EMPLOYEE_ACTIVITY.FAILED]: { label: 'Failed', tone: 'critical', emoji: '❌' },
}

/** @param {AiEmployeeActivityPhase} phase */
export function isAiEmployeeRunActivePhase(phase) {
  return (
    phase !== AI_EMPLOYEE_ACTIVITY.IDLE &&
    phase !== AI_EMPLOYEE_ACTIVITY.COMPLETED &&
    phase !== AI_EMPLOYEE_ACTIVITY.FAILED
  )
}

export {}
