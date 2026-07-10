import { getOperationalToday } from '../../data/constants.js'
import { BusinessEngine } from '../../engine/businessEngine.js'
import { DIGITAL_WORKER_STATUS, WORKER_PRIORITY } from '../../contracts/v1/digitalWorker.js'
import {
  AI_COMPANY_MANAGER_WORKER_ID,
  COMPANY_MANAGER_DECISION,
} from '../../contracts/v1/aiCompanyManager.js'
import {
  detectOperationalConflicts,
  resolveConflictStrategy,
  PIPELINE_WORKERS,
} from '../../engine/company-manager/ConflictResolver.js'
import {
  pickDominantDomain,
  rankSnapshotsByPriority,
  scoreOperationalDomains,
} from '../../engine/company-manager/PriorityEngine.js'
import { runCompanyManagerScan } from '../company-manager/CompanyManager.js'
import { getCompanyGoals } from '../company-goals/companyGoalsStore.js'
import { getGoalEngine } from '../goalEngineClient.js'
import {
  applyGoalWeightsToDomains,
  goalEngineToDomainBias,
  mergeGoalEngineBias,
  estimateOperationalMetrics,
} from '../../engine/company-brain/GoalEngineBridge.js'
import {
  buildScenarioDecisions,
  detectCompanyScenario,
} from '../../engine/company-brain/CompanyDecisionEngine.js'
import { balanceWorkerLoad } from '../../engine/company-brain/WorkloadBalancer.js'
import {
  applyCompanyManagerDecisions,
} from '../../engine/company-manager/WorkerCoordinator.js'
import {
  appendCompanyManagerDecisions,
  buildCompanyStatusFromSnapshot,
  recordCompanyManagerScan,
} from '../company-manager/companyManagerStore.js'
import { getDigitalWorkforceCoreSnapshot } from '../mockDigitalWorkforceStore.js'
import { getAllDomainEventsSnapshot } from '../mockDomainEventStore.js'
import { buildExecutionSummaryLocal } from '../ai-tools/mockAiToolExecutionStore.js'
import { recordCompanyBrainScan } from './companyBrainStore.js'
import { publishCompanyBrainDecisionEvents } from './companyBrainAudit.js'
import { isCompanyBrainEnabled } from '../../config/companyBrainConfig.js'

/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

let decisionSeq = 0

function nextDecisionId() {
  decisionSeq += 1
  return `cb-dec-${Date.now()}-${decisionSeq}`
}

/**
 * @param {CompanyManagerDecisionDto['type']} type
 * @param {string} message
 * @param {Partial<CompanyManagerDecisionDto>} [extra]
 * @param {string} [todayIso]
 */
function buildBrainDecision(type, message, extra = {}, todayIso = getOperationalToday()) {
  return {
    id: nextDecisionId(),
    type,
    message,
    occurredAt: `${todayIso}T${new Date().toISOString().slice(11, 23)}Z`,
    ...extra,
  }
}

/**
 * @param {ReturnType<typeof getDigitalWorkforceCoreSnapshot>} workforce
 * @param {string} todayIso
 */
function buildAiCompanyStatus(workforce, todayIso) {
  const pipelineWorkers = workforce.workers.filter((w) => PIPELINE_WORKERS.includes(w.id))
  const tasks = workforce.tasks.filter((t) => PIPELINE_WORKERS.includes(t.workerId))
  const running = pipelineWorkers.filter((w) => w.status === DIGITAL_WORKER_STATUS.RUNNING).length
  const waiting = pipelineWorkers.filter((w) => w.status === DIGITAL_WORKER_STATUS.WAITING).length
  const risky = tasks.filter(
    (t) =>
      t.priority === WORKER_PRIORITY.CRITICAL &&
      (t.status === DIGITAL_WORKER_STATUS.WAITING || t.status === DIGITAL_WORKER_STATUS.RUNNING),
  ).length
  const busy = tasks.filter((t) => t.status === DIGITAL_WORKER_STATUS.RUNNING).length
  const pendingTasks = tasks.filter(
    (t) =>
      t.status === DIGITAL_WORKER_STATUS.WAITING || t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL,
  ).length
  const completedTasks = workforce.taskHistory.filter(
    (h) => (h.finishedAt ?? h.completedAt ?? '').slice(0, 10) === todayIso,
  ).length

  return {
    running,
    busy,
    risky,
    waiting,
    totalWorkers: pipelineWorkers.length,
    activeTasks: busy + pendingTasks,
    pendingTasks,
    completedTasks,
  }
}

