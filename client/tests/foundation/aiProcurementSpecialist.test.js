import { describe, expect, it, beforeEach } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { WORKER_PRIORITY } from '../../src/contracts/v1/digitalWorker.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiProcurementSpecialist.js'
import {
  isProcurementSpecialistEligible,
  evaluateProcurementSpecialist,
  computeProcurementSpecialistRisk,
  buildProcurementSpecialistTasks,
  resolveProcurementTaskTitle,
  buildWorkerTaskFromProcurementAssessment,
} from '../../src/services/aiProcurementSpecialistService.js'
import { BusinessEngine } from '../../src/engine/businessEngine.js'
import {
  resetDigitalWorkforceStore,
  listWorkerTasks,
  syncProcurementSpecialistTasks,
  listDigitalWorkers,
  getWorkerPerformance,
  listTaskHistory,
} from '../../src/services/mockDigitalWorkforceStore.js'
import { getAllDomainEventsSnapshot, resetMockDomainEventStore } from '../../src/services/mockDomainEventStore.js'
import { buildExecutiveCommandCenterView } from '../../src/mappers/executive/executiveCommandCenterModel.js'
import { buildKanbanCard } from '../../src/mappers/operation-map/operationMapKanbanModel.js'
import { buildOrderLifecycleTimeline } from '../../src/mappers/order/orderLifecycleTimelineModel.js'
import { buildDigitalWorkforceHub } from '../../src/mappers/digital-workforce/digitalWorkforceModel.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'

describe('aiProcurementSpecialistService eligibility', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

  beforeEach(() => {
    bootstrapMockOrderLinesFromOrders(orders)
  })

  it('termin geçmiş + hiç sevk yok demo siparişi seçer', () => {
    const order = orders.find((o) => o.id === 'S-PROC-DEMO')
    const dto = dtos.find((d) => d.id === 'S-PROC-DEMO')
    expect(order).toBeTruthy()
    expect(isProcurementSpecialistEligible(order, dto, DEMO_TODAY)).toBe(true)
  })

  it('teslim edilmiş siparişi dışlar', () => {
    const order = orders.find((o) => o.id === 'S-COL-DEMO')
    const dto = dtos.find((d) => d.id === 'S-COL-DEMO')
    expect(isProcurementSpecialistEligible(order, dto, DEMO_TODAY)).toBe(false)
  })
})

describe('aiProcurementSpecialistService risk & tasks', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

  beforeEach(() => {
    bootstrapMockOrderLinesFromOrders(orders)
  })

  it('demo siparişte CRITICAL/HIGH risk üretir', () => {
    const order = orders.find((o) => o.id === 'S-PROC-DEMO')
    const dto = dtos.find((d) => d.id === 'S-PROC-DEMO')
    const snap = BusinessEngine.computeOrderSnapshot({ order, dto, todayIso: DEMO_TODAY })
    const risk = computeProcurementSpecialistRisk(order, dto, snap, DEMO_TODAY)
    expect(['HIGH', 'CRITICAL']).toContain(risk.priority)
    expect(risk.reasons).toContain('Termin geçti')
    expect(risk.reasons).toContain('Hiç sevk yapılmadı')
    expect(risk.reasons).toContain('Kısmi teslim')
  })

  it('S-24105 SSH açık senaryosunda task oluşturur', () => {
    const pairs = buildProcurementSpecialistTasks(orders, dtos, DEMO_TODAY)
    const match = pairs.find((p) => p.assessment.orderId === 'S-24105')
    expect(match).toBeTruthy()
    expect(match?.task.workerId).toBe(AI_PROCUREMENT_SPECIALIST_WORKER_ID)
    expect(match?.task.sourceModule).toBe('Procurement')
    expect(match?.task.priority).toBe(WORKER_PRIORITY.HIGH)
  })

  it('S-PROC-DEMO tedarik demo senaryosunda task oluşturur', () => {
    const pairs = buildProcurementSpecialistTasks(orders, dtos, DEMO_TODAY)
    const match = pairs.find((p) => p.assessment.orderId === 'S-PROC-DEMO')
    expect(match).toBeTruthy()
    expect(match?.task.title).toMatch(/Tedarikçi aranmalı|Termin güncellenmeli|Eksik ürün tamamlanmalı/)
  })

  it('task detayında tedarik alanları yer alır', () => {
    const order = orders.find((o) => o.id === 'S-PROC-DEMO')
    const dto = dtos.find((d) => d.id === 'S-PROC-DEMO')
    const assessment = evaluateProcurementSpecialist([order], [dto], DEMO_TODAY)[0]
    const task = buildWorkerTaskFromProcurementAssessment(
      assessment,
      `${DEMO_TODAY}T09:00:00.000Z`,
    )
    expect(task.description).toContain('Sipariş:')
    expect(task.description).toContain('Tedarikçi:')
    expect(task.description).toContain('Telefon:')
    expect(task.description).toContain('Bekleyen ürün:')
    expect(task.description).toContain('Termin:')
    expect(task.description).toContain('Depo durumu:')
    expect(task.description).toContain('SSH:')
    expect(task.description).toContain('Risk nedeni:')
    expect(
      resolveProcurementTaskTitle({
        sshOpen: false,
        terminPast: true,
        neverShipped: true,
        partialDelivery: false,
        missingProduct: false,
      }),
    ).toBe('Tedarikçi aranmalı')
  })
})

