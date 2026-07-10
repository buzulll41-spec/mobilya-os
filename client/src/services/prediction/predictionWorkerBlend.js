import { blendWorkerScoreWithPrediction, predictionScoreForWorker } from '../../engine/prediction/PredictionEngine.js'
import { getOrderPredictionLocal } from './PredictionService.js'
import { getPredictionConfidence } from '../learning/LearningEngineService.js'
import { getWorkerOptimizationLocal, getWorkerPredictionWeight } from '../optimization/SelfOptimizationService.js'

/**
 * @param {import('../../data/seedOrders.js').Order[]} orders
 * @param {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} dtos
 * @param {string} todayIso
 */
export function buildWorkerRuntimeCtx(orders, dtos, todayIso) {
  return { orders, dtos, todayIso, collectionRows: [] }
}

const WORKER_ID_BY_KIND = {
  collection: 'dw-collection',
  shipment: 'dw-shipment',
  procurement: 'dw-procurement',
  sales: 'dw-sales-follow-up',
}

/**
 * @param {number} baseScore
 * @param {string} orderId
 * @param {'collection' | 'shipment' | 'procurement' | 'sales'} workerKind
 * @param {ReturnType<typeof buildWorkerRuntimeCtx>} runtimeCtx
 */
export function applyPredictionScoreToWorkerAssessment(baseScore, orderId, workerKind, runtimeCtx) {
  const pred = getOrderPredictionLocal(runtimeCtx, orderId)
  if (!pred) return baseScore

  const workerId = WORKER_ID_BY_KIND[workerKind]
  const predictionWeight = getWorkerPredictionWeight(workerId, runtimeCtx)
  const profile = getWorkerOptimizationLocal(workerId, runtimeCtx)
  const confidenceMultiplier = profile?.currentStrategy.confidenceMultiplier ?? 1
  const confidenceWeight = (getPredictionConfidence() / 100) * confidenceMultiplier
  const predScore = predictionScoreForWorker(pred, workerKind)

  return blendWorkerScoreWithPrediction(baseScore, predScore, 0.25 * predictionWeight * confidenceWeight)
}

export {}
