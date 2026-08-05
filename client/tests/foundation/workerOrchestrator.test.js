import { describe, expect, it, beforeEach } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { DIGITAL_WORKER_STATUS } from '../../src/contracts/v1/digitalWorker.js'
import { WORKER_PIPELINE_ORDER } from '../../src/contracts/v1/workerOrchestration.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../../src/contracts/v1/aiSalesFollowUp.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiShipmentSpecialist.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiCollectionSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiProcurementSpecialist.js'
import {
  resolveNextWorkerInPipeline,
  buildRoutedWorkerTask,
  buildCeoTimelineMessage,
} from '../../src/engine/workerOrchestrationRules.js'
import {
  WorkerOrchestrator,
  resetWorkerOrchestrator,
  getWorkerOrchestrator,
} from '../../src/engine/workerOrchestrator.js'
import { mergeCeoOrchestrationTimeline } from '../../src/mappers/executive/ceoOrchestrationModel.js'
import { buildKanbanBoard } from '../../src/mappers/operation-map/operationMapKanbanModel.js'
import {
  resetDigitalWorkforceStore,
  enqueueWorkerTask,
  dequeueNextTask,
  peekTaskQueue,
  listWorkerTasks,
} from '../../src/services/mockDigitalWorkforceStore.js'
import { getAllDomainEventsSnapshot, resetMockDomainEventStore } from '../../src/services/mockDomainEventStore.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'

describe('workerOrchestrationRules pipeline', () => {
  it('Sales → Shipment → Collection → Procurement zinciri', () => {
    expect(resolveNextWorkerInPipeline(AI_SALES_FOLLOW_UP_WORKER_ID)).toBe(
      AI_SHIPMENT_SPECIALIST_WORKER_ID,
    )
    expect(resolveNextWorkerInPipeline(AI_SHIPMENT_SPECIALIST_WORKER_ID)).toBe(
      AI_COLLECTION_SPECIALIST_WORKER_ID,
    )
    expect(resolveNextWorkerInPipeline(AI_COLLECTION_SPECIALIST_WORKER_ID)).toBe(
      AI_PROCUREMENT_SPECIALIST_WORKER_ID,
    )
    expect(resolveNextWorkerInPipeline(AI_PROCUREMENT_SPECIALIST_WORKER_ID)).toBeNull()
    expect(WORKER_PIPELINE_ORDER).toHaveLength(4)
  })

  it('routed task üretir', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    bootstrapMockOrderLinesFromOrders(orders)
    const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const orderId = orders.find((o) => o.id.startsWith('S-'))?.id ?? orders[0].id
    const routed = buildRoutedWorkerTask(
      AI_SHIPMENT_SPECIALIST_WORKER_ID,
      orderId,
      orders,
      dtos,
      DEMO_TODAY,
      `${DEMO_TODAY}T14:20:00.000Z`,
      AI_SALES_FOLLOW_UP_WORKER_ID,
      'chain-test',
    )
    expect(routed?.task.workerId).toBe(AI_SHIPMENT_SPECIALIST_WORKER_ID)
    expect(routed?.task.relatedEntityId).toBe(orderId)
    expect(routed?.task.status).toBe(DIGITAL_WORKER_STATUS.WAITING)
  })
})

