import { describe, expect, it, beforeEach } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { AI_EMPLOYEE_ACTIVITY } from '../../src/contracts/v1/aiEmployeeActivity.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../../src/contracts/v1/aiSalesFollowUp.js'
import { DIGITAL_WORKFORCE_FUTURE_TABS } from '../../src/mappers/digital-workforce/digitalWorkforceModel.js'
import {
  buildAiActivityPanelRows,
  buildCeoLiveAiView,
  enrichCardWithEmployeeActivity,
} from '../../src/mappers/digital-workforce/aiEmployeeActivityModel.js'
import { runDigitalEmployeeFlow } from '../../src/services/ai-employee/digitalEmployeeRunner.js'
import {
  beginAiEmployeeRun,
  completeAiEmployeeRun,
  getAiEmployeeRunState,
  resetAiEmployeeActivityStore,
  setAiEmployeePhase,
} from '../../src/services/ai-employee/aiEmployeeActivityStore.js'
import {
  bootstrapAiWorkerMemoryStore,
  resetMockAiWorkerMemoryStore,
  setMemoryInfrastructureReadyForTests,
} from '../../src/services/memory/mockAiWorkerMemoryStore.js'
import { resetMockAiToolExecutionStore } from '../../src/services/ai-tools/mockAiToolExecutionStore.js'
import { isDigitalEmployeeEnabled } from '../../src/config/digitalEmployeeConfig.js'

describe('aiEmployeeActivity contracts', () => {
  it('FAZ 44 activity fazları tanımlı', () => {
    expect(AI_EMPLOYEE_ACTIVITY.READING_MEMORY).toBe('READING_MEMORY')
    expect(AI_EMPLOYEE_ACTIVITY.THINKING).toBe('THINKING')
    expect(AI_EMPLOYEE_ACTIVITY.WAITING_APPROVAL).toBe('WAITING_APPROVAL')
    expect(AI_EMPLOYEE_ACTIVITY.COMPLETED).toBe('COMPLETED')
  })

  it('drawer sekmeleri FAZ 44', () => {
    const ids = DIGITAL_WORKFORCE_FUTURE_TABS.map((t) => t.id)
    expect(ids).toEqual([
      'overview',
      'tasks',
      'memory',
      'tool-history',
      'live-activity',
      'llm-conversation',
    ])
  })
})

describe('digital employee run flow', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos

  beforeEach(() => {
    resetAiEmployeeActivityStore()
    resetMockAiToolExecutionStore()
    resetMockAiWorkerMemoryStore()
    bootstrapAiWorkerMemoryStore()
    setMemoryInfrastructureReadyForTests(true)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  it('digital employee enabled by default', () => {
    expect(isDigitalEmployeeEnabled()).toBe(true)
  })

  it('runDigitalEmployeeFlow tam akış COMPLETED', async () => {
    const orderId = orders[0].id
    const task = {
      id: 'wt-test-sales',
      workerId: AI_SALES_FOLLOW_UP_WORKER_ID,
      title: 'Test satış takibi',
      description: 'FAZ 44 test',
      relatedEntityId: orderId,
    }

    const run = await runDigitalEmployeeFlow({
      workerId: AI_SALES_FOLLOW_UP_WORKER_ID,
      task,
      orders,
      dtos,
      todayIso: DEMO_TODAY,
    })

    expect(run.success).toBe(true)
    expect(run.assessment?.orderId).toBe(orderId)
    expect(run.executionTimeMs).toBeGreaterThan(0)

    const state = getAiEmployeeRunState(AI_SALES_FOLLOW_UP_WORKER_ID)
    expect(state?.phase).toBe(AI_EMPLOYEE_ACTIVITY.COMPLETED)
    expect(state?.tokenUsage?.totalTokens).toBeGreaterThan(0)
    expect(state?.llmConversation.length).toBeGreaterThan(0)
    expect(state?.activityLog.length).toBeGreaterThan(3)
  })

  it('activity store kart ve CEO VM üretir', () => {
    beginAiEmployeeRun(AI_SALES_FOLLOW_UP_WORKER_ID, {
      runId: 'run-test',
      taskId: 't1',
      orderId: 'S-001',
      taskTitle: 'Takip',
      startedAt: Date.now() - 5000,
    })
    setAiEmployeePhase(
      AI_SALES_FOLLOW_UP_WORKER_ID,
      AI_EMPLOYEE_ACTIVITY.EXECUTING_TOOL,
      'getOrder çalıştırılıyor…',
      { lastTool: 'getOrder', isExecutingTool: true },
    )
    completeAiEmployeeRun(AI_SALES_FOLLOW_UP_WORKER_ID, {
      success: true,
      executionTimeMs: 4200,
      tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      lastTool: 'getOrder',
      lastResponse: 'Müşteri ile iletişim önerildi',
    })

    const card = enrichCardWithEmployeeActivity({ id: AI_SALES_FOLLOW_UP_WORKER_ID }, AI_SALES_FOLLOW_UP_WORKER_ID)
    expect(card.employeeLastTool).toBe('getOrder')
    expect(card.employeeTokenUsageLabel).toContain('150')

    const rows = buildAiActivityPanelRows()
    const sales = rows.find((r) => r.workerId === AI_SALES_FOLLOW_UP_WORKER_ID)
    expect(sales?.statusLabel).toBe('Completed')

    const liveAi = buildCeoLiveAiView()
    expect(liveAi.workerName).toMatch(/Sales|Satış|AI/)
  })
})
