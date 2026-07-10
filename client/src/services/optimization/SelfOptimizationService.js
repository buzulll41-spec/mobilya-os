import {
  applyOptimizationRules,
  computeFullDistributionScore,
  computeOptimizationScore,
  createDefaultStrategy,
  strategiesEqual,
} from '../../engine/optimization/SelfOptimizationEngine.js'
import {
  getCompanyDecisionSummaryLocal,
  getCombinedDecisionSignals,
  getDecisionHistoryLocal,
} from '../decision/DecisionQualityService.js'
import { getLearningStatisticsLocal, getPredictionConfidence, updateConfidenceFromDecisionOutcome } from '../learning/LearningEngineService.js'
import { buildExecutionSummaryLocal } from '../ai-tools/mockAiToolExecutionStore.js'
import { scoreOperationalDomains } from '../../engine/company-manager/PriorityEngine.js'
import { BusinessEngine } from '../../engine/businessEngine.js'
import { getAllDomainEventsSnapshot } from '../mockDomainEventStore.js'

/** @typedef {import('../../contracts/v1/selfOptimization.js').WorkerOptimizationProfileDto} WorkerOptimizationProfileDto */
/** @typedef {import('../../contracts/v1/selfOptimization.js').OptimizationHistoryRecordDto} OptimizationHistoryRecordDto */
/** @typedef {import('../../contracts/v1/selfOptimization.js').CompanyOptimizationSummaryDto} CompanyOptimizationSummaryDto */
/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */

const WORKER_IDS = [
  'dw-collection',
  'dw-shipment',
  'dw-sales-follow-up',
  'dw-procurement',
  'dw-ceo-assistant',
]

const WORKER_LABELS = {
  'dw-collection': 'Collection AI',
  'dw-shipment': 'Shipment AI',
  'dw-sales-follow-up': 'Sales AI',
  'dw-procurement': 'Procurement AI',
  'dw-ceo-assistant': 'Company Manager',
}

/** @type {Map<string, WorkerOptimizationProfileDto>} */
const profiles = new Map()
/** @type {OptimizationHistoryRecordDto[]} */
let history = []
/** @type {Map<string, number>} */
const strategyChangeCounts = new Map()
/** @type {Map<string, number>} */
const previousOptimizationScores = new Map()
let seq = 0