describe('WorkerOrchestrator queue & routing', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos

  beforeEach(() => {
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
    resetWorkerOrchestrator()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  it('worker başına ayrı queue', () => {
    enqueueWorkerTask({
      id: 'wt-q-sales',
      workerId: AI_SALES_FOLLOW_UP_WORKER_ID,
      title: 'Sales queue test',
      description: 'Test',
      priority: 'HIGH',
      status: DIGITAL_WORKER_STATUS.WAITING,
      sourceModule: 'Sales',
      relatedEntityId: 'S-10001',
      createdAt: `${DEMO_TODAY}T10:00:00.000Z`,
    })
    enqueueWorkerTask({
      id: 'wt-q-ship',
      workerId: AI_SHIPMENT_SPECIALIST_WORKER_ID,
      title: 'Shipment queue test',
      description: 'Test',
      priority: 'HIGH',
      status: DIGITAL_WORKER_STATUS.WAITING,
      sourceModule: 'Shipment',
      relatedEntityId: 'S-10002',
      createdAt: `${DEMO_TODAY}T10:01:00.000Z`,
    })
    const salesQueue = peekTaskQueue('priority', AI_SALES_FOLLOW_UP_WORKER_ID)
    const shipQueue = peekTaskQueue('priority', AI_SHIPMENT_SPECIALIST_WORKER_ID)
    expect(salesQueue.every((t) => t.workerId === AI_SALES_FOLLOW_UP_WORKER_ID)).toBe(true)
    expect(shipQueue.every((t) => t.workerId === AI_SHIPMENT_SPECIALIST_WORKER_ID)).toBe(true)
    expect(salesQueue.some((t) => t.id === 'wt-q-sales')).toBe(true)
    expect(shipQueue.some((t) => t.id === 'wt-q-ship')).toBe(true)
  })

  it('görev tamamlanınca TaskCompleted event ve history kaydı', () => {
    const orchestrator = new WorkerOrchestrator()
    orchestrator.configure({ demoMode: true, orders, dtos, todayIso: DEMO_TODAY })

    enqueueWorkerTask({
      id: 'wt-orch-complete',
      workerId: AI_SALES_FOLLOW_UP_WORKER_ID,
      title: 'Sipariş S24089 takip',
      description: 'Test complete',
      priority: 'HIGH',
      status: DIGITAL_WORKER_STATUS.WAITING,
      sourceModule: 'Sales',
      relatedEntityId: 'S-24089',
      createdAt: `${DEMO_TODAY}T14:20:00.000Z`,
      startedAt: `${DEMO_TODAY}T14:20:05.000Z`,
    })

    const running = dequeueNextTask(AI_SALES_FOLLOW_UP_WORKER_ID)
    expect(running?.status).toBe(DIGITAL_WORKER_STATUS.RUNNING)

    orchestrator.finalizeProcessing(AI_SALES_FOLLOW_UP_WORKER_ID, {
      taskId: running.id,
      orderId: 'S-24089',
      startedAt: 0,
      chainId: 'chain-s24089',
    })

    const history = orchestrator.getOrchestrationHistory()
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].fromWorkerId).toBe(AI_SALES_FOLLOW_UP_WORKER_ID)
    expect(history[0].durationSeconds).toBeGreaterThanOrEqual(0)
    expect(history[0].toWorkerId).toBe(AI_SHIPMENT_SPECIALIST_WORKER_ID)

    const events = getAllDomainEventsSnapshot()
    expect(events.some((e) => e.type === DOMAIN_EVENT_TYPE.AI_SALES_TASK_COMPLETED)).toBe(true)

    const shipmentQueue = peekTaskQueue('priority', AI_SHIPMENT_SPECIALIST_WORKER_ID)
    expect(shipmentQueue.length).toBeGreaterThan(0)
  })

  it('CEO timeline mesajları üretir', () => {
    const orchestrator = new WorkerOrchestrator()
    orchestrator.configure({ demoMode: true, orders, dtos, todayIso: DEMO_TODAY })

    orchestrator.appendCeoTimelineEntry(
      {
        id: 'h1',
        workerId: AI_SALES_FOLLOW_UP_WORKER_ID,
        title: 'Sipariş S24089 takip',
        relatedEntityId: 'S-24089',
        durationMs: 5000,
        durationLabel: '0 dk',
        status: DIGITAL_WORKER_STATUS.COMPLETED,
        finishedAt: `${DEMO_TODAY}T14:20:00.000Z`,
      },
      'chain-1',
    )

    const timeline = orchestrator.getCeoTimeline()
    expect(timeline[0].workerLabel).toBe('AI Sales')
    expect(timeline[0].message).toContain('S-24089')
    expect(buildCeoTimelineMessage({
      workerId: AI_SHIPMENT_SPECIALIST_WORKER_ID,
      title: 'Sevk',
      relatedEntityId: 'S-1',
    })).toContain('Sevk planı')
  })

  it('procurement sonrası operasyon tamamlandı eventi', () => {
    const orchestrator = new WorkerOrchestrator()
    orchestrator.configure({ demoMode: true, orders, dtos, todayIso: DEMO_TODAY })

    enqueueWorkerTask({
      id: 'wt-proc-final',
      workerId: AI_PROCUREMENT_SPECIALIST_WORKER_ID,
      title: 'Tedarik final',
      description: 'Test',
      priority: 'HIGH',
      status: DIGITAL_WORKER_STATUS.RUNNING,
      sourceModule: 'Procurement',
      relatedEntityId: 'S-PROC-DEMO',
      createdAt: `${DEMO_TODAY}T14:23:00.000Z`,
      startedAt: `${DEMO_TODAY}T14:23:01.000Z`,
    })

    const task = listWorkerTasks(AI_PROCUREMENT_SPECIALIST_WORKER_ID)[0]
    orchestrator.finalizeProcessing(AI_PROCUREMENT_SPECIALIST_WORKER_ID, {
      taskId: task.id,
      orderId: 'S-PROC-DEMO',
      startedAt: 0,
      chainId: 'chain-proc',
    })

    const events = getAllDomainEventsSnapshot()
    expect(events.some((e) => e.type === DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED)).toBe(
      true,
    )
    expect(orchestrator.getCeoTimeline().some((t) => t.kind === 'chain')).toBe(true)
  })
})

describe('CEO orchestration feed merge', () => {
  it('orchestrator timeline + domain events birleşir', () => {
    const merged = mergeCeoOrchestrationTimeline(
      [
        {
          id: 't1',
          timeLabel: '14:20',
          workerLabel: 'AI Sales',
          workerId: AI_SALES_FOLLOW_UP_WORKER_ID,
          message: 'Sipariş tamamlandı',
          orderId: 'S-1',
          occurredAt: `${DEMO_TODAY}T14:20:00.000Z`,
          kind: 'worker',
          tone: 'sales',
        },
      ],
      [
        {
          id: 'e1',
          type: DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_COMPLETED,
          aggregateId: 'S-1',
          occurredAt: `${DEMO_TODAY}T14:21:00.000Z`,
          payload: { workerId: AI_SHIPMENT_SPECIALIST_WORKER_ID, worker: 'AI Shipment', description: 'Sevk planı' },
        },
      ],
    )
    expect(merged.length).toBeGreaterThanOrEqual(2)
  })
})

describe('Operation Map AI activity feed', () => {
  it('aktif AI worker kart rengi alır', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const orderId = orders[0].id
    const aiActiveByOrderId = new Map([
      [orderId, { workerId: AI_SHIPMENT_SPECIALIST_WORKER_ID, tone: 'shipment', workerLabel: 'AI Shipment' }],
    ])
    const board = buildKanbanBoard(orders.slice(0, 5), dtos.slice(0, 5), DEMO_TODAY, {
      aiActiveByOrderId,
    })
    const allCards = Object.values(board.grouped).flat()
    const activeCard = allCards.find((c) => c.orderId === orderId)
    expect(activeCard?.aiActivityTone).toBe('shipment')
  })
})

describe('WorkerOrchestrator singleton', () => {
  it('getWorkerOrchestrator singleton döner', () => {
    resetWorkerOrchestrator()
    expect(getWorkerOrchestrator()).toBeTruthy()
  })
})
