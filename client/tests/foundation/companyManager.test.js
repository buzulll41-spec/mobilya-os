import { describe, expect, it, beforeEach } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { WORKER_PRIORITY } from '../../src/contracts/v1/digitalWorker.js'
import { COMPANY_MANAGER_DECISION, COMPANY_PRIORITY_RANK } from '../../src/contracts/v1/aiCompanyManager.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiCollectionSpecialist.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiShipmentSpecialist.js'
import { BusinessEngine } from '../../src/engine/businessEngine.js'
import {
  compareCompanyPriority,
  normalizeCompanyPriority,
  pickDominantDomain,
  scoreOperationalDomains,
} from '../../src/engine/company-manager/PriorityEngine.js'
import {
  detectOperationalConflicts,
  resolveConflictStrategy,
} from '../../src/engine/company-manager/ConflictResolver.js'
import { applyCompanyManagerDecision } from '../../src/engine/company-manager/WorkerCoordinator.js'
import { runCompanyManagerScan } from '../../src/services/company-manager/CompanyManager.js'
import {
  getCompanyManagerDecisionHistory,
  getCompanyManagerOperationFeed,
  getCompanyManagerDailyStats,
  resetCompanyManagerStore,
} from '../../src/services/company-manager/companyManagerStore.js'
import {
  buildCeoAiCompanySummaryVm,
  buildDigitalCompanyStatusKpis,
  buildOperationFeedVm,
} from '../../src/mappers/digital-workforce/companyManagerModel.js'
import { buildCeoLiveFeed } from '../../src/mappers/executive/ceoExperienceModel.js'
import {
  resetDigitalWorkforceStore,
  listDigitalWorkers,
  pauseDigitalWorker,
  peekTaskQueue,
  dequeueNextTask,
  enqueueWorkerTask,
  listWorkerTasks,
} from '../../src/services/mockDigitalWorkforceStore.js'
import { getAllDomainEventsSnapshot, resetMockDomainEventStore } from '../../src/services/mockDomainEventStore.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'

describe('PriorityEngine', () => {
  it('CRITICAL > HIGH > NORMAL > LOW sıralaması', () => {
    expect(COMPANY_PRIORITY_RANK.CRITICAL).toBeLessThan(COMPANY_PRIORITY_RANK.HIGH)
    expect(compareCompanyPriority(WORKER_PRIORITY.CRITICAL, WORKER_PRIORITY.HIGH)).toBeLessThan(0)
    expect(normalizeCompanyPriority('UNKNOWN')).toBe(WORKER_PRIORITY.NORMAL)
  })

  it('operasyon domain skorları üretir', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    bootstrapMockOrderLinesFromOrders(orders)
    const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const snapshots = BusinessEngine.computeOrderSnapshots(orders, dtos, DEMO_TODAY)
    const domains = scoreOperationalDomains({
      snapshots: [...snapshots.values()],
      domainEvents: [],
      todayIso: DEMO_TODAY,
    })
    expect(pickDominantDomain(domains)).toBeTruthy()
    expect(domains.shipment).toBeDefined()
    expect(domains.collection).toBeDefined()
  })
})

describe('ConflictResolver', () => {
  beforeEach(() => {
    resetDigitalWorkforceStore()
  })

  it('kuyruk yoğunluğu conflict üretir', () => {
    const workerId = AI_SHIPMENT_SPECIALIST_WORKER_ID
    for (let i = 0; i < 7; i += 1) {
      enqueueWorkerTask({
        id: `wt-conf-${i}`,
        workerId,
        title: `Görev ${i}`,
        priority: WORKER_PRIORITY.NORMAL,
        status: 'WAITING',
        sourceModule: 'test',
        targetModule: 'shipment',
        relatedEntityId: `S-test-${i}`,
        relatedModule: 'sales',
        createdAt: `${DEMO_TODAY}T09:00:00.000Z`,
        startedAt: null,
        finishedAt: null,
        completedAt: null,
        result: null,
        createdBy: 'test',
      })
    }
    const conflicts = detectOperationalConflicts(listWorkerTasks(), listDigitalWorkers())
    expect(conflicts.some((c) => c.kind === 'QUEUE_OVERLOAD')).toBe(true)
    const strategy = resolveConflictStrategy(conflicts, 'shipment')
    expect(strategy.shouldBoostShipment).toBe(true)
  })
})

describe('CompanyManager scan & coordinator', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos

  beforeEach(() => {
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
    resetCompanyManagerStore()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  it('runCompanyManagerScan karar ve queue günceller', () => {
    const result = runCompanyManagerScan({ orders, dtos, todayIso: DEMO_TODAY, apply: true })
    expect(result.decisions.length).toBeGreaterThan(0)
    expect(result.companyStatus.totalQueue).toBeGreaterThanOrEqual(0)
    expect(getCompanyManagerDecisionHistory().length).toBeGreaterThan(0)
    expect(getCompanyManagerOperationFeed().length).toBeGreaterThan(0)
  })

  it('WorkerCoordinator collection bekletir', () => {
    applyCompanyManagerDecision({
      id: 'dec-test',
      type: COMPANY_MANAGER_DECISION.COLLECTION_WAIT,
      message: 'AI Collection beklemeye alındı',
      workerId: AI_COLLECTION_SPECIALIST_WORKER_ID,
      occurredAt: new Date().toISOString(),
    })
    const worker = listDigitalWorkers().find((w) => w.id === AI_COLLECTION_SPECIALIST_WORKER_ID)
    expect(worker?.status).toBe('PAUSED')
  })

  it('CEO feed ve summary VM üretir', () => {
    runCompanyManagerScan({ orders, dtos, todayIso: DEMO_TODAY, apply: true })
    const events = getAllDomainEventsSnapshot().filter(
      (e) => e.type === DOMAIN_EVENT_TYPE.AI_COMPANY_MANAGER_DECISION,
    )
    expect(events.length).toBeGreaterThan(0)
    const feed = buildCeoLiveFeed(events, [], 10)
    expect(feed.some((f) => f.actor === 'AI Company Manager' || f.message)).toBe(true)
    const summary = buildCeoAiCompanySummaryVm()
    expect(summary.items).toHaveLength(5)
    expect(getCompanyManagerDailyStats().decisionsToday).toBeGreaterThan(0)
  })

  it('Digital Company Status KPI ve Operation Feed', () => {
    const scan = runCompanyManagerScan({ orders, dtos, todayIso: DEMO_TODAY, apply: true })
    const kpis = buildDigitalCompanyStatusKpis(scan.companyStatus)
    expect(kpis).toHaveLength(6)
    const feed = buildOperationFeedVm()
    expect(feed[0]?.headline).toBe('AI Company Manager')
  })
})

describe('CompanyManager queue integration', () => {
  beforeEach(() => {
    resetDigitalWorkforceStore()
    resetCompanyManagerStore()
  })

  it('duraklatılmış worker dequeue etmez', () => {
    pauseDigitalWorker(AI_COLLECTION_SPECIALIST_WORKER_ID, 'manager pause')
    expect(peekTaskQueue('priority', AI_COLLECTION_SPECIALIST_WORKER_ID).length).toBeGreaterThan(0)
    expect(dequeueNextTask(AI_COLLECTION_SPECIALIST_WORKER_ID)).toBeNull()
    const worker = listDigitalWorkers().find((w) => w.id === AI_COLLECTION_SPECIALIST_WORKER_ID)
    expect(worker?.status).toBe('PAUSED')
  })
})
