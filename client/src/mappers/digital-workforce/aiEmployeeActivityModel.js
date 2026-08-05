import {
  AI_EMPLOYEE_ACTIVITY,
  AI_EMPLOYEE_ACTIVITY_META,
} from '../../contracts/v1/aiEmployeeActivity.js'
import { WORKER_DISPLAY_NAMES } from '../../contracts/v1/workerOrchestration.js'
import { AI_SPECIALIST_WORKER_IDS } from '../digital-workforce/digitalWorkforceExperience.js'
import {
  formatAiEmployeeElapsedSeconds,
  formatAiEmployeeExecutionTime,
  getAiEmployeeRunState,
  isAiEmployeeRunActive,
  resolveAiEmployeeActivityMeta,
} from '../../services/ai-employee/aiEmployeeActivityStore.js'

/** @typedef {import('../../services/ai-employee/aiEmployeeActivityStore.js').AiEmployeeRunState} AiEmployeeRunState */

/**
 * @param {object} card
 * @param {string} workerId
 */
export function enrichCardWithEmployeeActivity(card, workerId) {
  const run = getAiEmployeeRunState(workerId)
  if (!run || run.phase === AI_EMPLOYEE_ACTIVITY.IDLE) return card

  const meta = resolveAiEmployeeActivityMeta(run.phase)
  const tokenLabel = run.tokenUsage
    ? `${run.tokenUsage.totalTokens} tok`
    : isAiEmployeeRunActive(run)
      ? '…'
      : '—'

  return {
    ...card,
    livingStatusLabel: meta.label,
    livingStatusEmoji: meta.emoji,
    livingStatusTone: meta.tone,
    livingMessage: run.currentStep,
    employeePhase: run.phase,
    employeeCurrentStep: run.currentStep,
    employeeLastTool: run.lastTool ?? '—',
    employeeLastResponse: run.lastResponse ?? '—',
    employeeTokenUsageLabel: tokenLabel,
    employeeExecutionTimeLabel: formatAiEmployeeExecutionTime(run.executionTimeMs),
    employeeElapsedSeconds: formatAiEmployeeElapsedSeconds(run.startedAt),
    employeeIsWaiting: run.isWaiting,
    employeeIsExecutingTool: run.isExecutingTool,
    isPulsing: isAiEmployeeRunActive(run),
  }
}

/** @returns {import('../../features/digital-workforce/AiActivityPanel.jsx').AiActivityRowVm[]} */
export function buildAiActivityPanelRows() {
  return AI_SPECIALIST_WORKER_IDS.map((workerId) => {
    const run = getAiEmployeeRunState(workerId) ?? {
      workerId,
      phase: AI_EMPLOYEE_ACTIVITY.IDLE,
      currentStep: 'Yeni görev bekleniyor…',
      orderId: null,
      taskTitle: null,
      lastTool: null,
      lastResponse: null,
      tokenUsage: null,
      executionTimeMs: null,
      startedAt: null,
      isWaiting: false,
      isExecutingTool: false,
      activityLog: [],
    }
    const meta = resolveAiEmployeeActivityMeta(run.phase)
    return {
      workerId,
      workerName: WORKER_DISPLAY_NAMES[workerId] ?? workerId,
      phase: run.phase,
      statusLabel: meta.label,
      statusEmoji: meta.emoji,
      tone: meta.tone,
      currentStep: run.currentStep,
      orderId: run.orderId,
      taskTitle: run.taskTitle,
      lastTool: run.lastTool,
      lastResponse: run.lastResponse,
      tokenUsageLabel: run.tokenUsage ? `${run.tokenUsage.totalTokens} tokens` : '—',
      executionTimeLabel: formatAiEmployeeExecutionTime(run.executionTimeMs),
      elapsedSeconds: formatAiEmployeeElapsedSeconds(run.startedAt),
      isActive: isAiEmployeeRunActive(run),
      isWaiting: run.isWaiting,
      isExecutingTool: run.isExecutingTool,
      activityLog: run.activityLog ?? [],
    }
  })
}

/**
 * @param {string} [workerId]
 */
export function buildDrawerLiveActivityVm(workerId) {
  const run = workerId ? getAiEmployeeRunState(workerId) : null
  if (!run) {
    return { phaseLabel: 'Idle', currentStep: '—', log: [], elapsedSeconds: 0 }
  }
  const meta = AI_EMPLOYEE_ACTIVITY_META[run.phase]
  return {
    phaseLabel: meta.label,
    currentStep: run.currentStep,
    orderId: run.orderId,
    elapsedSeconds: formatAiEmployeeElapsedSeconds(run.startedAt),
    isWaiting: run.isWaiting,
    isExecutingTool: run.isExecutingTool,
    log: run.activityLog,
  }
}

/** @param {string} [workerId] */
export function buildDrawerLlmConversationVm(workerId) {
  const run = workerId ? getAiEmployeeRunState(workerId) : null
  return run?.llmConversation ?? []
}

/** @returns {import('../../features/executive/ExecutiveLiveAi.jsx').CeoLiveAiVm | null} */
export function buildCeoLiveAiView() {
  const active = AI_SPECIALIST_WORKER_IDS.map((id) => getAiEmployeeRunState(id)).find((run) =>
    isAiEmployeeRunActive(run),
  )
  if (!active) {
    const last = AI_SPECIALIST_WORKER_IDS.map((id) => getAiEmployeeRunState(id))
      .filter(Boolean)
      .sort((a, b) => (b?.completedAt ?? 0) - (a?.completedAt ?? 0))[0]
    if (!last || last.phase === AI_EMPLOYEE_ACTIVITY.IDLE) {
      return {
        active: false,
        workerName: '—',
        workerId: null,
        phaseLabel: 'Idle',
        currentStep: 'Şu anda çalışan AI yok',
        orderId: null,
        elapsedSeconds: 0,
        isWaiting: false,
        isExecutingTool: false,
      }
    }
    const meta = resolveAiEmployeeActivityMeta(last.phase)
    return {
      active: false,
      workerName: WORKER_DISPLAY_NAMES[last.workerId] ?? last.workerId,
      workerId: last.workerId,
      phaseLabel: meta.label,
      currentStep: last.currentStep,
      orderId: last.orderId,
      elapsedSeconds: 0,
      isWaiting: false,
      isExecutingTool: false,
      lastTool: last.lastTool,
      executionTimeLabel: formatAiEmployeeExecutionTime(last.executionTimeMs),
    }
  }

  const meta = resolveAiEmployeeActivityMeta(active.phase)
  return {
    active: true,
    workerName: WORKER_DISPLAY_NAMES[active.workerId] ?? active.workerId,
    workerId: active.workerId,
    phaseLabel: meta.label,
    currentStep: active.currentStep,
    orderId: active.orderId,
    taskTitle: active.taskTitle,
    elapsedSeconds: formatAiEmployeeElapsedSeconds(active.startedAt),
    isWaiting: active.isWaiting,
    isExecutingTool: active.isExecutingTool,
    lastTool: active.lastTool,
    tokenUsageLabel: active.tokenUsage ? `${active.tokenUsage.totalTokens} tokens` : '—',
  }
}

export {}
