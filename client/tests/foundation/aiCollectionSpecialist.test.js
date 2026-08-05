import { describe, expect, it, beforeEach } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { WORKER_PRIORITY } from '../../src/contracts/v1/digitalWorker.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiCollectionSpecialist.js'
import {
  isCollectionSpecialistEligible,
  evaluateCollectionSpecialist,
  computeCollectionSpecialistRisk,
  buildCollectionSpecialistTasks,
  resolveCollectionTaskTitle,
  buildWorkerTaskFromCollectionAssessment,
} from '../../src/services/aiCollectionSpecialistService.js'
import { BusinessEngine } from '../../src/engine/businessEngine.js'
import {
  resetDigitalWorkforceStore,
  listWorkerTasks,
  syncCollectionSpecialistTasks,
  listDigitalWorkers,
  getWorkerPerformance,
  listTaskHistory,
} from '../../src/services/mockDigitalWorkforceStore.js'
import { getAllDomainEventsSnapshot, resetMockDomainEventStore } from '../../src/services/mockDomainEventStore.js'
import { buildExecutiveCommandCenterView } from '../../src/mappers/executive/executiveCommandCenterModel.js'
import { buildKanbanCard } from '../../src/mappers/operation-map/operationMapKanbanModel.js'
import { buildOrderLifecycleTimeline } from '../../src/mappers/order/orderLifecycleTimelineModel.js'
import { buildDigitalWorkforceHub } from '../../src/mappers/digital-workforce/digitalWorkforceModel.js'
import { mapListItemToCollectionRowVM } from '../../src/mappers/payment/mapListItemToCollectionRowVM.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'

describe('aiCollectionSpecialistService eligibility', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

  it('teslim edilmiş + kalan ödeme + vadesi geçmiş siparişi seçer', () => {
    const order = orders.find((o) => o.id === 'S-COL-DEMO')
    const dto = dtos.find((d) => d.id === 'S-COL-DEMO')
    expect(order).toBeTruthy()
    expect(isCollectionSpecialistEligible(order, dto, DEMO_TODAY)).toBe(true)
  })

  it('tam ödenmiş siparişi dışlar', () => {
    const order = orders.find((o) => o.id === 'S-24071')
    const dto = dtos.find((d) => d.id === 'S-24071')
    expect(isCollectionSpecialistEligible(order, dto, DEMO_TODAY)).toBe(false)
  })
})

describe('aiCollectionSpecialistService risk & tasks', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

  it('demo siparişte CRITICAL/HIGH risk üretir', () => {
    const order = orders.find((o) => o.id === 'S-COL-DEMO')
    const dto = dtos.find((d) => d.id === 'S-COL-DEMO')
    const snap = BusinessEngine.computeOrderSnapshot({ order, dto, todayIso: DEMO_TODAY })
    const risk = computeCollectionSpecialistRisk(order, dto, snap, DEMO_TODAY)
    expect(['HIGH', 'CRITICAL']).toContain(risk.priority)
    expect(risk.reasons).toContain('Teslim edilmiş · kalan ödeme')
    expect(risk.reasons).toContain('Vadesi geçmiş')
    expect(risk.reasons).toContain('30 günden eski')
  })

  it('S-24105 gecikmiş vade senaryosunda task oluşturur', () => {
    const pairs = buildCollectionSpecialistTasks(orders, dtos, DEMO_TODAY)
    const match = pairs.find((p) => p.assessment.orderId === 'S-24105')
    expect(match).toBeTruthy()
    expect(match?.task.workerId).toBe(AI_COLLECTION_SPECIALIST_WORKER_ID)
    expect(match?.task.sourceModule).toBe('Collection')
    expect(match?.task.priority).toBe(WORKER_PRIORITY.HIGH)
  })

  it('task detayında tahsilat alanları yer alır', () => {
    const order = orders.find((o) => o.id === 'S-COL-DEMO')
    const dto = dtos.find((d) => d.id === 'S-COL-DEMO')
    const assessment = evaluateCollectionSpecialist([order], [dto], DEMO_TODAY)[0]
    const task = buildWorkerTaskFromCollectionAssessment(
      assessment,
      `${DEMO_TODAY}T09:00:00.000Z`,
    )
    expect(task.description).toContain('Toplam:')
    expect(task.description).toContain('Kapora:')
    expect(task.description).toContain('Kalan:')
    expect(task.description).toContain('Vade:')
    expect(task.description).toContain('Risk nedeni:')
    expect(resolveCollectionTaskTitle({ reasons: ['Vadesi geçmiş'], deliveredOpen: true, vadePast: true }, order, dto)).toMatch(
      /Vadesi geçmiş|Tahsilat gecikti|Kalan ödeme alınmalı/,
    )
  })
})