function nextId() {
  seq += 1
  return `opt-${Date.now()}-${seq}`
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
function buildMetrics(runtimeCtx, workerId) {
  getLearningStatisticsLocal(runtimeCtx)
  const learning = getLearningStatisticsLocal(runtimeCtx)
  const decision = getCompanyDecisionSummaryLocal(runtimeCtx)
  const signals = getCombinedDecisionSignals(runtimeCtx)
  const exec = buildExecutionSummaryLocal(runtimeCtx.todayIso)
  const snapshots = BusinessEngine.computeOrderSnapshots(runtimeCtx.orders, runtimeCtx.dtos, runtimeCtx.todayIso)
  const domains = scoreOperationalDomains({
    snapshots: [...snapshots.values()],
    domainEvents: getAllDomainEventsSnapshot(),
    todayIso: runtimeCtx.todayIso,
  })

  const workerDecisions = getDecisionHistoryLocal({ limit: 100 }).filter((r) => r.workerId === workerId)
  const avgDecision =
    workerDecisions.length > 0
      ? Math.round(workerDecisions.reduce((s, r) => s + r.decisionScore, 0) / workerDecisions.length)
      : decision.avgDecisionScore || signals.decisionScore

  const avgRisk =
    workerDecisions.length > 0
      ? Math.round(
          workerDecisions.reduce((s, r) => s + r.criteria.riskReduction, 0) / workerDecisions.length,
        )
      : 55

  const executionSuccess =
    exec.today > 0 ? Math.round((exec.success / exec.today) * 100) : 72
  const approvalRate =
    exec.today > 0 ? Math.round(((exec.today - (exec.waiting ?? 0)) / exec.today) * 100) : 70

  const riskPressure = Math.max(domains.shipment.pressure, domains.collection.pressure, domains.procurement.pressure)

  return {
    predictionAccuracy: learning.predictionAccuracy,
    learningScore: learning.learningScore,
    decisionScore: avgDecision,
    executionSuccess,
    approvalRate,
    riskReduction: Math.max(20, avgRisk - riskPressure * 4),
  }
}

/**
 * @param {string} workerId
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
function optimizeWorker(workerId, runtimeCtx) {
  const existing =
    profiles.get(workerId) ??
    ({
      workerId,
      workerLabel: WORKER_LABELS[workerId] ?? workerId,
      optimizationScore: 65,
      strategyVersion: 1,
      currentStrategy: createDefaultStrategy(`${WORKER_LABELS[workerId] ?? workerId} v1`),
      previousStrategy: null,
      lastOptimizedAt: runtimeCtx.todayIso,
    })

  const metrics = buildMetrics(runtimeCtx, workerId)
  const { strategy: nextStrategy, reasons } = applyOptimizationRules(existing.currentStrategy, metrics)
  const optimizationScore = computeOptimizationScore(metrics, nextStrategy)
  const prevScore = previousOptimizationScores.get(workerId) ?? existing.optimizationScore
  previousOptimizationScores.set(workerId, optimizationScore)

  let strategyVersion = existing.strategyVersion
  let previousStrategy = existing.previousStrategy
  let currentStrategy = existing.currentStrategy

  if (!strategiesEqual(existing.currentStrategy, nextStrategy)) {
    previousStrategy = { ...existing.currentStrategy }
    currentStrategy = nextStrategy
    strategyVersion += 1
    strategyChangeCounts.set(workerId, (strategyChangeCounts.get(workerId) ?? 0) + 1)
    history.unshift({
      id: nextId(),
      workerId,
      strategyVersion,
      previousStrategy,
      currentStrategy: { ...nextStrategy },
      optimizationScore,
      reason: reasons.join(' · ') || 'Strateji güncellendi',
      occurredAt: `${runtimeCtx.todayIso}T09:00:00.000Z`,
    })
  } else {
    currentStrategy = nextStrategy
  }

  if (metrics.learningScore >= 70) {
    updateConfidenceFromDecisionOutcome(Math.max(optimizationScore, metrics.learningScore))
  }

  const profile = {
    workerId,
    workerLabel: WORKER_LABELS[workerId] ?? workerId,
    optimizationScore,
    strategyVersion,
    currentStrategy,
    previousStrategy,
    lastOptimizedAt: runtimeCtx.todayIso,
    scoreDelta: optimizationScore - prevScore,
  }

  profiles.set(workerId, profile)
  history = history.slice(0, 200)
  return profile
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function runSelfOptimizationScan(runtimeCtx) {
  getCompanyDecisionSummaryLocal(runtimeCtx)
  for (const workerId of WORKER_IDS) {
    optimizeWorker(workerId, runtimeCtx)
  }
  return getCompanyOptimizationSummaryLocal(runtimeCtx)
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function getCompanyOptimizationSummaryLocal(runtimeCtx) {
  const started = Date.now()
  if (!profiles.size) runSelfOptimizationScan(runtimeCtx)

  const workers = [...profiles.values()]
  const avgOptimizationScore = workers.length
    ? Math.round(workers.reduce((s, w) => s + w.optimizationScore, 0) / workers.length)
    : 0

  const mostImproved = [...workers].sort((a, b) => (b.scoreDelta ?? 0) - (a.scoreDelta ?? 0))[0]
  const mostChanges = [...workers].sort(
    (a, b) => (strategyChangeCounts.get(b.workerId) ?? 0) - (strategyChangeCounts.get(a.workerId) ?? 0),
  )[0]

  return {
    workers,
    recentHistory: history.slice(0, 20),
    avgOptimizationScore,
    mostImprovedWorkerId: mostImproved?.workerId ?? WORKER_IDS[0],
    mostStrategyChangesWorkerId: mostChanges?.workerId ?? WORKER_IDS[0],
    meta: { durationMs: Date.now() - started },
  }
}

/**
 * @param {string} workerId
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function getWorkerOptimizationLocal(workerId, runtimeCtx) {
  if (!profiles.has(workerId)) optimizeWorker(workerId, runtimeCtx)
  return profiles.get(workerId) ?? null
}

/**
 * @param {{ limit?: number }} [opts]
 */
export function getOptimizationHistoryLocal(opts = {}) {
  return history.slice(0, opts.limit ?? 50)
}

/**
 * @param {string} workerId
 */
export function getWorkerStrategy(workerId) {
  return profiles.get(workerId)?.currentStrategy ?? createDefaultStrategy()
}

/**
 * @param {CompanyManagerDecisionDto[]} decisions
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function rankDecisionsWithOptimization(decisions, runtimeCtx) {
  runSelfOptimizationScan(runtimeCtx)
  const signals = getCombinedDecisionSignals(runtimeCtx)

  return [...decisions].sort((a, b) => {
    const workerA = a.targetWorkerId ?? a.workerId ?? 'dw-ceo-assistant'
    const workerB = b.targetWorkerId ?? b.workerId ?? 'dw-ceo-assistant'
    const optA = profiles.get(workerA)?.optimizationScore ?? 65
    const optB = profiles.get(workerB)?.optimizationScore ?? 65
    const scoreA = computeFullDistributionScore(
      optA,
      signals.decisionScore,
      signals.predictionConfidence,
      signals.learningScore,
    )
    const scoreB = computeFullDistributionScore(
      optB,
      signals.decisionScore,
      signals.predictionConfidence,
      signals.learningScore,
    )
    return scoreB - scoreA
  })
}

/**
 * @param {string} workerId
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function getWorkerPredictionWeight(workerId, runtimeCtx) {
  const profile = getWorkerOptimizationLocal(workerId, runtimeCtx)
  return profile?.currentStrategy.predictionWeight ?? 0.25
}

export function resetSelfOptimizationStoreForTests() {
  profiles.clear()
  history = []
  strategyChangeCounts.clear()
  previousOptimizationScores.clear()
  seq = 0
}

export {}