/**
 * FAZ 47 — Company Brain scan: goals + scenario decisions + workload balance.
 * @param {{
 *   orders: Order[]
 *   dtos: SalesOrderListItemDto[]
 *   todayIso?: string
 *   apply?: boolean
 *   goalEngine?: import('../../contracts/v1/goalEngine.js').GoalEngineResponseDto | null
 * }} input
 */
export function runCompanyBrainScan(input) {
  if (!isCompanyBrainEnabled()) {
    return runCompanyManagerScan(input)
  }

  const { orders, dtos, todayIso = getOperationalToday(), apply = true } = input
  const goals = getCompanyGoals()
  const workforce = getDigitalWorkforceCoreSnapshot()
  const domainEvents = getAllDomainEventsSnapshot()
  const snapshotMap = BusinessEngine.computeOrderSnapshots(orders, dtos, todayIso)
  const snapshots = [...snapshotMap.values()]
  rankSnapshotsByPriority(snapshots)

  let domains = scoreOperationalDomains({ snapshots, domainEvents, todayIso })
  const { weightedDomains, metrics } = applyGoalWeightsToDomains(domains, goals)
  domains = weightedDomains

  const goalBias = goalEngineToDomainBias(input.goalEngine ?? null)
  domains = mergeGoalEngineBias(domains, goalBias)

  const dominant = pickDominantDomain(domains)
  const scenario = detectCompanyScenario(metrics, domains)
  const conflicts = detectOperationalConflicts(workforce.tasks, workforce.workers)
  resolveConflictStrategy(conflicts, dominant)

  const baseResult = runCompanyManagerScan({ orders, dtos, todayIso, apply: false })
  const decide = (type, message, extra = {}) => buildBrainDecision(type, message, extra, todayIso)

  const scenarioDecisions = buildScenarioDecisions({
    scenario,
    metrics,
    dominantDomain: dominant,
    buildDecision: decide,
  })

  const balance = balanceWorkerLoad({
    tasks: workforce.tasks,
    workers: workforce.workers,
    buildDecision: decide,
  })

  const seen = new Set(baseResult.decisions.map((d) => `${d.type}:${d.workerId ?? ''}:${d.message}`))
  /** @type {CompanyManagerDecisionDto[]} */
  const brainOnly = [...scenarioDecisions, ...balance.decisions].filter(
    (d) => !seen.has(`${d.type}:${d.workerId ?? ''}:${d.message}`),
  )

  const allDecisions = [...baseResult.decisions, ...brainOnly]
  const companyStatus = buildCompanyStatusFromSnapshot(workforce)
  const aiCompanyStatus = buildAiCompanyStatus(workforce, todayIso)
  const execSummary = buildExecutionSummaryLocal(todayIso)

  recordCompanyManagerScan({
    scanAt: `${todayIso}T09:00:00.000Z`,
    dominantDomain: dominant,
    conflictCount: conflicts.length,
    decisionCount: allDecisions.length,
    companyStatus,
    pendingApproval: execSummary.waiting ?? 0,
    tasksCompletedToday: aiCompanyStatus.completedTasks,
  })

  recordCompanyBrainScan({
    decisions: allDecisions,
    edges: balance.edges,
    scenario,
    scanAt: `${todayIso}T09:00:00.000Z`,
    dominantDomain: dominant,
    goals,
    status: aiCompanyStatus,
  })

  appendCompanyManagerDecisions(brainOnly)

  if (apply && allDecisions.length) {
    applyCompanyManagerDecisions(allDecisions)
    publishCompanyBrainDecisionEvents(allDecisions, scenario)
  }

  return {
    ...baseResult,
    managerId: AI_COMPANY_MANAGER_WORKER_ID,
    brainEnabled: true,
    scenario,
    goals,
    metrics: estimateOperationalMetrics(
      scoreOperationalDomains({ snapshots, domainEvents, todayIso }),
      goals,
    ),
    dominantDomain: dominant,
    domains,
    decisions: allDecisions,
    mapEdges: balance.edges,
    aiCompanyStatus,
    companyStatus,
  }
}

export {}
