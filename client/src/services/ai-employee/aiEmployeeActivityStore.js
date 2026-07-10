import {
  AI_EMPLOYEE_ACTIVITY,
  AI_EMPLOYEE_ACTIVITY_META,
  isAiEmployeeRunActivePhase,
} from '../../contracts/v1/aiEmployeeActivity.js'

/** @typedef {import('../../contracts/v1/aiEmployeeActivity.js').AiEmployeeActivityPhase} AiEmployeeActivityPhase */

/**
 * @typedef {Object} AiEmployeeTokenUsage
 * @property {number} promptTokens
 * @property {number} completionTokens
 * @property {number} totalTokens
 */

/**
 * @typedef {Object} AiEmployeeActivityLogEntry
 * @property {string} id
 * @property {AiEmployeeActivityPhase} phase
 * @property {string} message
 * @property {string} at
 */

/**
 * @typedef {Object} AiEmployeeLlmMessage
 * @property {string} id
 * @property {'system' | 'user' | 'assistant' | 'tool'} role
 * @property {string} content
 * @property {string} at
 */

/**
 * @typedef {Object} AiEmployeeRunState
 * @property {string} workerId
 * @property {AiEmployeeActivityPhase} phase
 * @property {string | null} runId
 * @property {string | null} orderId
 * @property {string | null} taskId
 * @property {string | null} taskTitle
 * @property {string} currentStep
 * @property {string | null} lastTool
 * @property {string | null} lastResponse
 * @property {AiEmployeeTokenUsage | null} tokenUsage
 * @property {number | null} executionTimeMs
 * @property {number | null} startedAt
 * @property {number | null} completedAt
 * @property {boolean} isWaiting
 * @property {boolean} isExecutingTool
 * @property {string | null} error
 * @property {AiEmployeeActivityLogEntry[]} activityLog
 * @property {AiEmployeeLlmMessage[]} llmConversation
 */

/** @returns {AiEmployeeRunState} */
function createIdleState(workerId) {
  return {
    workerId,
    phase: AI_EMPLOYEE_ACTIVITY.IDLE,
    runId: null,
    orderId: null,
    taskId: null,
    taskTitle: null,
    currentStep: 'Yeni görev bekleniyor…',
    lastTool: null,
    lastResponse: null,
    tokenUsage: null,
    executionTimeMs: null,
    startedAt: null,
    completedAt: null,
    isWaiting: false,
    isExecutingTool: false,
    error: null,
    activityLog: [],
    llmConversation: [],
  }
}

/** @type {Map<string, AiEmployeeRunState>} */
const runs = new Map()

/** @type {Set<() => void>} */
const listeners = new Set()

let version = 0

function bump() {
  version += 1
  for (const listener of listeners) listener()
}

/** @param {string} workerId */
function ensureWorker(workerId) {
  if (!runs.has(workerId)) runs.set(workerId, createIdleState(workerId))
  return runs.get(workerId)
}

