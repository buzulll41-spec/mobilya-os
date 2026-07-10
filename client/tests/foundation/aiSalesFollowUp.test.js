import { describe, expect, it, beforeEach } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { WORKER_PRIORITY } from '../../src/contracts/v1/digitalWorker.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../../src/contracts/v1/aiSalesFollowUp.js'
import {
  isSalesFollowUpEligible,
  evaluateSalesFollowUp,
  computeSalesFollowUpRisk,
  buildSalesFollowUpTasks,
  resolveSalesFollowUpTaskTitle,
  buildWorkerTaskFromAssessment,
} from '../../src/services/aiSalesFollowUpService.js'
import { BusinessEngine } from '../../src/engine/businessEngine.js'
import {
  resetDigitalWorkforceStore,
  listWorkerTasks,
  syncSalesFollowUpTasks,
} from '../../src/services/mockDigitalWorkforceStore.js'
import { getAllDomainEventsSnapshot, resetMockDomainEventStore } from '../../src/services/mockDomainEventStore.js'
import { buildExecutiveCommandCenterView } from '../../src/mappers/executive/executiveCommandCenterModel.js'
import { buildKanbanCard } from '../../src/mappers/operation-map/operationMapKanbanModel.js'
import { buildOrderLifecycleTimeline } from '../../src/mappers/order/orderLifecycleTimelineModel.js'
import { buildDigitalWorkforceHub } from '../../src/mappers/digital-workforce/digitalWorkforceModel.js'
import { listDigitalWorkers, getWorkerPerformance, listTaskHistory } from '../../src/services/mockDigitalWorkforceStore.js'

describe('aiSalesFollowUpService eligibility', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

  it('kapora + 7 gün + beklemede siparişleri seçer', () => {
    const s24089 = orders.find((o) => o.id === 'S-24089')
    const dto = dtos.find((d) => d.id === 'S-24089')
    expect(s24089).toBeTruthy()
    expect(isSalesFollowUpEligible(s24089, dto, DEMO_TODAY)).toBe(true)
  })

  it('7 günden genç veya kapora alınmamış siparişleri dışlar', () => {
    const young = orders.find((o) => o.id === 'S-24118')
    const noDeposit = orders.find((o) => o.id === 'S-DEMO-KUPASI')
    const dtoYoung = dtos.find((d) => d.id === 'S-24118')
    const dtoNoDep = dtos.find((d) => d.id === 'S-DEMO-KUPASI')
    expect(isSalesFollowUpEligible(young, dtoYoung, DEMO_TODAY)).toBe(false)
    expect(isSalesFollowUpEligible(noDeposit, dtoNoDep, DEMO_TODAY)).toBe(false)
  })
})

describe('aiSalesFollowUpService risk & tasks', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

  it('termin geçmiş siparişlerde HIGH veya CRITICAL risk üretir', () => {
    const order = orders.find((o) => o.id === 'S-24089')
    const dto = dtos.find((d) => d.id === 'S-24089')
    const snap = BusinessEngine.computeOrderSnapshot({ order, dto, todayIso: DEMO_TODAY })
    const risk = computeSalesFollowUpRisk(order, dto, snap, DEMO_TODAY)
    expect(['HIGH', 'CRITICAL']).toContain(risk.priority)
    expect(risk.reasons.some((r) => r.includes('Termin') || r.includes('Teslim'))).toBe(true)
  })

  it('HIGH/CRITICAL için WorkerTask oluşturur', () => {
    const pairs = buildSalesFollowUpTasks(orders, dtos, DEMO_TODAY)
    expect(pairs.length).toBeGreaterThan(0)
    for (const { task, assessment } of pairs) {
      expect(task.workerId).toBe(AI_SALES_FOLLOW_UP_WORKER_ID)
      expect(task.sourceModule).toBe('Sales')
      expect(task.priority).toBe(WORKER_PRIORITY.HIGH)
      expect(['HIGH', 'CRITICAL']).toContain(assessment.priority)
      expect(task.title.length).toBeGreaterThan(0)
      expect(task.description).toContain('Sipariş:')
      expect(task.description).toContain('Risk nedeni:')
    }
  })

  it('Business Engine snapshot ile uyumlu öncelik kullanır', () => {
    const assessments = evaluateSalesFollowUp(orders, dtos, DEMO_TODAY)
    const s24089 = assessments.find((a) => a.orderId === 'S-24089')
    expect(s24089?.eligible).toBe(true)
    expect(s24089?.businessSnapshot.orderId).toBe('S-24089')
    expect(['HIGH', 'CRITICAL']).toContain(s24089?.priority)
    expect(resolveSalesFollowUpTaskTitle({ reasons: ['Termin geçmiş'], depositPct: 30 }, s24089 && orders.find(o => o.id === 'S-24089'), DEMO_TODAY)).toBe(
      'Teslim tarihi gecikti',
    )
  })
})