describe('aiCollectionSpecialist integrations', () => {
  beforeEach(() => {
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
  })

  it('store seed AI Collection görevleri içerir', () => {
    const tasks = listWorkerTasks(AI_COLLECTION_SPECIALIST_WORKER_ID)
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks.some((t) => t.sourceModule === 'Collection')).toBe(true)
  })

  it('syncCollectionSpecialistTasks audit event yazar', () => {
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
    syncCollectionSpecialistTasks()
    const events = getAllDomainEventsSnapshot().filter(
      (e) => e.type === DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_CREATED,
    )
    expect(events.length).toBeGreaterThan(0)
  })

  it('CEO kritik tahsilat listesi AI Collection ile beslenir', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    bootstrapMockOrderLinesFromOrders(orders)
    const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const view = buildExecutiveCommandCenterView({
      orders,
      listItemDtos: dtos,
      collectionRows: dtos.map(mapListItemToCollectionRowVM),
      shipmentRowVMs: [],
      domainEvents: getAllDomainEventsSnapshot(),
      todayIso: DEMO_TODAY,
    })
    const collIssue = view.criticalIssues.find(
      (i) => i.id.startsWith('coll:') && i.subtitle.includes('AI Collection Specialist'),
    )
    expect(collIssue).toBeTruthy()
  })

  it('kanban kartında Tahsilat Riski rozeti gösterir', () => {
    const order = initialOrders.find((o) => o.id === 'S-COL-DEMO')
    const dto = projectLegacyOrderToListItemDto(order, DEMO_TODAY)
    const card = buildKanbanCard(order, dto, DEMO_TODAY, new Set(), new Set(['S-COL-DEMO']))
    expect(card.badges.some((b) => b.id === 'collection-ai' && b.label === 'Tahsilat Riski')).toBe(true)
  })

  it('timeline AI Collection Task Created olayı içerir', () => {
    const order = initialOrders.find((o) => o.id === 'S-COL-DEMO')
    const dto = projectLegacyOrderToListItemDto(order, DEMO_TODAY)
    const assessment = evaluateCollectionSpecialist([order], [dto], DEMO_TODAY)[0]
    const task = buildWorkerTaskFromCollectionAssessment(
      assessment,
      `${DEMO_TODAY}T09:00:00.000Z`,
    )
    const timeline = buildOrderLifecycleTimeline(
      order,
      dto,
      [
        {
          id: 'evt-coll-ai',
          type: DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_CREATED,
          aggregateType: 'SalesOrder',
          aggregateId: order.id,
          occurredAt: task.createdAt,
          correlationId: task.id,
          payloadSchemaVersion: '1',
          payload: {
            title: 'AI Collection Task Created',
            taskTitle: task.title,
            worker: 'AI Collection Specialist',
            description: task.description,
          },
        },
      ],
      DEMO_TODAY,
    )
    expect(timeline.aiEvents.some((e) => e.label === 'AI Collection Task Created')).toBe(true)
  })

  it('Digital Workforce AI Collection kart metrikleri güncellenir', () => {
    const workers = listDigitalWorkers()
    const tasks = listWorkerTasks()
    const history = listTaskHistory()
    const performance = workers.map((w) => getWorkerPerformance(w.id))
    const hub = buildDigitalWorkforceHub(workers, tasks, performance, history)
    const card = hub.cards.find((c) => c.id === AI_COLLECTION_SPECIALIST_WORKER_ID)
    expect(card?.name).toBe('AI Collection Specialist')
    expect(card?.tasksPending).toBeGreaterThan(0)
    expect(typeof card?.successRate).toBe('number')
  })
})
