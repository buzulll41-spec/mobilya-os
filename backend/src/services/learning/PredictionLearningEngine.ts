import { PREDICTION_LEARNING_FIELD } from '../../contracts/predictionLearningDto.js'
import type { PredictionOutcomeVector } from '../../contracts/predictionLearningDto.js'
import type { OrderPredictionDto } from '../../contracts/predictionDto.js'

export const LEARNING_EVALUATION_DAYS = 3
export const DEFAULT_CONFIDENCE = 70

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(n)))

export function predictionToOutcomeVector(prediction: OrderPredictionDto): PredictionOutcomeVector {
  return {
    delayPrediction: prediction.delayProbability,
    paymentPrediction: prediction.paymentRiskProbability,
    cancelPrediction: prediction.cancelProbability,
    supplierPrediction: prediction.supplierDelayProbability,
    stockPrediction: prediction.stockRiskProbability,
  }
}

export type ActualOutcomeInput = {
  displayStatus: string
  remainingAmount: number
  dueDate: string | null
  terminOverdue: boolean
  supplyWaiting: boolean
  supplyPartial: boolean
  supplyIncomplete: boolean
}

export function deriveActualOutcomeFromInput(input: ActualOutcomeInput): PredictionOutcomeVector {
  const delivered = input.displayStatus === 'Teslim Edildi'
  const cancelled = input.displayStatus === 'İptal'

  let delayPrediction = 15
  if (delivered) delayPrediction = input.terminOverdue ? 55 : 5
  else if (input.terminOverdue) delayPrediction = 100

  let paymentPrediction = 0
  if (!cancelled) {
    if (input.dueDate && input.dueDate < new Date().toISOString().slice(0, 10) && input.remainingAmount > 0.009) {
      paymentPrediction = 100
    } else if (input.remainingAmount > 0.009 && delivered) {
      paymentPrediction = 85
    } else if (input.remainingAmount > 0.009) {
      paymentPrediction = 35
    }
  }

  let supplierPrediction = 10
  if (input.supplyWaiting) supplierPrediction = 100
  else if (input.supplyPartial) supplierPrediction = 65
  else if (input.supplyIncomplete) supplierPrediction = 40

  let stockPrediction = 10
  if (input.supplyWaiting) stockPrediction = 100
  else if (input.supplyPartial) stockPrediction = 55
  else if (input.supplyIncomplete) stockPrediction = 30

  return {
    delayPrediction: clamp(delayPrediction),
    paymentPrediction: clamp(paymentPrediction),
    cancelPrediction: cancelled ? 100 : 0,
    supplierPrediction: clamp(supplierPrediction),
    stockPrediction: clamp(stockPrediction),
  }
}

export function comparePredictionToActual(
  prediction: PredictionOutcomeVector,
  actual: PredictionOutcomeVector,
): { accuracy: PredictionOutcomeVector; accuracyOverall: number } {
  const fields = Object.values(PREDICTION_LEARNING_FIELD)
  /** @type {PredictionOutcomeVector} */
  const accuracy = {} as PredictionOutcomeVector
  let sum = 0
  for (const field of fields) {
    const fieldAccuracy = clamp(100 - Math.abs(prediction[field] - actual[field]))
    accuracy[field] = fieldAccuracy
    sum += fieldAccuracy
  }
  return { accuracy, accuracyOverall: clamp(sum / fields.length) }
}

export function computeConfidenceChange(accuracyOverall: number): number {
  if (accuracyOverall >= 80) return 5
  if (accuracyOverall >= 70) return 3
  if (accuracyOverall >= 60) return 1
  if (accuracyOverall >= 50) return 0
  if (accuracyOverall >= 40) return -4
  return -7
}

export function applyConfidenceChange(currentConfidence: number, confidenceChange: number): number {
  return clamp(currentConfidence + confidenceChange)
}

export function addDaysIso(fromIso: string, days: number): string {
  const d = new Date(`${fromIso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function isReadyForEvaluation(predictedAt: string, todayIso: string): boolean {
  return addDaysIso(predictedAt, LEARNING_EVALUATION_DAYS) <= todayIso
}

export function computeAggregateLearningScore(
  records: Array<{ accuracyOverall: number; learningScore: number }>,
): number {
  if (!records.length) return DEFAULT_CONFIDENCE
  const sum = records.reduce((acc, r) => acc + (r.learningScore || r.accuracyOverall || 0), 0)
  return clamp(sum / records.length)
}

export function computeFieldAccuracyStats(
  records: Array<{ accuracy: PredictionOutcomeVector | null }>,
): { fieldAccuracy: Record<string, number>; bestField: string; worstField: string } {
  const totals: Record<string, number> = {}
  const counts: Record<string, number> = {}
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
  const fieldAccuracy: Record<string, number> = {}
  for (const field of Object.values(PREDICTION_LEARNING_FIELD)) {
    fieldAccuracy[field] = counts[field] ? clamp(totals[field] / counts[field]) : 0
  }
  const entries = Object.entries(fieldAccuracy)
  const best = [...entries].sort((a, b) => b[1] - a[1])[0]
  const worst = [...entries].sort((a, b) => a[1] - b[1])[0]
  return {
    fieldAccuracy,
    bestField: best?.[0] ?? PREDICTION_LEARNING_FIELD.DELAY,
    worstField: worst?.[0] ?? PREDICTION_LEARNING_FIELD.DELAY,
  }
}