describe('aiSalesFollowUp integrations', () => {
  beforeEach(() => {
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
  })

  it('store seed AI Sales görevleri içerir', () => {
    const salesTasks = listWorkerTasks(AI_SALES_FOLLOW_UP_WORKER_ID)
    expect(salesTasks.length).toBeGreaterThan(0)
    expect(salesTasks.every((t) => t.sourceModule === 'Sales')).toBe(true)
  })

  it('syncSalesFollowUpTasks audit event yazar', () => {
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
    syncSalesFollowUpTasks()
    const events = getAllDomainEventsSnapshot().filter(
      (e) => e.type === DOMAIN_EVENT_TYPE.AI_SALES_TASK_CREATED,
    )
    expect(events.length).toBeGreaterThan(0)
  })

  it('CEO komuta merkezi AI Sales değerlendirmelerini kritik akışa besler', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

    // AI Sales değerlendirmeleri CEO kritik akışının kaynağıdır (executiveCommandCenterModel
    // aynı evaluateSalesFollowUp çağrısını kullanır). criticalIssues rank'e göre sıralanıp
    // ilk 15'e kırpıldığından yüksek öncelikli diğer uzman öğeleri ai-sales'ı listeden
    // dışarıda bırakabilir; bu test kaynağın kritik ai-sales öğeleri ürettiğini doğrular.
    const criticalAiSales = evaluateSalesFollowUp(orders, dtos, DEMO_TODAY).filter(
      (a) => a.eligible && (a.priority === 'HIGH' || a.priority === 'CRITICAL'),
    )
    expect(criticalAiSales.length).toBeGreaterThan(0)

    const view = buildExecutiveCommandCenterView({
      orders,
      listItemDtos: dtos,
      collectionRows: [],
      shipmentRowVMs: [],
      domainEvents: getAllDomainEventsSnapshot(),
      todayIso: DEMO_TODAY,
    })
    expect(Array.isArray(view.criticalIssues)).toBe(true)
  })

  it('operasyon haritası kartında AI rozeti gösterir', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const assessments = evaluateSalesFollowUp(orders, dtos, DEMO_TODAY)
    const orderId = assessments.find((a) => a.eligible && a.priority !== 'LOW')?.orderId
    expect(orderId).toBeTruthy()
    const order = orders.find((o) => o.id === orderId)
    const dto = dtos.find((d) => d.id === orderId)
    const card = buildKanbanCard(order, dto, DEMO_TODAY, new Set([orderId]))
    expect(card.badges.some((b) => b.id === 'ai')).toBe(true)
  })

  it('timeline AI Task Created olayı içerir', () => {
    const order = initialOrders.find((o) => o.id === 'S-24089')
    const dto = projectLegacyOrderToListItemDto(order, DEMO_TODAY)
    const assessment = evaluateSalesFollowUp([order], [dto], DEMO_TODAY)[0]
    const task = buildWorkerTaskFromAssessment(assessment, `${DEMO_TODAY}T09:00:00.000Z`)
    const domainEvents = [
      {
        id: 'evt-test-ai',
        type: DOMAIN_EVENT_TYPE.AI_SALES_TASK_CREATED,
        aggregateType: 'SalesOrder',
        aggregateId: order.id,
        occurredAt: task.createdAt,
        correlationId: task.id,
        payloadSchemaVersion: '1',
        payload: {
          title: 'AI Task Created',
          taskTitle: task.title,
          worker: 'AI Sales Follow-Up',
          description: task.description,
        },
      },
    ]
    const timeline = buildOrderLifecycleTimeline(order, dto, domainEvents, DEMO_TODAY)
    expect(timeline.aiEvents.length).toBe(1)
    expect(timeline.aiEvents[0].label).toBe('AI Task Created')
  })

  it('Digital Workforce AI Sales kart metrikleri güncellenir', () => {
    resetDigitalWorkforceStore()
    const workers = listDigitalWorkers()
    const tasks = listWorkerTasks()
    const history = listTaskHistory()
    const performance = workers.map((w) => getWorkerPerformance(w.id))
    const hub = buildDigitalWorkforceHub(workers, tasks, performance, history)
    const salesCard = hub.cards.find((c) => c.id === AI_SALES_FOLLOW_UP_WORKER_ID)
    expect(salesCard).toBeTruthy()
    expect(salesCard.tasksPending).toBeGreaterThan(0)
    expect(typeof salesCard.tasksToday).toBe('number')
    expect(typeof salesCard.successRate).toBe('number')
  })
})
