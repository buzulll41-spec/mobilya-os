import { DEMO_TODAY } from '../../data/constants.js'
import { BusinessEngine } from '../../engine/businessEngine.js'
import { DIGITAL_WORKER_STATUS, WORKER_PRIORITY } from '../../contracts/v1/digitalWorker.js'
import {
  AI_COMPANY_MANAGER_WORKER_ID,
  COMPANY_MANAGER_DECISION,
} from '../../contracts/v1/aiCompanyManager.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiCollectionSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiProcurementSpecialist.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../../contracts/v1/aiSalesFollowUp.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiShipmentSpecialist.js'
import {
  detectOperationalConflicts,
  resolveConflictStrategy,
  PIPELINE_WORKERS,
} from '../../engine/company-manager/ConflictResolver.js'
import {
  compareCompanyPriority,
  normalizeCompanyPriority,
  pickDominantDomain,
  rankSnapshotsByPriority,
  scoreOperationalDomains,
} from '../../engine/company-manager/PriorityEngine.js'
import {
  applyCompanyManagerDecisions,
  WORKER_BY_DOMAIN,
} from '../../engine/company-manager/WorkerCoordinator.js'
import {
  recordCompanyManagerDecisionQuality,
  rankCompanyManagerDecisionsByQuality,
} from '../decision/DecisionQualityService.js'
import {
  rankDecisionsWithOptimization,
  runSelfOptimizationScan,
} from '../optimization/SelfOptimizationService.js'
import {
  rankDecisionsWithCollaboration,
  runCollaborationScan,
} from '../collaboration/CollaborationService.js'
import {
  getDigitalWorkforceCoreSnapshot,
  listWorkerTasks,
  peekTaskQueue,
} from '../mockDigitalWorkforceStore.js'
import { getAllDomainEventsSnapshot } from '../mockDomainEventStore.js'
import { buildExecutionSummaryLocal } from '../ai-tools/mockAiToolExecutionStore.js'
import {
  appendCompanyManagerDecisions,
  buildCompanyStatusFromSnapshot,
  recordCompanyManagerScan,
} from './companyManagerStore.js'
import { publishCompanyManagerDecisionEvents } from './companyManagerAudit.js'

/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

let decisionSeq = 0

function nextDecisionId() {
  decisionSeq += 1
  return `cm-dec-${Date.now()}-${decisionSeq}`
}

/**
 * @param {CompanyManagerDecisionDto['type']} type
 * @param {string} message
 * @param {Partial<CompanyManagerDecisionDto>} [extra]
 */
function buildDecision(type, message, extra = {}, todayIso = DEMO_TODAY) {
  return {
    id: nextDecisionId(),
    type,
    message,
    occurredAt: `${todayIso}T${new Date().toISOString().slice(11, 23)}Z`,
    ...extra,
  }
}

/**
 * FAZ 45 — scan ERP operations and produce coordinator decisions.
 * @param {{
 *   orders: Order[]
 *   dtos: SalesOrderListItemDto[]
 *   todayIso?: string
 *   apply?: boolean
 * }} input
 */
