import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import { PREDICTION_LEARNING_STATUS } from '../../src/contracts/v1/predictionLearning.js'
import {
  applyConfidenceChange,
  comparePredictionToActual,
  computeConfidenceChange,
  DEFAULT_CONFIDENCE,
} from '../../src/engine/learning/PredictionLearningEngine.js'
import {
  getCompanyLearningLocal,
  getLearningStatisticsLocal,
  getOrderLearningLocal,
  getPredictionConfidence,
  resetLearningStoreForTests,
} from '../../src/services/learning/LearningEngineService.js'
import { resetPredictionCacheForTests } from '../../src/services/prediction/PredictionService.js'
import { resetKnowledgeGraphCacheForTests } from '../../src/services/graph/KnowledgeGraphService.js'
import { fetchCompanyLearning, fetchLearningStatistics } from '../../src/services/learningClient.js'
import { getOrderPredictionLocal } from '../../src/services/prediction/PredictionService.js'

describe('Learning Engine V1 (FAZ 105)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos
  const runtimeCtx = () => ({ orders, dtos, collectionRows: [], todayIso: DEMO_TODAY })

  beforeEach(() => {
    resetLearningStoreForTests()
    resetPredictionCacheForTests()
    resetKnowledgeGraphCacheForTests()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  describe('Prediction Compare', () => {
    it('tahmin ile gerçek sonucu karşılaştırır', () => {
      const prediction = {
        delayPrediction: 80,
        paymentPrediction: 70,
        cancelPrediction: 10,
        supplierPrediction: 60,
        stockPrediction: 55,
      }
      const actual = {
        delayPrediction: 85,
        paymentPrediction: 65,
        cancelPrediction: 0,
        supplierPrediction: 70,
        stockPrediction: 50,
      }
      const { accuracy, accuracyOverall } = comparePredictionToActual(prediction, actual)
      expect(accuracy.delayPrediction).toBeGreaterThan(80)
      expect(accuracyOverall).toBeGreaterThan(70)
    })

    it('yanlış tahmin düşük accuracy üretir', () => {
      const prediction = {
        delayPrediction: 10,
        paymentPrediction: 15,
        cancelPrediction: 5,
        supplierPrediction: 10,
        stockPrediction: 10,
      }
      const actual = {
        delayPrediction: 100,
        paymentPrediction: 100,
        cancelPrediction: 100,
        supplierPrediction: 100,
        stockPrediction: 100,
      }
      const { accuracyOverall } = comparePredictionToActual(prediction, actual)
      expect(accuracyOverall).toBeLessThan(30)
    })
  })

  describe('Learning Score', () => {
    it('değerlendirilen kayıtlarda learning score hesaplanır', () => {
      getOrderPredictionLocal(runtimeCtx(), orders[0].id)
      const company = getCompanyLearningLocal(runtimeCtx())
      expect(company.statistics.learningScore).toBeGreaterThan(0)
      expect(company.statistics.learningScore).toBeLessThanOrEqual(100)
    })
  })

  describe('Confidence Update', () => {
    it('doğru tahmin güveni artırır', () => {
      const change = computeConfidenceChange(85)
      expect(change).toBeGreaterThan(0)
      expect(applyConfidenceChange(DEFAULT_CONFIDENCE, change)).toBeGreaterThan(DEFAULT_CONFIDENCE)
    })

    it('yanlış tahmin güveni düşürür', () => {
      const change = computeConfidenceChange(30)
      expect(change).toBeLessThan(0)
      expect(applyConfidenceChange(DEFAULT_CONFIDENCE, change)).toBeLessThan(DEFAULT_CONFIDENCE)
    })

    it('learning döngüsü confidence günceller', () => {
      getCompanyLearningLocal(runtimeCtx())
      expect(getPredictionConfidence()).toBeGreaterThanOrEqual(0)
      expect(getPredictionConfidence()).toBeLessThanOrEqual(100)
    })
  })

  describe('Performance', () => {
    it('company learning < 400ms', async () => {
      const started = Date.now()
      await fetchCompanyLearning(runtimeCtx())
      expect(Date.now() - started).toBeLessThan(400)
    })
  })

  describe('Company Learning', () => {
    it('şirket learning paketi döner', async () => {
      const company = await fetchCompanyLearning(runtimeCtx())
      expect(company.statistics.totalRecords).toBeGreaterThan(0)
      expect(company.statistics.evaluatedRecords).toBeGreaterThan(0)
      expect(company.recentRecords.length).toBeGreaterThan(0)
    })

    it('order learning kayıtları döner', () => {
      getCompanyLearningLocal(runtimeCtx())
      const records = getOrderLearningLocal(runtimeCtx(), orders[0].id)
      expect(records.length).toBeGreaterThan(0)
      expect(records[0].status).toBe(PREDICTION_LEARNING_STATUS.EVALUATED)
      expect(records[0].actualResult).toBeTruthy()
      expect(records[0].accuracy).toBeTruthy()
    })

    it('statistics endpoint metrikleri', async () => {
      const stats = await fetchLearningStatistics(runtimeCtx())
      expect(stats.confidence).toBeGreaterThanOrEqual(0)
      expect(stats.predictionAccuracy).toBeGreaterThan(0)
      expect(stats.bestField).toBeTruthy()
      expect(stats.worstField).toBeTruthy()
    })
  })
})
