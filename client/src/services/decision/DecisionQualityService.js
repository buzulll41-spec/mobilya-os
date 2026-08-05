import { DECISION_QUALITY_SOURCE } from '../../contracts/v1/decisionQuality.js'
import { AI_COMPANY_MANAGER_WORKER_ID } from '../../contracts/v1/aiCompanyManager.js'
import {
  computeCombinedDistributionScore,
  computeDecisionConfidence,
  computeDecisionScore,
  scoreDecisionCriteria,
} from '../../engine/decision/DecisionQualityEngine.js'
import { getLearningStatisticsLocal, getPredictionConfidence, updateConfidenceFromDecisionOutcome } from '../learning/LearningEngineService.js'
import { getOrderPredictionLocal } from '../prediction/PredictionService.js'
import { buildExecutionSummaryLocal } from '../ai-tools/mockAiToolExecutionStore.js'

/** @typedef {import('../../contracts/v1/decisionQuality.js').DecisionQualityRecordDto} DecisionQualityRecordDto */
/** @typedef {import('../../contracts/v1/decisionQuality.js').CompanyDecisionSummaryDto} CompanyDecisionSummaryDto */
/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */

/** @type {DecisionQualityRecordDto[]} */
let records = []
let seq = 0

const WORKER_LABELS = {
  'dw-collection': 'Collection AI',
  'dw-shipment': 'Shipment AI',
  'dw-sales-follow-up': 'Sales AI',
  'dw-procurement': 'Procurement AI',
  'dw-ceo-assistant': 'Company Manager',
}

function nextId(prefix) {
  seq += 1
  return `${prefix}-${Date.now()}-${seq}`
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 * }} runtimeCtx
 */
function buildSignals(runtimeCtx, orderId) {
  getLearningStatisticsLocal(runtimeCtx)
  const learning = getLearningStatisticsLocal(runtimeCtx)
  const exec = buildExecutionSummaryLocal(runtimeCtx.todayIso)
  const pred = orderId ? getOrderPredictionLocal(runtimeCtx, orderId) : null
  const approvalRate =
    exec.today > 0 ? Math.round(((exec.today - (exec.waiting ?? 0)) / exec.today) * 100) : 70
  const executionSuccessRate =
    exec.today > 0 ? Math.round((exec.success / exec.today) * 100) : 72

  return {
    predictionAccuracy: learning.predictionAccuracy,
    learningScore: learning.learningScore,
    predictionConfidence: getPredictionConfidence(),
    executionSuccessRate,
    approvalRate,
    userFeedback: clampFeedback(exec.waiting ?? 0),
    orderPredictionScore: pred?.predictionScore ?? 0,
  }
}

/** @param {number} waiting */
function clampFeedback(waiting) {
  return Math.min(95, Math.max(55, 82 - waiting * 3))
}

/**
 * @param {CompanyManagerDecisionDto} decision
 * @param {ReturnType<typeof buildSignals>} signals
 */
function buildRecordFromCompanyDecision(decision, signals) {
  const criteria = scoreDecisionCriteria(decision, signals)
  if (signals.orderPredictionScore > 0) {
    criteria.predictionAccuracy = Math.round(
      (criteria.predictionAccuracy + signals.orderPredictionScore) / 2,
    )
  }
  const decisionScore = computeDecisionScore(criteria)
  const confidence = computeDecisionConfidence(
    criteria,
    decisionScore,
    signals.predictionConfidence,
    signals.learningScore,
  )
  return {
    id: nextId('dq'),
    source: DECISION_QUALITY_SOURCE.COMPANY_MANAGER,
    workerId: decision.workerId ?? decision.targetWorkerId ?? AI_COMPANY_MANAGER_WORKER_ID,
    decisionType: decision.type,
    orderId: decision.orderId,
    message: decision.message,
    occurredAt: decision.occurredAt,
    criteria,
    decisionScore,
    confidence,
  }
}

