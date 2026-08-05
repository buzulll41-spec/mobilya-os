import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import {
  blendWorkerScoreWithPrediction,
  buildCompanyPredictions,
  buildOrderPredictions,
} from '../../src/engine/prediction/PredictionEngine.js'
import {
  getCompanyPredictionLocal,
  getCustomerPredictionLocal,
  getOrderPredictionLocal,
  resetPredictionCacheForTests,
} from '../../src/services/prediction/PredictionService.js'
import { fetchCompanyPredictions, fetchOrderPrediction } from '../../src/services/predictionClient.js'
import { customerNodeId } from '../../src/engine/graph/KnowledgeGraphEngine.js'
import { resetKnowledgeGraphCacheForTests } from '../../src/services/graph/KnowledgeGraphService.js'

describe('Prediction Engine V1 (FAZ 104)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos
  const runtimeCtx = () => ({ orders, dtos, collectionRows: [], todayIso: DEMO_TODAY })

  beforeEach(() => {
    resetPredictionCacheForTests()
    resetKnowledgeGraphCacheForTests()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  describe('Prediction Engine', () => {
    it('sipariş tahminleri üretir', () => {
      const preds = buildOrderPredictions(runtimeCtx())
      expect(preds.length).toBeGreaterThan(0)
      expect(preds[0].orderId).toBeTruthy()
    })
  })

  describe('Probability', () => {
    it('tüm olasılık alanları 0-100 aralığında', () => {
      const preds = buildOrderPredictions(runtimeCtx())
      for (const p of preds) {
        expect(p.delayProbability).toBeGreaterThanOrEqual(0)
        expect(p.delayProbability).toBeLessThanOrEqual(100)
        expect(p.paymentRiskProbability).toBeGreaterThanOrEqual(0)
        expect(p.paymentRiskProbability).toBeLessThanOrEqual(100)
        expect(p.cancelProbability).toBeGreaterThanOrEqual(0)
        expect(p.cancelProbability).toBeLessThanOrEqual(100)
        expect(p.supplierDelayProbability).toBeGreaterThanOrEqual(0)
        expect(p.supplierDelayProbability).toBeLessThanOrEqual(100)
        expect(p.stockRiskProbability).toBeGreaterThanOrEqual(0)
        expect(p.stockRiskProbability).toBeLessThanOrEqual(100)
        expect(p.predictionScore).toBeGreaterThanOrEqual(0)
        expect(p.predictionScore).toBeLessThanOrEqual(100)
      }
    })

    it('worker skor karışımı sınırları korur', () => {
      expect(blendWorkerScoreWithPrediction(80, 90)).toBeLessThanOrEqual(100)
      expect(blendWorkerScoreWithPrediction(80, 90)).toBeGreaterThan(80)
    })
  })

  describe('Performance', () => {
    it('company prediction < 300ms', () => {
      const started = Date.now()
      buildCompanyPredictions(runtimeCtx())
      expect(Date.now() - started).toBeLessThan(300)
    })
  })

  describe('Order Prediction', () => {
    it('tek sipariş tahmini döner', async () => {
      const orderId = orders[0].id
      const result = await fetchOrderPrediction(orderId, runtimeCtx())
      expect(result.orderId).toBe(orderId)
      expect(result.delayProbability).toBeDefined()
    })

    it('local servis cache ile çalışır', () => {
      const pred = getOrderPredictionLocal(runtimeCtx(), orders[0].id)
      expect(pred?.predictionScore).toBeGreaterThan(0)
    })
  })

  describe('Customer Prediction', () => {
    it('müşteri tahmini döner', () => {
      const order = orders[0]
      const customerId = customerNodeId(order.customer, order.phone)
      const pred = getCustomerPredictionLocal(runtimeCtx(), customerId)
      expect(pred?.customerName).toBe(order.customer)
      expect(pred?.orderCount).toBeGreaterThan(0)
    })
  })

  describe('Company Prediction', () => {
    it('şirket tahmin paketi döner', async () => {
      const company = await fetchCompanyPredictions(runtimeCtx())
      expect(Array.isArray(company.riskyOrders)).toBe(true)
      expect(Array.isArray(company.tomorrowDelayOrders)).toBe(true)
      expect(Array.isArray(company.riskyCustomers)).toBe(true)
      expect(Array.isArray(company.weekCollectionRisk)).toBe(true)
      expect(company.meta.orderCount).toBeGreaterThan(0)
    })

    it('riskli sipariş listesi skor sıralı', () => {
      const company = getCompanyPredictionLocal(runtimeCtx())
      if ((company?.riskyOrders.length ?? 0) > 1) {
        expect(company.riskyOrders[0].predictionScore).toBeGreaterThanOrEqual(
          company.riskyOrders[1].predictionScore,
        )
      }
    })
  })
})