describe('aiProcurementSpecialist integrations', () => {
  beforeEach(() => {
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
  })

  it('store seed AI Procurement görevleri içerir', () => {
    const tasks = listWorkerTasks(AI_PROCUREMENT_SPECIALIST_WORKER_ID)
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks.some((t) => t.sourceModule === 'Procurement')).toBe(true)
  })

  it('syncProcurementSpecialistTasks audit event yazar', () => {
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
    syncProcurementSpecialistTasks()
    const events = getAllDomainEventsSnapshot().filter(
      (e) => e.type === DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_CREATED,
    )
    expect(events.length).toBeGreaterThan(0)
  })

  it('CEO kritik tedarik listesi AI Procurement ile beslenir', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    bootstrapMockOrderLinesFromOrders(orders)
    const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const view = buildExecutiveCommandCenterView({
      orders,
      listItemDtos: dtos,
      collectionRows: [],
      shipmentRowVMs: [],
      domainEvents: getAllDomainEventsSnapshot(),
      todayIso: DEMO_TODAY,
    })
    const procIssue = view.criticalIssues.find(
      (i) => i.id.startsWith('proc:') && i.subtitle.includes('AI Procurement Specialist'),
    )
    expect(procIssue).toBeTruthy()
  })

  it('kanban kartında 📦 etiketi gösterir', () => {
    const order = initialOrders.find((o) => o.id === 'S-PROC-DEMO')
    const dto = projectLegacyOrderToListItemDto(order, DEMO_TODAY)
    const card = buildKanbanCard(
      order,
      dto,
      DEMO_TODAY,
      new Set(),
      new Set(),
      new Set(),
      new Set(['S-PROC-DEMO']),
    )
    expect(card.badges.some((b) => b.id === 'procurement-ai' && b.icon === '📦')).toBe(true)
  })

  it('timeline AI Procurement Task Created olayı içerir', () => {
    const order = initialOrders.find((o) => o.id === 'S-PROC-DEMO')
    const dto = projectLegacyOrderToListItemDto(order, DEMO_TODAY)
    const assessment = evaluateProcurementSpecialist([order], [dto], DEMO_TODAY)[0]
    const task = buildWorkerTaskFromProcurementAssessment(
      assessment,
      `${DEMO_TODAY}T09:00:00.000Z`,
    )
    const timeline = buildOrderLifecycleTimeline(
      order,
      dto,
      [
        {
          id: 'evt-proc-ai',
          type: DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_CREATED,
          aggregateType: 'SalesOrder',
          aggregateId: order.id,
          occurredAt: task.createdAt,
          correlationId: task.id,
          payloadSchemaVersion: '1',
          payload: {
            title: 'AI Procurement Task Created',
            taskTitle: task.title,
            worker: 'AI Procurement Specialist',
            description: task.description,
          },
        },
      ],
      DEMO_TODAY,
    )
    expect(timeline.aiEvents.some((e) => e.label === 'AI Procurement Task Created')).toBe(true)
  })

  it('Digital Workforce AI Procurement kart metrikleri güncellenir', () => {
    const workers = listDigitalWorkers()
    const tasks = listWorkerTasks()
    const history = listTaskHistory()
    const performance = workers.map((w) => getWorkerPerformance(w.id))
    const hub = buildDigitalWorkforceHub(workers, tasks, performance, history)
    const card = hub.cards.find((c) => c.id === AI_PROCUREMENT_SPECIALIST_WORKER_ID)
    expect(card?.name).toBe('AI Procurement Specialist')
    expect(card?.tasksPending).toBeGreaterThan(0)
    expect(typeof card?.successRate).toBe('number')
  })
})
