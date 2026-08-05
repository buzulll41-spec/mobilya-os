import { describe, expect, it, beforeEach } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { WORKER_PRIORITY } from '../../src/contracts/v1/digitalWorker.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiShipmentSpecialist.js'
import {
  isShipmentSpecialistEligible,
  evaluateShipmentSpecialist,
  computeShipmentSpecialistRisk,
  buildShipmentSpecialistTasks,
  resolveShipmentTaskTitle,
  buildWorkerTaskFromShipmentAssessment,
} from '../../src/services/aiShipmentSpecialistService.js'
import { BusinessEngine } from '../../src/engine/businessEngine.js'
import {
  resetDigitalWorkforceStore,
  listWorkerTasks,
  syncShipmentSpecialistTasks,
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

describe('aiShipmentSpecialistService eligibility', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

  beforeEach(() => {
    bootstrapMockOrderLinesFromOrders(orders)
  })

  it('termin geçmiş + sevk planı yok demo siparişi seçer', () => {
    const order = orders.find((o) => o.id === 'S-SHIP-DEMO')
    const dto = dtos.find((d) => d.id === 'S-SHIP-DEMO')
    expect(order).toBeTruthy()
    expect(isShipmentSpecialistEligible(order, dto, DEMO_TODAY)).toBe(true)
  })

  it('teslim edilmiş siparişi dışlar', () => {
    const order = orders.find((o) => o.id === 'S-COL-DEMO')
    const dto = dtos.find((d) => d.id === 'S-COL-DEMO')
    expect(isShipmentSpecialistEligible(order, dto, DEMO_TODAY)).toBe(false)
  })
})

describe('aiShipmentSpecialistService risk & tasks', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

  beforeEach(() => {
    bootstrapMockOrderLinesFromOrders(orders)
  })

  it('demo siparişte CRITICAL/HIGH risk üretir', () => {
    const order = orders.find((o) => o.id === 'S-SHIP-DEMO')
    const dto = dtos.find((d) => d.id === 'S-SHIP-DEMO')
    const snap = BusinessEngine.computeOrderSnapshot({ order, dto, todayIso: DEMO_TODAY })
    const risk = computeShipmentSpecialistRisk(order, dto, snap, DEMO_TODAY)
    expect(['HIGH', 'CRITICAL']).toContain(risk.priority)
    expect(risk.reasons).toContain('Teslim tarihi geçmiş')
    expect(risk.reasons).toContain('Sevk planı yok')
    expect(risk.reasons).toContain('Ürün depoya tam girmemiş')
  })

  it('S-24105 SSH açık senaryosunda task oluşturur', () => {
    const pairs = buildShipmentSpecialistTasks(orders, dtos, DEMO_TODAY)
    const match = pairs.find((p) => p.assessment.orderId === 'S-24105')
    expect(match).toBeTruthy()
    expect(match?.task.workerId).toBe(AI_SHIPMENT_SPECIALIST_WORKER_ID)
    expect(match?.task.sourceModule).toBe('Shipment')
    expect(match?.task.priority).toBe(WORKER_PRIORITY.HIGH)
  })

  it('S-SHIP-DEMO planlanmamış sevk senaryosunda task oluşturur', () => {
    const pairs = buildShipmentSpecialistTasks(orders, dtos, DEMO_TODAY)
    const match = pairs.find((p) => p.assessment.orderId === 'S-SHIP-DEMO')
    expect(match).toBeTruthy()
    expect(match?.task.title).toMatch(/Sevk planlanmalı|Teslim tarihi gecikti|Ürün eksik/)
  })

  it('task detayında sevk alanları yer alır', () => {
    const order = orders.find((o) => o.id === 'S-SHIP-DEMO')
    const dto = dtos.find((d) => d.id === 'S-SHIP-DEMO')
    const assessment = evaluateShipmentSpecialist([order], [dto], DEMO_TODAY)[0]
    const task = buildWorkerTaskFromShipmentAssessment(
      assessment,
      `${DEMO_TODAY}T09:00:00.000Z`,
    )
    expect(task.description).toContain('Sipariş:')
    expect(task.description).toContain('Müşteri:')
    expect(task.description).toContain('Telefon:')
    expect(task.description).toContain('Teslim tarihi:')
    expect(task.description).toContain('Planlanan sevk:')
    expect(task.description).toContain('Depo durumu:')
    expect(task.description).toContain('SSH durumu:')
    expect(task.description).toContain('Risk nedeni:')
    expect(
      resolveShipmentTaskTitle(
        { sshOpen: false, terminPast: true, hasShipmentPlan: false, warehouseIncomplete: true },
        order,
        dto,
      ),
    ).toMatch(/Teslim tarihi gecikti|Sevk planlanmalı|Ürün eksik/)
  })
})