function daysAgoIso(todayIso, days) {
  const d = new Date(`${todayIso}T12:00:00`)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * @param {CompanyManagerDecisionDto | { type: string, priority?: string, orderId?: string, score?: number, taskTitle?: string, message?: string, occurredAt?: string }} decision
 * @param {ReturnType<typeof buildSignals>} signals
 * @param {string} workerId
 */
function buildRecordFromWorkerAssessment(decision, workerId, signals) {
  const criteria = scoreDecisionCriteria(
    { ...decision, type: decision.type ?? 'WORKER_ASSESSMENT', score: decision.score },
    signals,
  )
  const decisionScore = computeDecisionScore(criteria)
  const confidence = computeDecisionConfidence(
    criteria,
    decisionScore,
    signals.predictionConfidence,
    signals.learningScore,
  )
  return {
    id: nextId('dq'),
    source: DECISION_QUALITY_SOURCE.AI_WORKER,
    workerId,
    decisionType: decision.type ?? 'WORKER_ASSESSMENT',
    orderId: decision.orderId,
    message: decision.message ?? decision.taskTitle ?? 'Worker assessment',
    occurredAt: decision.occurredAt ?? new Date().toISOString(),
    criteria,
    decisionScore,
    confidence,
  }
}

/**
 * @param {CompanyManagerDecisionDto[]} decisions
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function recordCompanyManagerDecisionQuality(decisions, runtimeCtx) {
  /** @type {DecisionQualityRecordDto[]} */
  const created = []
  for (const decision of decisions) {
    const signals = buildSignals(runtimeCtx, decision.orderId)
    const record = buildRecordFromCompanyDecision(decision, signals)
    records.unshift(record)
    created.push(record)
    updateConfidenceFromDecisionOutcome(record.decisionScore)
  }
  records = records.slice(0, 500)
  return created
}

/**
 * @param {CompanyManagerDecisionDto[]} decisions
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function rankCompanyManagerDecisionsByQuality(decisions, runtimeCtx) {
  const signals = buildSignals(runtimeCtx)
  return [...decisions].sort((a, b) => {
    const scoreA = computeCombinedDistributionScore(
      computeDecisionScore(scoreDecisionCriteria(a, signals)),
      signals.predictionConfidence,
      signals.learningScore,
    )
    const scoreB = computeCombinedDistributionScore(
      computeDecisionScore(scoreDecisionCriteria(b, signals)),
      signals.predictionConfidence,
      signals.learningScore,
    )
    return scoreB - scoreA
  })
}

/**
 * @param {{
 *   orderId: string
 *   score: number
 *   taskTitle?: string
 *   type?: string
 *   occurredAt?: string
 *   message?: string
 * }} assessment
 * @param {string} workerId
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function recordWorkerDecisionQuality(assessment, workerId, runtimeCtx) {
  const signals = buildSignals(runtimeCtx, assessment.orderId)
  const record = buildRecordFromWorkerAssessment(
    {
      type: assessment.type ?? 'WORKER_ASSESSMENT',
      orderId: assessment.orderId,
      score: assessment.score,
      taskTitle: assessment.taskTitle,
      message: assessment.message ?? assessment.taskTitle,
      occurredAt: assessment.occurredAt ?? `${runtimeCtx.todayIso}T09:00:00.000Z`,
    },
    workerId,
    signals,
  )
  records.unshift(record)
  records = records.slice(0, 500)
  updateConfidenceFromDecisionOutcome(record.decisionScore)
  return record
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function getCompanyDecisionSummaryLocal(runtimeCtx) {
  const started = Date.now()
  getLearningStatisticsLocal(runtimeCtx)
  if (!records.length) {
    return emptyCompanySummary(started)
  }

  const avg = (field) =>
    Math.round(records.reduce((sum, r) => sum + r[field], 0) / records.length)
  const avgCriteria = (key) =>
    Math.round(records.reduce((sum, r) => sum + r.criteria[key], 0) / records.length)

  const byWorker = aggregateByWorker(records)
  const topWorkers = [...byWorker].sort((a, b) => b.avgDecisionScore - a.avgDecisionScore).slice(0, 5)
  const lowQuality = [...records].sort((a, b) => a.decisionScore - b.decisionScore).slice(0, 8)
  const riskReductionLeaders = [...records]
    .sort((a, b) => b.criteria.riskReduction - a.criteria.riskReduction)
    .slice(0, 8)

  const cutoff = daysAgoIso(runtimeCtx.todayIso, 30)
  const last30 = records.filter((r) => r.occurredAt.slice(0, 10) >= cutoff)

  return {
    totalDecisions: records.length,
    avgDecisionScore: avg('decisionScore'),
    avgConfidence: avg('confidence'),
    avgPredictionAccuracy: avgCriteria('predictionAccuracy'),
    avgLearningScore: avgCriteria('learningScore'),
    topWorkers,
    lowQualityDecisions: lowQuality.map((r) => ({
      workerId: r.workerId,
      workerLabel: WORKER_LABELS[r.workerId] ?? r.workerId,
      decisionCount: 1,
      avgDecisionScore: r.decisionScore,
      avgConfidence: r.confidence,
      message: r.message,
      decisionType: r.decisionType,
    })),
    riskReductionLeaders,
    meta: {
      last30DaysAvgScore: last30.length
        ? Math.round(last30.reduce((s, r) => s + r.decisionScore, 0) / last30.length)
        : avg('decisionScore'),
      last30DaysCount: last30.length,
      durationMs: Date.now() - started,
    },
  }
}

/** @param {DecisionQualityRecordDto[]} list */
function aggregateByWorker(list) {
  /** @type {Map<string, { sum: number, conf: number, count: number }>} */
  const map = new Map()
  for (const r of list) {
    const cur = map.get(r.workerId) ?? { sum: 0, conf: 0, count: 0 }
    cur.sum += r.decisionScore
    cur.conf += r.confidence
    cur.count += 1
    map.set(r.workerId, cur)
  }
  return [...map.entries()].map(([workerId, v]) => ({
    workerId,
    workerLabel: WORKER_LABELS[workerId] ?? workerId,
    decisionCount: v.count,
    avgDecisionScore: Math.round(v.sum / v.count),
    avgConfidence: Math.round(v.conf / v.count),
  }))
}

