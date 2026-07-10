import { PREDICTION_LEARNING_FIELD } from '../../contracts/v1/predictionLearning.js'
import { summarizeLineSupply } from '../../mappers/operation-map/operationMapModel.js'
import { moneyToNumber } from '../../mappers/moneyHelpers.js'
import { isTerminOverdue, remainingBalance } from '../../utils/orderFinance.js'

/** @typedef {import('../../contracts/v1/predictionLearning.js').PredictionOutcomeVector} PredictionOutcomeVector */
/** @typedef {import('../../contracts/v1/prediction.js').OrderPredictionDto} OrderPredictionDto */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

export const LEARNING_EVALUATION_DAYS = 3
export const DEFAULT_CONFIDENCE = 70

const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(n)))

/**
 * @param {OrderPredictionDto} prediction
 */
export function predictionToOutcomeVector(prediction) {
  return {
    delayPrediction: prediction.delayProbability,
    paymentPrediction: prediction.paymentRiskProbability,
    cancelPrediction: prediction.cancelProbability,
    supplierPrediction: prediction.supplierDelayProbability,
    stockPrediction: prediction.stockRiskProbability,
  }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
export function deriveActualOutcome(order, dto, todayIso) {
  const summary = summarizeLineSupply(order.id)
  const remaining = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)
  const terminPast = isTerminOverdue(order, todayIso)
  const delivered = order.status === 'Teslim Edildi' || dto?.displayStatus === 'Teslim Edildi'
  const cancelled = order.status === 'İptal' || dto?.displayStatus === 'İptal'

  let delayPrediction = 15
  if (delivered) delayPrediction = terminPast ? 55 : 5
  else if (terminPast) delayPrediction = 100
  else if (order.status === 'Yolda') delayPrediction = 45

  let paymentPrediction = 0
  if (cancelled) paymentPrediction = 0
  else if (dto?.hasOverdueBalance || (order.dueDate && order.dueDate < todayIso && remaining > 0.009)) {
    paymentPrediction = 100
  } else if (remaining > 0.009 && delivered) {
    paymentPrediction = 85
  } else if (remaining > 0.009) {
    paymentPrediction = 35
  }

  const cancelPrediction = cancelled ? 100 : 0

  let supplierPrediction = 10
  if (summary?.anyWaiting) supplierPrediction = 100
  else if (summary?.anyPartial) supplierPrediction = 65
  else if (summary && !summary.allSent) supplierPrediction = 40

  let stockPrediction = 10
  if (summary?.anyWaiting) stockPrediction = 100
  else if (summary?.anyPartial) stockPrediction = 55
  else if (summary && !summary.allArrived) stockPrediction = 30

  return {
    delayPrediction: clamp(delayPrediction),
    paymentPrediction: clamp(paymentPrediction),
    cancelPrediction: clamp(cancelPrediction),
    supplierPrediction: clamp(supplierPrediction),
    stockPrediction: clamp(stockPrediction),
  }
}

/**
 * @param {PredictionOutcomeVector} prediction
 * @param {PredictionOutcomeVector} actual
 */
export function comparePredictionToActual(prediction, actual) {
  /** @type {PredictionOutcomeVector} */
  const accuracy = {}
  const fields = Object.values(PREDICTION_LEARNING_FIELD)
  let sum = 0
  for (const field of fields) {
    const diff = Math.abs(prediction[field] - actual[field])
    const fieldAccuracy = clamp(100 - diff)
    accuracy[field] = fieldAccuracy
    sum += fieldAccuracy
  }
  return {
    accuracy,
    accuracyOverall: clamp(sum / fields.length),
  }
}

/**
 * @param {number} accuracyOverall
 * @param {number} currentConfidence
 */
export function computeConfidenceChange(accuracyOverall, currentConfidence = DEFAULT_CONFIDENCE) {
  void currentConfidence
  if (accuracyOverall >= 80) return 5
  if (accuracyOverall >= 70) return 3
  if (accuracyOverall >= 60) return 1
  if (accuracyOverall >= 50) return 0
  if (accuracyOverall >= 40) return -4
  return -7
}

/**
 * @param {number} currentConfidence
 * @param {number} confidenceChange
 */
export function applyConfidenceChange(currentConfidence, confidenceChange) {
  return clamp(currentConfidence + confidenceChange)
}

/**
 * @param {string} fromIso
 * @param {number} days
 */
export function addDaysIso(fromIso, days) {
  const d = new Date(`${fromIso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * @param {string} predictedAt
 * @param {string} todayIso
 */
export function isReadyForEvaluation(predictedAt, todayIso) {
  return addDaysIso(predictedAt, LEARNING_EVALUATION_DAYS) <= todayIso
}

/**
 * @param {Array<{ accuracyOverall: number, learningScore: number }>} records
 */
export function computeAggregateLearningScore(records) {
  if (!records.length) return DEFAULT_CONFIDENCE
  const sum = records.reduce((acc, r) => acc + (r.learningScore || r.accuracyOverall || 0), 0)
  return clamp(sum / records.length)
}

/**
 * @param {Array<{ accuracy: PredictionOutcomeVector | null }>} records
 */
export function computeFieldAccuracyStats(records) {
  /** @type {Record<string, number>} */
  const totals = {}
  /** @type {Record<string, number>} */
  const counts = {}
  for (const field of Object.values(PREDICTION_LEARNING_FIELD)) {
    totals[field] = 0
    counts[field] = 0
  }
  for (const record of records) {
    if (!record.accuracy) continue
    for (const field of Object.values(PREDICTION_LEARNING_FIELD)) {
      totals[field] += record.accuracy[field]
      counts[field] += 1
    }
  }
  /** @type {Record<string, number>} */
  const fieldAccuracy = {}
  for (const field of Object.values(PREDICTION_LEARNING_FIELD)) {
    fieldAccuracy[field] = counts[field] ? clamp(totals[field] / counts[field]) : 0
  }
  const entries = Object.entries(fieldAccuracy)
  const best = entries.sort((a, b) => b[1] - a[1])[0]
  const worst = entries.sort((a, b) => a[1] - b[1])[0]
  return {
    fieldAccuracy,
    bestField: best?.[0] ?? PREDICTION_LEARNING_FIELD.DELAY,
    worstField: worst?.[0] ?? PREDICTION_LEARNING_FIELD.DELAY,
  }
}

export {}
