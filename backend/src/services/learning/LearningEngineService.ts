import type { PrismaClient } from '@prisma/client'
import {
  PREDICTION_LEARNING_STATUS,
  type CompanyPredictionLearningDto,
  type OrderPredictionLearningDto,
  type PredictionLearningRecordDto,
  type PredictionLearningStatisticsDto,
} from '../../contracts/predictionLearningDto.js'
import { getOrderPrediction } from '../prediction/PredictionService.js'
import {
  applyConfidenceChange,
  comparePredictionToActual,
  computeAggregateLearningScore,
  computeConfidenceChange,
  computeFieldAccuracyStats,
  DEFAULT_CONFIDENCE,
  deriveActualOutcomeFromInput,
  isReadyForEvaluation,
  predictionToOutcomeVector,
  addDaysIso,
} from './PredictionLearningEngine.js'

/** @type {PredictionLearningRecordDto[]} */
let records: PredictionLearningRecordDto[] = []
let confidence = DEFAULT_CONFIDENCE
let seeded = false

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

async function seedPredictionsIfNeeded(prisma: PrismaClient) {
  if (seeded) return
  const today = todayIso()
  const orders = await prisma.salesOrder.findMany({
    where: { NOT: { displayStatus: 'İptal' } },
    take: 50,
  })

  for (const order of orders) {
    const prediction = await getOrderPrediction(prisma, order.id)
    if (!prediction) continue
    records.unshift({
      id: `pl-${order.id}-${today}`,
      orderId: order.id,
      predictedAt: addDaysIso(today, -3),
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
  seeded = true
}

async function evaluatePendingRecords(prisma: PrismaClient) {
  const today = todayIso()
  for (const record of records) {
    if (record.status !== PREDICTION_LEARNING_STATUS.PENDING) continue
    if (!isReadyForEvaluation(record.predictedAt, today)) continue

    const order = await prisma.salesOrder.findUnique({
      where: { id: record.orderId },
      include: { lines: true },
    })
    if (!order) continue

    const remaining = Number(order.remainingAmount)
    const terminOverdue = Boolean(order.dueDate && order.dueDate < new Date() && remaining > 0.009)
    const supplyWaiting = order.lines.some((l) => !l.shipmentReady)
    const supplyPartial = order.lines.some((l) => l.shipmentReady) && supplyWaiting

    const actual = deriveActualOutcomeFromInput({
      displayStatus: order.displayStatus,
      remainingAmount: remaining,
      dueDate: order.dueDate?.toISOString().slice(0, 10) ?? null,
      terminOverdue,
      supplyWaiting,
      supplyPartial,
      supplyIncomplete: order.lines.some((l) => !l.shipmentReady),
    })

    const { accuracy, accuracyOverall } = comparePredictionToActual(record.prediction, actual)
    const confidenceChange = computeConfidenceChange(accuracyOverall)
    confidence = applyConfidenceChange(confidence, confidenceChange)

    record.actualResult = actual
    record.accuracy = accuracy
    record.accuracyOverall = accuracyOverall
    record.confidenceChange = confidenceChange
    record.learningScore = accuracyOverall
    record.evaluatedAt = today
    record.status = PREDICTION_LEARNING_STATUS.EVALUATED
  }
}

async function ensureLearning(prisma: PrismaClient) {
  await seedPredictionsIfNeeded(prisma)
  await evaluatePendingRecords(prisma)
}

export async function getCompanyLearning(prisma: PrismaClient): Promise<CompanyPredictionLearningDto> {
  const started = Date.now()
  await ensureLearning(prisma)
  const evaluated = records.filter((r) => r.status === PREDICTION_LEARNING_STATUS.EVALUATED)
  const pending = records.filter((r) => r.status === PREDICTION_LEARNING_STATUS.PENDING)
  const fieldStats = computeFieldAccuracyStats(evaluated)
  const predictionAccuracy = computeAggregateLearningScore(evaluated)
  const learningScore = computeAggregateLearningScore(evaluated)

  const statistics: PredictionLearningStatisticsDto = {
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

export async function getOrderLearning(
  prisma: PrismaClient,
  orderId: string,
): Promise<OrderPredictionLearningDto | null> {
  await ensureLearning(prisma)
  const orderRecords = records.filter((r) => r.orderId === orderId)
  if (!orderRecords.length) return null
  return { orderId, records: orderRecords }
}

export async function getLearningStatistics(prisma: PrismaClient): Promise<PredictionLearningStatisticsDto> {
  const company = await getCompanyLearning(prisma)
  return company.statistics
}

export function resetLearningStoreForTests(): void {
  records = []
  confidence = DEFAULT_CONFIDENCE
  seeded = false
}

export function getPredictionConfidenceValue(): number {
  return confidence
}