function emptyCompanySummary(started) {
  return {
    totalDecisions: 0,
    avgDecisionScore: 0,
    avgConfidence: getPredictionConfidence(),
    avgPredictionAccuracy: 0,
    avgLearningScore: 0,
    topWorkers: [],
    lowQualityDecisions: [],
    riskReductionLeaders: [],
    meta: { last30DaysAvgScore: 0, last30DaysCount: 0, durationMs: Date.now() - started },
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
export function getWorkerDecisionSummaryLocal(workerId, runtimeCtx) {
  void runtimeCtx
  const workerRecords = records.filter((r) => r.workerId === workerId)
  if (!workerRecords.length) return null
  const avgDecisionScore = Math.round(
    workerRecords.reduce((s, r) => s + r.decisionScore, 0) / workerRecords.length,
  )
  const avgConfidence = Math.round(
    workerRecords.reduce((s, r) => s + r.confidence, 0) / workerRecords.length,
  )
  return {
    workerId,
    workerLabel: WORKER_LABELS[workerId] ?? workerId,
    decisionCount: workerRecords.length,
    avgDecisionScore,
    avgConfidence,
    recentRecords: workerRecords.slice(0, 15),
  }
}

/**
 * @param {{ limit?: number }} [opts]
 */
export function getDecisionHistoryLocal(opts = {}) {
  const limit = opts.limit ?? 50
  return records.slice(0, limit)
}

export function getCombinedDecisionSignals(runtimeCtx) {
  getLearningStatisticsLocal(runtimeCtx)
  const learningScore = getLearningStatisticsLocal(runtimeCtx).learningScore
  const predictionConfidence = getPredictionConfidence()
  const recent = records[0]
  const decisionScore = recent?.decisionScore ?? 65
  return {
    decisionScore,
    predictionConfidence,
    learningScore,
    combinedScore: computeCombinedDistributionScore(decisionScore, predictionConfidence, learningScore),
  }
}

export function resetDecisionQualityStoreForTests() {
  records = []
  seq = 0
}

export {}
