import { beforeEach, describe, expect, it } from 'vitest'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { buildMemoriesFromDomainEvent } from '../../src/services/memory/memoryFromDomainEvent.js'
import {
  bootstrapAiWorkerMemoryStore,
  buildCeoLearnedInsights,
  buildWorkerMemoryContextText,
  buildWorkerMemoryRowVm,
  getAllMemoriesSnapshot,
  ingestMemoryFromDomainEvent,
  isMemoryInfrastructureReady,
  listMemories,
  resetMockAiWorkerMemoryStore,
} from '../../src/services/memory/mockAiWorkerMemoryStore.js'
import { buildCeoExperienceView } from '../../src/mappers/executive/ceoExperienceModel.js'
import { buildDigitalWorkerExperienceDetailVm } from '../../src/mappers/digital-workforce/digitalWorkforceModel.js'
import { getAllDomainEventsSnapshot } from '../../src/services/mockDomainEventStore.js'
import { SEED_DIGITAL_WORKERS } from '../../src/services/mockDigitalWorkforceStore.js'

describe('AI Worker Memory — client store', () => {
  beforeEach(() => {
    resetMockAiWorkerMemoryStore(getAllDomainEventsSnapshot())
  })

  it('memory altyapısı hazır', () => {
    expect(isMemoryInfrastructureReady()).toBe(true)
  })

  it('domain event ile memory oluşturur', () => {
    const before = getAllMemoriesSnapshot().length
    ingestMemoryFromDomainEvent({
      id: 'dom-test-pay',
      type: DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
      aggregateType: 'SalesOrder',
      aggregateId: 'S-24102',
      occurredAt: '2026-05-10T10:00:00.000Z',
      correlationId: 'corr-test',
      payloadSchemaVersion: '1',
      payload: { amount: 1000 },
    })
    expect(getAllMemoriesSnapshot().length).toBeGreaterThan(before)
  })

  it('customer memory üretir', () => {
    ingestMemoryFromDomainEvent({
      id: 'dom-test-call',
      type: DOMAIN_EVENT_TYPE.AI_SALES_CALL_LOGGED,
      aggregateType: 'SalesOrder',
      aggregateId: 'S-24089',
      occurredAt: '2026-05-10T10:00:00.000Z',
      correlationId: 'corr-call',
      payloadSchemaVersion: '1',
      payload: {},
    })
    const customerMemories = listMemories().filter((m) => m.memoryType === 'CUSTOMER')
    expect(customerMemories.length).toBeGreaterThan(0)
  })

  it('supplier memory seed içerir', () => {
    const supplierMemories = listMemories().filter((m) => m.memoryType === 'SUPPLIER')
    expect(supplierMemories.some((m) => m.entityId === 'Nova Home')).toBe(true)
  })

  it('order memory S-24089 kritik kayıt içerir', () => {
    const orderMemories = listMemories().filter((m) => m.entityId === 'S-24089')
    expect(orderMemories.some((m) => m.importance === 'CRITICAL')).toBe(true)
  })

  it('worker context metni oluşturur', () => {
    const text = buildWorkerMemoryContextText({
      workerId: 'dw-sales-follow-up',
      orderId: 'S-24089',
      customerName: 'Ayşe Yılmaz',
    })
    expect(text).toContain('Ayşe Yılmaz')
  })

  it('memoryFromDomainEvent mapping', () => {
    const drafts = buildMemoriesFromDomainEvent(
      { id: 'x', type: 'missing_item.created', aggregateId: 'S-24105' },
      { customerName: 'Elif Demir', orderLabel: 'S-24105' },
    )
    expect(drafts[0]?.title).toBe('Ürün eksik geldi')
  })
})

describe('AI Worker Memory — CEO & drawer VM', () => {
  beforeEach(() => {
    bootstrapAiWorkerMemoryStore(getAllDomainEventsSnapshot())
  })

  it('CEO learned insights üretir', () => {
    const insights = buildCeoLearnedInsights(4)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0].message).toMatch(/öğrendi\./)
  })

  it('buildCeoExperienceView learnedInsights içerir', () => {
    const experience = buildCeoExperienceView({
      baseView: {
        todayIso: '2026-05-15',
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
    })
    expect(experience.learnedInsights?.length).toBeGreaterThan(0)
  })

  it('worker drawer memoryRows alanları dolu', () => {
    const worker = SEED_DIGITAL_WORKERS.find((w) => w.id === 'dw-procurement')
    expect(worker).toBeTruthy()
    const detail = buildDigitalWorkerExperienceDetailVm(worker, [], [])
    expect(detail.memoryRows.length).toBeGreaterThan(0)
    expect(buildWorkerMemoryRowVm(listMemories({ workerId: worker.id })[0]).relatedRecord).toMatch(/·/)
  })
})

describe('AI Worker Memory — real AI gate', () => {
  it('executeRealAiWorkerTask memory hazır değilse null', async () => {
    const { setMemoryInfrastructureReadyForTests } = await import(
      '../../src/services/memory/mockAiWorkerMemoryStore.js'
    )
    setMemoryInfrastructureReadyForTests(false)
    const { executeRealAiWorkerTask } = await import('../../src/services/aiWorkerRunner.js')
    const result = await executeRealAiWorkerTask(
      'dw-sales-follow-up',
      { id: 't1', relatedEntityId: 'S-24089', title: 'Test' },
      [],
      [],
      '2026-05-15',
    )
    expect(result).toBeNull()
    setMemoryInfrastructureReadyForTests(true)
  })
})
