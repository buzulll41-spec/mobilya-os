import { AI_EMPLOYEE_ACTIVITY } from '../../contracts/v1/aiEmployeeActivity.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../../contracts/v1/aiSalesFollowUp.js'
import { BusinessEngine } from '../../engine/businessEngine.js'
import { buildRuleBaselineForWorker, executeRealAiWorkerTask } from '../aiWorkerRunner.js'
import { listMemoriesForWorkerContext, createMemoryFromDigitalEmployeeRun } from '../memory/mockAiWorkerMemoryStore.js'
import { executeToolLocal } from '../ai-tools/mockAiToolExecutionStore.js'
import { listToolsForWorker } from '../../contracts/v1/aiTool.js'
import {
  appendAiEmployeeLlmMessage,
  beginAiEmployeeRun,
  completeAiEmployeeRun,
  setAiEmployeePhase,
} from './aiEmployeeActivityStore.js'

/** @typedef {import('../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../contracts/v1/aiWorkerRunner.js').AiWorkerRunResult} AiWorkerRunResult */
/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

const PHASE_PAUSE_MS = 120

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {string} workerId
 * @param {WorkerTask} task
 * @param {import('../contracts/v1/aiWorkerRunner.js').AiWorkerAssessmentDto | null} baseline
 * @param {import('../contracts/v1/businessEngine.js').OrderBusinessSnapshot | undefined} snap
 */
function buildLocalMockRunResult(workerId, task, baseline, snap) {
  const orderId = task.relatedEntityId ?? '—'
  /** @type {import('../contracts/v1/aiWorkerRunner.js').AiWorkerAssessmentDto} */
  const assessment = baseline ?? {
    orderId,
    customerName: snap?.customerDisplayName ?? 'Müşteri',
    phone: '',
    priority: 'NORMAL',
    score: 72,
    reasons: ['Kural tabanlı değerlendirme'],
    taskTitle: task.title,
    taskDescription: task.description ?? 'Satış takip değerlendirmesi tamamlandı.',
    eligible: true,
    recommendedAction: 'Müşteri ile iletişime geç',
    confidence: 0.78,
  }

  return {
    runId: `local-${Date.now()}`,
    workerId,
    assessment,
    providerId: 'mock-local',
    model: 'digital-employee-v1',
    promptVersion: 'faz44',
    toolCalls: [{ tool: 'getOrder', args: { orderId } }],
    toolResults: [],
    memorySummary: 'Mock digital employee run',
    usage: { promptTokens: 512, completionTokens: 196, totalTokens: 708 },
    latencyMs: 980,
    costUsd: 0,
  }
}

/**
 * @param {string} workerId
 * @param {WorkerTask} task
 * @param {AiWorkerRunResult} result
 * @param {string} runId
 */
async function processToolResults(workerId, task, result, runId) {
  const orderId = task.relatedEntityId
  const toolCalls = result.toolCalls ?? []
  const toolResults = result.toolResults ?? []
  const planned = toolCalls.length ? toolCalls : toolResults

  if (!planned.length) {
    const catalog = listToolsForWorker(workerId)
    if (catalog.length && orderId) {
      setAiEmployeePhase(workerId, AI_EMPLOYEE_ACTIVITY.SELECTING_TOOL, 'Tool seçiliyor…')
      await sleep(PHASE_PAUSE_MS)
      setAiEmployeePhase(workerId, AI_EMPLOYEE_ACTIVITY.EXECUTING_TOOL, 'getOrder çalıştırılıyor…', {
        isExecutingTool: true,
        lastTool: 'getOrder',
      })
      executeToolLocal({
        workerId,
        toolName: 'getOrder',
        orderId,
        taskId: task.id,
        runId,
        parameters: { orderId },
        skipApproval: true,
      })
      return 'getOrder'
    }
    return null
  }

  setAiEmployeePhase(workerId, AI_EMPLOYEE_ACTIVITY.SELECTING_TOOL, 'Tool seçiliyor…')
  await sleep(PHASE_PAUSE_MS)

  let lastTool = null
  for (const entry of planned) {
    const toolName = entry.tool ?? entry.toolName ?? 'unknown'
    const needsApproval = entry.status === 'WAITING_APPROVAL' || entry.requiresApproval
    if (needsApproval) {
      setAiEmployeePhase(workerId, AI_EMPLOYEE_ACTIVITY.WAITING_APPROVAL, `${toolName} onay bekliyor…`, {
        isWaiting: true,
        lastTool: toolName,
      })
      await sleep(PHASE_PAUSE_MS)
    }
    setAiEmployeePhase(workerId, AI_EMPLOYEE_ACTIVITY.EXECUTING_TOOL, `${toolName} çalıştırılıyor…`, {
      isExecutingTool: true,
      lastTool: toolName,
    })
    if (!entry.status || entry.status === 'SIMULATED') {
      executeToolLocal({
        workerId,
        toolName,
        orderId: orderId ?? undefined,
        taskId: task.id,
        runId,
        parameters: entry.args ?? entry.parameters ?? { orderId },
        skipApproval: true,
      })
    }
    lastTool = toolName
    await sleep(PHASE_PAUSE_MS)
  }
  return lastTool
}