/** @param {() => void} listener */
export function subscribeAiEmployeeActivity(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAiEmployeeActivityVersion() {
  return version
}

/** @param {string} [workerId] */
export function getAiEmployeeRunState(workerId) {
  if (!workerId) return null
  const state = runs.get(workerId)
  return state ? { ...state, activityLog: [...state.activityLog], llmConversation: [...state.llmConversation] } : null
}

/** @returns {Record<string, AiEmployeeRunState>} */
export function getAllAiEmployeeRunStates() {
  /** @type {Record<string, AiEmployeeRunState>} */
  const out = {}
  for (const [workerId, state] of runs.entries()) {
    out[workerId] = {
      ...state,
      activityLog: [...state.activityLog],
      llmConversation: [...state.llmConversation],
    }
  }
  return out
}

/**
 * @param {string} workerId
 * @param {{ runId: string, taskId: string, orderId: string | null, taskTitle: string, startedAt: number }} input
 */
export function beginAiEmployeeRun(workerId, input) {
  const state = ensureWorker(workerId)
  state.phase = AI_EMPLOYEE_ACTIVITY.READING_MEMORY
  state.runId = input.runId
  state.taskId = input.taskId
  state.orderId = input.orderId
  state.taskTitle = input.taskTitle
  state.startedAt = input.startedAt
  state.completedAt = null
  state.executionTimeMs = null
  state.tokenUsage = null
  state.lastTool = null
  state.lastResponse = null
  state.error = null
  state.isWaiting = false
  state.isExecutingTool = false
  state.currentStep = 'Çalışma başlatıldı'
  state.activityLog = []
  state.llmConversation = []
  appendAiEmployeeActivityLog(workerId, AI_EMPLOYEE_ACTIVITY.READING_MEMORY, 'Scheduler → Worker Queue')
  bump()
}

/**
 * @param {string} workerId
 * @param {AiEmployeeActivityPhase} phase
 * @param {string} currentStep
 * @param {{ lastTool?: string | null, lastResponse?: string | null, isWaiting?: boolean, isExecutingTool?: boolean }} [extra]
 */
export function setAiEmployeePhase(workerId, phase, currentStep, extra = {}) {
  const state = ensureWorker(workerId)
  state.phase = phase
  state.currentStep = currentStep
  if (extra.lastTool !== undefined) state.lastTool = extra.lastTool
  if (extra.lastResponse !== undefined) state.lastResponse = extra.lastResponse
  state.isWaiting = extra.isWaiting ?? phase === AI_EMPLOYEE_ACTIVITY.WAITING_APPROVAL
  state.isExecutingTool = extra.isExecutingTool ?? phase === AI_EMPLOYEE_ACTIVITY.EXECUTING_TOOL
  appendAiEmployeeActivityLog(workerId, phase, currentStep)
  bump()
}

/**
 * @param {string} workerId
 * @param {AiEmployeeActivityPhase} phase
 * @param {string} message
 */
export function appendAiEmployeeActivityLog(workerId, phase, message) {
  const state = ensureWorker(workerId)
  state.activityLog.unshift({
    id: `act-${workerId}-${state.activityLog.length}-${Date.now()}`,
    phase,
    message,
    at: new Date().toISOString(),
  })
  if (state.activityLog.length > 40) state.activityLog.length = 40
}

/**
 * @param {string} workerId
 * @param {'system' | 'user' | 'assistant' | 'tool'} role
 * @param {string} content
 */
export function appendAiEmployeeLlmMessage(workerId, role, content) {
  const state = ensureWorker(workerId)
  state.llmConversation.unshift({
    id: `llm-${workerId}-${state.llmConversation.length}-${Date.now()}`,
    role,
    content,
    at: new Date().toISOString(),
  })
  if (role === 'assistant') state.lastResponse = content.slice(0, 240)
  if (state.llmConversation.length > 30) state.llmConversation.length = 30
  bump()
}

/**
 * @param {string} workerId
 * @param {{
 *   success: boolean
 *   executionTimeMs: number
 *   tokenUsage?: AiEmployeeTokenUsage | null
 *   lastTool?: string | null
 *   lastResponse?: string | null
 *   error?: string | null
 * }} input
 */
export function completeAiEmployeeRun(workerId, input) {
  const state = ensureWorker(workerId)
  state.phase = input.success ? AI_EMPLOYEE_ACTIVITY.COMPLETED : AI_EMPLOYEE_ACTIVITY.FAILED
  state.completedAt = Date.now()
  state.executionTimeMs = input.executionTimeMs
  state.tokenUsage = input.tokenUsage ?? state.tokenUsage
  state.lastTool = input.lastTool ?? state.lastTool
  state.lastResponse = input.lastResponse ?? state.lastResponse
  state.error = input.error ?? null
  state.isWaiting = false
  state.isExecutingTool = false
  state.currentStep = input.success ? 'Görev tamamlandı' : input.error ?? 'Görev başarısız'
  appendAiEmployeeActivityLog(workerId, state.phase, state.currentStep)
  bump()
}

/** @param {string} workerId */
export function resetAiEmployeeRunState(workerId) {
  runs.set(workerId, createIdleState(workerId))
  bump()
}

export function resetAiEmployeeActivityStore() {
  runs.clear()
  version = 0
}

/** @param {AiEmployeeRunState | null | undefined} state */
export function isAiEmployeeRunActive(state) {
  return Boolean(state && isAiEmployeeRunActivePhase(state.phase))
}

/** @param {AiEmployeeActivityPhase} phase */
export function resolveAiEmployeeActivityMeta(phase) {
  return AI_EMPLOYEE_ACTIVITY_META[phase] ?? AI_EMPLOYEE_ACTIVITY_META[AI_EMPLOYEE_ACTIVITY.IDLE]
}

/** @param {number | null | undefined} ms */
export function formatAiEmployeeExecutionTime(ms) {
  if (!ms || ms <= 0) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

/** @param {number | null | undefined} startedAt */
export function formatAiEmployeeElapsedSeconds(startedAt) {
  if (!startedAt) return 0
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
}

export {}
