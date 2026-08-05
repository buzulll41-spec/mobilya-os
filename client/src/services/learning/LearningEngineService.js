import { PREDICTION_LEARNING_STATUS } from '../../contracts/v1/predictionLearning.js'
import {
  applyConfidenceChange,
  comparePredictionToActual,
  computeAggregateLearningScore,
  computeConfidenceChange,
  computeFieldAccuracyStats,
  DEFAULT_CONFIDENCE,
  deriveActualOutcome,
  isReadyForEvaluation,
  predictionToOutcomeVector,
  addDaysIso,
} from '../../engine/learning/PredictionLearningEngine.js'
import { buildOrderPredictions } from '../../engine/prediction/PredictionEngine.js'
import { buildKnowledgeGraphFromMock } from '../graph/KnowledgeGraphService.js'

/** @typedef {import('../../contracts/v1/predictionLearning.js').PredictionLearningRecordDto} PredictionLearningRecordDto */
/** @typedef {import('../../contracts/v1/predictionLearning.js').CompanyPredictionLearningDto} CompanyPredictionLearningDto */
/** @typedef {import('../../contracts/v1/predictionLearning.js').PredictionLearningStatisticsDto} PredictionLearningStatisticsDto */

/** @type {PredictionLearningRecordDto[]} */
let records = []
let confidence = DEFAULT_CONFIDENCE

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function recordPredictionsForLearning(runtimeCtx) {
  const graph = buildKnowledgeGraphFromMock(runtimeCtx)
  const predictions = buildOrderPredictions({ ...runtimeCtx, graph })
  const existing = new Set(records.filter((r) => r.status === PREDICTION_LEARNING_STATUS.PENDING).map((r) => r.orderId))

  for (const prediction of predictions) {
    if (existing.has(prediction.orderId)) continue
    const predictedAt = addDaysIso(runtimeCtx.todayIso, -3)
    records.unshift({
      id: `pl-${prediction.orderId}-${predictedAt}`,
      orderId: prediction.orderId,
      predictedAt,
      evaluatedAt: null,
      prediction: predictionToOutcomeVector(prediction),
      actualResult: null,
      accuracy: null,
      accuracyOverall: 0,
      confidenceChange: 0,
      learningScore: 0,
      status: PREDICTION_LEARNING_STATUS.PENDING,
    })
  }
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function evaluatePendingLearningRecords(runtimeCtx) {
  const dtoById = new Map(runtimeCtx.dtos.map((d) => [d.id, d]))
  let changed = false

  for (const record of records) {
    if (record.status !== PREDICTION_LEARNING_STATUS.PENDING) continue
    if (!isReadyForEvaluation(record.predictedAt, runtimeCtx.todayIso)) continue

    const order = runtimeCtx.orders.find((o) => o.id === record.orderId)
    if (!order) continue

    const actual = deriveActualOutcome(order, dtoById.get(order.id), runtimeCtx.todayIso)
    const { accuracy, accuracyOverall } = comparePredictionToActual(record.prediction, actual)
    const confidenceChange = computeConfidenceChange(accuracyOverall, confidence)
    confidence = applyConfidenceChange(confidence, confidenceChange)

    record.actualResult = actual
    record.accuracy = accuracy
    record.accuracyOverall = accuracyOverall
    record.confidenceChange = confidenceChange
    record.learningScore = accuracyOverall
    record.evaluatedAt = runtimeCtx.todayIso
    record.status = PREDICTION_LEARNING_STATUS.EVALUATED
    changed = true
  }

  return changed
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 */
function ensureLearning(runtimeCtx) {
  if (!records.length) recordPredictionsForLearning(runtimeCtx)
  evaluatePendingLearningRecords(runtimeCtx)
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function getCompanyLearningLocal(runtimeCtx) {
  const started = Date.now()
  ensureLearning(runtimeCtx)
  const evaluated = records.filter((r) => r.status === PREDICTION_LEARNING_STATUS.EVALUATED)
  const pending = records.filter((r) => r.status === PREDICTION_LEARNING_STATUS.PENDING)
  const fieldStats = computeFieldAccuracyStats(evaluated)
  const predictionAccuracy = computeAggregateLearningScore(evaluated)
  const learningScore = computeAggregateLearningScore(evaluated)

  /** @type {PredictionLearningStatisticsDto} */
  const statistics = {
    totalRecords: records.length,
    evaluatedRecords: evaluated.length,
    pendingRecords: pending.length,
    predictionAccuracy,
    confidence,
    learningScore,
    bestField: fieldStats.bestField,
    worstField: fieldStats.worstField,
    fieldAccuracy: fieldStats.fieldAccuracy,
    meta: { durationMs: Date.now() - started },
  }

  return {
    recentRecords: records.slice(0, 20),
    statistics,
  }
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 * @param {string} orderId
 */
export function getOrderLearningLocal(runtimeCtx, orderId) {
  ensureLearning(runtimeCtx)
  return records.filter((r) => r.orderId === orderId)
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function getLearningStatisticsLocal(runtimeCtx) {
  return getCompanyLearningLocal(runtimeCtx).statistics
}

export function getPredictionConfidence() {
  return confidence
}

/**
 * @param {number} decisionScore
 */
export function updateConfidenceFromDecisionOutcome(decisionScore) {
  const change =
    decisionScore >= 75 ? 2 : decisionScore >= 60 ? 1 : decisionScore >= 45 ? 0 : decisionScore >= 35 ? -2 : -4
  confidence = applyConfidenceChange(confidence, change)
}

export function resetLearningStoreForTests() {
  records = []
  confidence = DEFAULT_CONFIDENCE
}

/**
 * Test helper — pending kaydı hemen değerlendirilebilir yapar.
 * @param {string} recordId
 * @param {string} predictedAt
 */
export function forceRecordPredictedAtForTests(recordId, predictedAt) {
  const record = records.find((r) => r.id === recordId)
  if (record) record.predictedAt = predictedAt
}

export {}
