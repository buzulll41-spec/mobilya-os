import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { WORKER_PRIORITY } from '../../src/contracts/v1/digitalWorker.js'
import { COMPANY_MANAGER_DECISION } from '../../src/contracts/v1/aiCompanyManager.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiShipmentSpecialist.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiCollectionSpecialist.js'
import { BusinessEngine } from '../../src/engine/businessEngine.js'
import {
  applyGoalWeightsToDomains,
  estimateOperationalMetrics,
  goalEngineToDomainBias,
  mergeGoalEngineBias,
} from '../../src/engine/company-brain/GoalEngineBridge.js'
import {
  buildScenarioDecisions,
  detectCompanyScenario,
} from '../../src/engine/company-brain/CompanyDecisionEngine.js'
import {
  balanceWorkerLoad,
  computeWorkerLoads,
} from '../../src/engine/company-brain/WorkloadBalancer.js'
import { scoreOperationalDomains } from '../../src/engine/company-manager/PriorityEngine.js'
import { runCompanyBrainScan } from '../../src/services/company-brain/CompanyBrain.js'
import {
  getAiCompanyStatus,
  getCompanyBrainDecisionLog,
  getCompanyMapEdges,
  resetCompanyBrainStore,
} from '../../src/services/company-brain/companyBrainStore.js'
import {
  getCompanyGoals,
  resetCompanyGoalsStore,
  updateCompanyGoals,
} from '../../src/services/company-goals/companyGoalsStore.js'
import { resetCompanyManagerStore } from '../../src/services/company-manager/companyManagerStore.js'
import {
  buildAiCompanyStatusKpis,
  buildAiCompanySummaryVm,
  buildAiDecisionLogVm,
  buildCompanyGoalsPanelVm,
  buildLiveCompanyMapVm,
} from '../../src/mappers/digital-workforce/companyBrainModel.js'
import {
  resetDigitalWorkforceStore,
  enqueueWorkerTask,
  listDigitalWorkers,
  listWorkerTasks,
} from '../../src/services/mockDigitalWorkforceStore.js'
import { resetMockDomainEventStore } from '../../src/services/mockDomainEventStore.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { getAllDomainEventsSnapshot } from '../../src/services/mockDomainEventStore.js'

