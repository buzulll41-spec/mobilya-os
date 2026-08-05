import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { AI_TOOL_CATALOG, listToolsForWorker } from '../../src/contracts/v1/aiTool.js'
import {
  approveExecutionLocal,
  buildExecutionSummaryLocal,
  buildToolExecutionRowVm,
  executeToolLocal,
  listExecutionsLocal,
  rejectExecutionLocal,
  resetMockAiToolExecutionStore,
  seedDemoToolExecutions,
} from '../../src/services/ai-tools/mockAiToolExecutionStore.js'
import { buildDigitalWorkerExperienceDetailVm } from '../../src/mappers/digital-workforce/digitalWorkforceModel.js'
import { buildCeoExperienceView } from '../../src/mappers/executive/ceoExperienceModel.js'
import { getAllDomainEventsSnapshot } from '../../src/services/mockDomainEventStore.js'
import { SEED_DIGITAL_WORKERS } from '../../src/services/mockDigitalWorkforceStore.js'
import { TOOL_EXECUTION_STATUS } from '../../src/contracts/v1/aiTool.js'

describe('AI Tool Engine — shared catalog', () => {
  it('19 tool tanımlı', () => {
    expect(AI_TOOL_CATALOG.length).toBe(19)
  })

  it('worker tool listesi filtreler', () => {
    const tools = listToolsForWorker('dw-shipment')
    expect(tools.some((t) => t.name === 'planShipment')).toBe(true)
  })
})

describe('AI Tool Engine — client execution', () => {
  beforeEach(() => {
    resetMockAiToolExecutionStore()
    seedDemoToolExecutions()
  })

  it('getOrder SUCCESS', () => {
    const res = executeToolLocal({
      workerId: 'dw-sales-follow-up',
      toolName: 'getOrder',
      parameters: { orderId: 'S-24089' },
    })
    expect(res.status).toBe(TOOL_EXECUTION_STATUS.SUCCESS)
    expect(res.safeMode).toBe(true)
  })

  it('approval flow WAITING_APPROVAL', () => {
    const pending = executeToolLocal({
      workerId: 'dw-sales-follow-up',
      toolName: 'changePriority',
      parameters: { orderId: 'S-24089', priority: 'HIGH' },
    })
    expect(pending.status).toBe(TOOL_EXECUTION_STATUS.WAITING_APPROVAL)
    const approved = approveExecutionLocal(pending.id, 'Elçin Korkmaz')
    expect(approved?.status).toBe(TOOL_EXECUTION_STATUS.SUCCESS)
  })

  it('reject flow', () => {
    const pending = listExecutionsLocal().find((e) => e.status === TOOL_EXECUTION_STATUS.WAITING_APPROVAL)
    expect(pending).toBeTruthy()
    const rejected = rejectExecutionLocal(pending.id, 'Elçin Korkmaz', 'Uygun değil')
    expect(rejected?.rejectedAt).toBeTruthy()
  })

  it('permission DENIED', () => {
    const res = executeToolLocal({
      workerId: 'dw-shipment',
      toolName: 'getOrder',
      parameters: { orderId: 'S-24089' },
    })
    expect(res.status).toBe(TOOL_EXECUTION_STATUS.DENIED)
  })

  it('audit domain event append eder', () => {
    executeToolLocal({
      workerId: 'dw-procurement',
      toolName: 'recordSupplierNote',
      parameters: { orderId: 'S-24105', note: 'Gecikme var' },
    })
    const toolEvents = getAllDomainEventsSnapshot().filter((e) => e.type.startsWith('ai.tool.'))
    expect(toolEvents.length).toBeGreaterThan(0)
  })

  it('CEO execution summary', () => {
    const summary = buildExecutionSummaryLocal(DEMO_TODAY)
    expect(summary.today).toBeGreaterThan(0)
    expect(summary.waiting).toBeGreaterThan(0)
  })
})

describe('AI Tool Engine — UI VM', () => {
  beforeEach(() => {
    resetMockAiToolExecutionStore()
    seedDemoToolExecutions()
  })

  it('worker drawer toolExecutionRows', () => {
    const worker = SEED_DIGITAL_WORKERS.find((w) => w.id === 'dw-sales-follow-up')
    const detail = buildDigitalWorkerExperienceDetailVm(worker, [], [])
    expect(detail.toolExecutionRows.length).toBeGreaterThan(0)
    expect(buildToolExecutionRowVm(listExecutionsLocal({ workerId: worker.id })[0]).durationLabel).toMatch(/ms/)
  })

  it('CEO experience aiExecutions içerir', () => {
    const experience = buildCeoExperienceView({
      baseView: {
        todayIso: DEMO_TODAY,
        todayStatus: [],
        criticalIssues: [],
        operationTrends: {},
        staffWorkload: [],
        riskPanel: [],
        todayTasks: [],
      },
      domainEvents: getAllDomainEventsSnapshot(),
      orders: [],
      listItemDtos: [],
      todayIso: DEMO_TODAY,
    })
    expect(experience.aiExecutions?.today).toBeGreaterThan(0)
  })
})