export function runCompanyManagerScan(input) {
  const { orders, dtos, todayIso = DEMO_TODAY, apply = true } = input
  const domainEvents = getAllDomainEventsSnapshot()
  const workforce = getDigitalWorkforceCoreSnapshot()
  const snapshotMap = BusinessEngine.computeOrderSnapshots(orders, dtos, todayIso)
  const snapshots = [...snapshotMap.values()]
  const ranked = rankSnapshotsByPriority(snapshots)
  const domains = scoreOperationalDomains({ snapshots, domainEvents, todayIso })
  const dominant = pickDominantDomain(domains)
  const conflicts = detectOperationalConflicts(workforce.tasks, workforce.workers)
  const strategy = resolveConflictStrategy(conflicts, dominant)
  const decide = (type, message, extra = {}) => buildDecision(type, message, extra, todayIso)

  /** @type {CompanyManagerDecisionDto[]} */
  const decisions = []

  if (strategy.shouldBoostShipment) {
    decisions.push(
      decide(
        COMPANY_MANAGER_DECISION.SHIPMENT_PRIORITY,
        'Shipment önceliği yükseltildi',
        {
          workerId: AI_SHIPMENT_SPECIALIST_WORKER_ID,
          priority: WORKER_PRIORITY.CRITICAL,
          reason: 'Operasyon taraması — sevk baskın',
        },
      ),
    )
    decisions.push(
      decide(
        COMPANY_MANAGER_DECISION.CREATE_TASK,
        'AI Shipment görevlendirildi',
        {
          targetWorkerId: AI_SHIPMENT_SPECIALIST_WORKER_ID,
          orderId: ranked[0]?.orderId,
          priority: WORKER_PRIORITY.HIGH,
        },
      ),
    )
  }

  if (strategy.shouldPauseCollection) {
    decisions.push(
      decide(
        COMPANY_MANAGER_DECISION.COLLECTION_WAIT,
        'AI Collection beklemeye alındı',
        {
          workerId: AI_COLLECTION_SPECIALIST_WORKER_ID,
          reason: 'Sevk önceliği aktif',
        },
      ),
    )
  }

  if (strategy.shouldStopProcurement) {
    decisions.push(
      decide(
        COMPANY_MANAGER_DECISION.PROCUREMENT_STOP,
        'Procurement durduruldu',
        {
          workerId: AI_PROCUREMENT_SPECIALIST_WORKER_ID,
          reason: 'Operasyon kapasitesi sevk için ayrıldı',
        },
      ),
    )
  }

  if (strategy.shouldRunSales || domains.sales.score >= domains.collection.score) {
    decisions.push(
      decide(COMPANY_MANAGER_DECISION.RUN_SALES, 'AI Sales çalışsın', {
        workerId: AI_SALES_FOLLOW_UP_WORKER_ID,
      }),
    )
  }

  if (strategy.overlapOrderId && strategy.cancelLowestPriority) {
    const overlapTasks = listWorkerTasks().filter(
      (t) =>
        t.relatedEntityId === strategy.overlapOrderId &&
        t.status === DIGITAL_WORKER_STATUS.WAITING &&
        t.priority === WORKER_PRIORITY.LOW,
    )
    const victim = overlapTasks[0]
    if (victim) {
      decisions.push(
        decide(COMPANY_MANAGER_DECISION.CANCEL_TASK, 'Düşük öncelikli görev iptal edildi', {
          taskId: victim.id,
          orderId: victim.relatedEntityId ?? undefined,
          reason: 'Company Manager çakışma çözümü',
        }),
      )
    }
  }

  const procurementPaused = workforce.workers.find(
    (w) => w.id === AI_PROCUREMENT_SPECIALIST_WORKER_ID && w.status === DIGITAL_WORKER_STATUS.PAUSED,
  )
  const shipmentQueue = peekTaskQueue('priority', AI_SHIPMENT_SPECIALIST_WORKER_ID).length
  if (procurementPaused && shipmentQueue <= 2 && domains.procurement.pressure > 0) {
    decisions.push(
      decide(COMPANY_MANAGER_DECISION.RESUME_WORKER, 'Procurement yeniden etkin', {
        workerId: AI_PROCUREMENT_SPECIALIST_WORKER_ID,
      }),
    )
  }

  const top = ranked[0]
  if (top && compareCompanyPriority(normalizeCompanyPriority(top.priority), WORKER_PRIORITY.HIGH) <= 0) {
    const targetWorker = WORKER_BY_DOMAIN[dominant] ?? AI_SALES_FOLLOW_UP_WORKER_ID
    const existing = listWorkerTasks(targetWorker).some(
      (t) =>
        t.relatedEntityId === top.orderId &&
        (t.status === DIGITAL_WORKER_STATUS.WAITING || t.status === DIGITAL_WORKER_STATUS.RUNNING),
    )
    if (!existing) {
      decisions.push(
        decide(COMPANY_MANAGER_DECISION.CREATE_TASK, 'Yeni koordinasyon görevi üretildi', {
          targetWorkerId: targetWorker,
          orderId: top.orderId,
          priority: normalizeCompanyPriority(top.priority),
        }),
      )
    }
  }

  if (domains.criticalOrders === 0 && conflicts.length === 0) {
    decisions.push(
      decide(COMPANY_MANAGER_DECISION.RISK_REDUCED, 'Risk seviyesi düştü', {
        priority: WORKER_PRIORITY.NORMAL,
      }),
    )
  }

  const companyStatus = buildCompanyStatusFromSnapshot(workforce)
  const execSummary = buildExecutionSummaryLocal(todayIso)

  recordCompanyManagerScan({
    scanAt: `${todayIso}T09:00:00.000Z`,
    dominantDomain: dominant,
    conflictCount: conflicts.length,
    decisionCount: decisions.length,
    companyStatus,
    pendingApproval: execSummary.waiting ?? 0,
    tasksCompletedToday: workforce.taskHistory.filter(
      (h) => (h.finishedAt ?? h.completedAt ?? '').slice(0, 10) === todayIso,
    ).length,
  })

  appendCompanyManagerDecisions(decisions)

  const qualityCtx = { orders, dtos, todayIso }
  recordCompanyManagerDecisionQuality(decisions, qualityCtx)
  runSelfOptimizationScan(qualityCtx)
  runCollaborationScan({ orders, dtos, todayIso, domains, dominant, conflicts, ranked })
  const rankedDecisions = rankDecisionsWithCollaboration(
    rankDecisionsWithOptimization(
      rankCompanyManagerDecisionsByQuality(decisions, qualityCtx),
      qualityCtx,
    ),
    qualityCtx,
  )

  if (apply && rankedDecisions.length) {
    applyCompanyManagerDecisions(rankedDecisions)
    publishCompanyManagerDecisionEvents(rankedDecisions)
  }

  return {
    scanAt: `${todayIso}T09:00:00.000Z`,
    managerId: AI_COMPANY_MANAGER_WORKER_ID,
    dominantDomain: dominant,
    domains,
    conflicts,
    decisions,
    companyStatus,
    pipelineWorkers: PIPELINE_WORKERS,
  }
}

export {}