describe('Autonomous AI Company (FAZ 47)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos

  beforeEach(() => {
    vi.stubEnv('VITE_COMPANY_BRAIN_ENABLED', 'true')
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
    resetCompanyManagerStore()
    resetCompanyBrainStore()
    resetCompanyGoalsStore()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  describe('Goal Engine Bridge', () => {
    it('goal bias ve metrik hesaplar', () => {
      const snapshots = BusinessEngine.computeOrderSnapshots(orders, dtos, DEMO_TODAY)
      const domains = scoreOperationalDomains({
        snapshots: [...snapshots.values()],
        domainEvents: [],
        todayIso: DEMO_TODAY,
      })
      const goals = getCompanyGoals()
      const { weightedDomains, metrics } = applyGoalWeightsToDomains(domains, goals)
      expect(weightedDomains.collection.score).toBeGreaterThanOrEqual(domains.collection.score)
      expect(metrics.collectionRate).toBeGreaterThan(0)

      const bias = goalEngineToDomainBias({ goalDecision: 'FOCUS_COLLECTION' })
      const merged = mergeGoalEngineBias(domains, bias)
      expect(merged.collection.score).toBeGreaterThan(domains.collection.score)
    })
  })

  describe('Company Decision Engine', () => {
    it('tahsilat düşüş senaryosu kararları üretir', () => {
      const metrics = {
        collectionBelowTarget: true,
        riskyAboveTarget: true,
        shipmentAboveTarget: false,
        procurementAboveTarget: false,
        collectionRate: 70,
        shipmentDelayPct: 2,
        procurementWaitPct: 1,
        riskyReceivable: 250_000,
      }
      const domains = scoreOperationalDomains({
        snapshots: [],
        domainEvents: [],
        todayIso: DEMO_TODAY,
      })
      const scenario = detectCompanyScenario(metrics, domains)
      expect(scenario).toBe('COLLECTION_DROP')

      const decisions = buildScenarioDecisions({
        scenario,
        metrics,
        dominantDomain: 'collection',
        buildDecision: (type, message, extra = {}) => ({ id: 'x', type, message, occurredAt: 't', ...extra }),
      })
      expect(decisions.some((d) => d.type === COMPANY_MANAGER_DECISION.COLLECTION_PRIORITY)).toBe(true)
      expect(decisions.some((d) => d.type === COMPANY_MANAGER_DECISION.SHIPMENT_PAUSE)).toBe(true)
    })
  })

  describe('Workload Balancer', () => {
    it('yoğun workerdan görev aktarır', () => {
      const workerId = AI_SHIPMENT_SPECIALIST_WORKER_ID
      for (let i = 0; i < 6; i += 1) {
        enqueueWorkerTask({
          id: `wt-bal-${i}`,
          workerId,
          title: `Sevk ${i}`,
          priority: WORKER_PRIORITY.NORMAL,
          status: 'WAITING',
          sourceModule: 'test',
          targetModule: 'shipment',
          relatedEntityId: `S-bal-${i}`,
          relatedModule: 'sales',
          createdAt: `${DEMO_TODAY}T09:00:00.000Z`,
          startedAt: null,
          finishedAt: null,
          completedAt: null,
          result: null,
          createdBy: 'test',
        })
      }
      const loads = computeWorkerLoads(listWorkerTasks(), listDigitalWorkers())
      expect(loads.find((l) => l.workerId === workerId)?.pending).toBeGreaterThanOrEqual(5)

      const balance = balanceWorkerLoad({
        tasks: listWorkerTasks(),
        workers: listDigitalWorkers(),
        buildDecision: (type, message, extra = {}) => ({ id: `b-${extra.taskId}`, type, message, occurredAt: 't', ...extra }),
      })
      expect(balance.decisions.length).toBeGreaterThan(0)
      expect(balance.edges.length).toBeGreaterThan(0)
    })
  })

  describe('CompanyBrain scan', () => {
    it('tam tarama karar, status ve audit üretir', () => {
      updateCompanyGoals({ collectionRateTarget: 95 })
      const result = runCompanyBrainScan({
        orders,
        dtos,
        todayIso: DEMO_TODAY,
        apply: true,
        goalEngine: { goalDecision: 'FOCUS_COLLECTION' },
      })

      expect(result.brainEnabled).toBe(true)
      expect(result.decisions.length).toBeGreaterThan(0)
      expect(result.aiCompanyStatus.totalWorkers).toBe(4)
      expect(getAiCompanyStatus()?.totalWorkers).toBe(4)
      expect(getCompanyBrainDecisionLog().length).toBeGreaterThan(0)

      const brainEvents = getAllDomainEventsSnapshot().filter(
        (e) => e.type === DOMAIN_EVENT_TYPE.AI_COMPANY_BRAIN_DECISION,
      )
      expect(brainEvents.length).toBeGreaterThan(0)
    })
  })

  describe('CEO Summary & Live Map VMs', () => {
    it('UI view-model üretir', () => {
      runCompanyBrainScan({ orders, dtos, todayIso: DEMO_TODAY, apply: true })
      const kpis = buildAiCompanyStatusKpis(getAiCompanyStatus())
      expect(kpis).toHaveLength(8)
      const summary = buildAiCompanySummaryVm()
      expect(summary.headline).toBe('AI COMPANY STATUS')
      expect(buildCompanyGoalsPanelVm()).toHaveLength(4)
      expect(buildLiveCompanyMapVm().workers.length).toBe(5)
      expect(buildAiDecisionLogVm().length).toBeGreaterThan(0)
      expect(getCompanyMapEdges()).toBeDefined()
    })
  })
})