/**
 * FAZ 44 — Full digital employee pipeline for AI Sales.
 * @param {{
 *   workerId: string
 *   task: WorkerTask
 *   orders: Order[]
 *   dtos: SalesOrderListItemDto[]
 *   todayIso: string
 * }} input
 */
export async function runDigitalEmployeeFlow(input) {
  const { workerId, task, orders, dtos, todayIso } = input
  if (workerId !== AI_SALES_FOLLOW_UP_WORKER_ID) {
    return { success: false, result: null, resultText: '', executionTimeMs: 0, assessment: null }
  }

  const startedAt = Date.now()
  const runId = `de-run-${startedAt}`
  const orderId = task.relatedEntityId ?? null

  beginAiEmployeeRun(workerId, {
    runId,
    taskId: task.id,
    orderId,
    taskTitle: task.title,
    startedAt,
  })

  try {
    setAiEmployeePhase(workerId, AI_EMPLOYEE_ACTIVITY.READING_MEMORY, 'Hafıza okunuyor…')
    await sleep(PHASE_PAUSE_MS)
    const memories = listMemoriesForWorkerContext({
      workerId,
      orderId: orderId ?? undefined,
      limit: 12,
    })
    appendAiEmployeeLlmMessage(
      workerId,
      'system',
      `Memory context (${memories.length} kayıt)\n${memories.map((m) => `- ${m.title}`).join('\n') || '(empty)'}`,
    )

    setAiEmployeePhase(workerId, AI_EMPLOYEE_ACTIVITY.ANALYZING_ORDER, 'Sipariş analiz ediliyor…')
    await sleep(PHASE_PAUSE_MS)
    const order = orderId ? orders.find((o) => o.id === orderId) : undefined
    const dto = orderId ? dtos.find((d) => d.id === orderId) : undefined
    const snap = order ? BusinessEngine.computeOrderSnapshot({ order, dto, todayIso }) : undefined
    const baseline = orderId
      ? buildRuleBaselineForWorker(workerId, orderId, orders, dtos, todayIso)
      : null

    setAiEmployeePhase(workerId, AI_EMPLOYEE_ACTIVITY.THINKING, 'LLM değerlendirmesi…')
    appendAiEmployeeLlmMessage(
      workerId,
      'user',
      `Task: ${task.title}\nOrder: ${orderId ?? '—'}\nBaseline score: ${baseline?.score ?? '—'}`,
    )

    let result = await executeRealAiWorkerTask(workerId, task, orders, dtos, todayIso, {
      executeTools: true,
    })
    if (!result) {
      result = buildLocalMockRunResult(workerId, task, baseline, snap)
    }

    appendAiEmployeeLlmMessage(
      workerId,
      'assistant',
      result.assessment?.taskDescription ?? result.assessment?.taskTitle ?? 'Değerlendirme tamamlandı.',
    )

    const lastTool = await processToolResults(workerId, task, result, runId)

    createMemoryFromDigitalEmployeeRun(workerId, result.assessment, runId)

    const executionTimeMs = Date.now() - startedAt
    const tokenUsage = normalizeTokenUsage(result)
    const resultText =
      result.assessment?.taskTitle ??
      result.assessment?.recommendedAction ??
      task.title

    completeAiEmployeeRun(workerId, {
      success: true,
      executionTimeMs,
      tokenUsage,
      lastTool,
      lastResponse: result.assessment?.taskDescription ?? resultText,
    })

    return {
      success: true,
      result,
      resultText,
      executionTimeMs,
      assessment: result.assessment,
    }
  } catch (err) {
    const executionTimeMs = Date.now() - startedAt
    const message = err instanceof Error ? err.message : 'Digital employee run failed'
    completeAiEmployeeRun(workerId, {
      success: false,
      executionTimeMs,
      error: message,
    })
    return {
      success: false,
      result: null,
      resultText: message,
      executionTimeMs,
      assessment: null,
    }
  }
}

/** @param {AiWorkerRunResult} result */
function normalizeTokenUsage(result) {
  const usage = result.usage ?? {}
  const promptTokens = usage.promptTokens ?? usage.prompt ?? 0
  const completionTokens = usage.completionTokens ?? usage.completion ?? 0
  const totalTokens = usage.totalTokens ?? usage.total ?? promptTokens + completionTokens
  if (!totalTokens) return null
  return { promptTokens, completionTokens, totalTokens }
}

export {}