describe('aiShipmentSpecialist integrations', () => {
  beforeEach(() => {
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
  })

  it('store seed AI Shipment görevleri içerir', () => {
    const tasks = listWorkerTasks(AI_SHIPMENT_SPECIALIST_WORKER_ID)
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks.some((t) => t.sourceModule === 'Shipment')).toBe(true)
  })

  it('syncShipmentSpecialistTasks audit event yazar', () => {
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
    syncShipmentSpecialistTasks()
    const events = getAllDomainEventsSnapshot().filter(
      (e) => e.type === DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_CREATED,
    )
    expect(events.length).toBeGreaterThan(0)
  })

  it('CEO kritik sevk listesi AI Shipment ile beslenir', () => {
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
    const shipIssue = view.criticalIssues.find(
      (i) => i.id.startsWith('ship:') && i.subtitle.includes('AI Shipment Specialist'),
    )
    expect(shipIssue).toBeTruthy()
  })

  it('kanban kartında Sevk Riski rozeti gösterir', () => {
    const order = initialOrders.find((o) => o.id === 'S-SHIP-DEMO')
    const dto = projectLegacyOrderToListItemDto(order, DEMO_TODAY)
    const card = buildKanbanCard(
      order,
      dto,
      DEMO_TODAY,
      new Set(),
      new Set(),
      new Set(['S-SHIP-DEMO']),
    )
    expect(card.badges.some((b) => b.id === 'shipment-ai' && b.label === 'Sevk Riski')).toBe(true)
  })

  it('timeline AI Shipment Task Created olayı içerir', () => {
    const order = initialOrders.find((o) => o.id === 'S-SHIP-DEMO')
    const dto = projectLegacyOrderToListItemDto(order, DEMO_TODAY)
    const assessment = evaluateShipmentSpecialist([order], [dto], DEMO_TODAY)[0]
    const task = buildWorkerTaskFromShipmentAssessment(
      assessment,
      `${DEMO_TODAY}T09:00:00.000Z`,
    )
    const timeline = buildOrderLifecycleTimeline(
      order,
      dto,
      [
        {
          id: 'evt-ship-ai',
          type: DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_CREATED,
          aggregateType: 'SalesOrder',
          aggregateId: order.id,
          occurredAt: task.createdAt,
          correlationId: task.id,
          payloadSchemaVersion: '1',
          payload: {
            title: 'AI Shipment Task Created',
            taskTitle: task.title,
            worker: 'AI Shipment Specialist',
            description: task.description,
          },
        },
      ],
      DEMO_TODAY,
    )
    expect(timeline.aiEvents.some((e) => e.label === 'AI Shipment Task Created')).toBe(true)
  })

  it('Digital Workforce AI Shipment kart metrikleri güncellenir', () => {
    const workers = listDigitalWorkers()
    const tasks = listWorkerTasks()
    const history = listTaskHistory()
    const performance = workers.map((w) => getWorkerPerformance(w.id))
    const hub = buildDigitalWorkforceHub(workers, tasks, performance, history)
    const card = hub.cards.find((c) => c.id === AI_SHIPMENT_SPECIALIST_WORKER_ID)
    expect(card?.name).toBe('AI Shipment Specialist')
    expect(card?.tasksPending).toBeGreaterThan(0)
    expect(typeof card?.successRate).toBe('number')
  })
})
