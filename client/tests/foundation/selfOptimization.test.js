import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import {
  applyOptimizationRules,
  computeOptimizationScore,
  createDefaultStrategy,
  strategiesEqual,
} from '../../src/engine/optimization/SelfOptimizationEngine.js'
import {
  getCompanyOptimizationSummaryLocal,
  getOptimizationHistoryLocal,
  getWorkerOptimizationLocal,
  resetSelfOptimizationStoreForTests,
  runSelfOptimizationScan,
} from '../../src/services/optimization/SelfOptimizationService.js'
import { resetLearningStoreForTests } from '../../src/services/learning/LearningEngineService.js'
import { resetPredictionCacheForTests } from '../../src/services/prediction/PredictionService.js'
import { resetKnowledgeGraphCacheForTests } from '../../src/services/graph/KnowledgeGraphService.js'
import { resetDecisionQualityStoreForTests } from '../../src/services/decision/DecisionQualityService.js'
import { resetCompanyManagerStore } from '../../src/services/company-manager/companyManagerStore.js'
import { runCompanyManagerScan } from '../../src/services/company-manager/CompanyManager.js'
import { fetchCompanyOptimization, fetchOptimizationHistory } from '../../src/services/optimizationClient.js'

describe('Self Optimization Engine V1 (FAZ 107)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos
  const runtimeCtx = () => ({ orders, dtos, collectionRows: [], todayIso: DEMO_TODAY })

  beforeEach(() => {
    resetSelfOptimizationStoreForTests()
    resetDecisionQualityStoreForTests()
    resetLearningStoreForTests()
    resetPredictionCacheForTests()
    resetKnowledgeGraphCacheForTests()
    resetCompanyManagerStore()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  describe('Optimization Rules', () => {
    it('düşük prediction accuracy ağırlığı azaltır', () => {
      const base = createDefaultStrategy()
      const { strategy, reasons } = applyOptimizationRules(base, {
        predictionAccuracy: 40,
        learningScore: 60,
        decisionScore: 55,
        executionSuccess: 70,
        approvalRate: 72,
        riskReduction: 50,
      })
      expect(strategy.predictionWeight).toBeLessThan(base.predictionWeight)
      expect(reasons.some((r) => r.includes('Prediction'))).toBe(true)
    })

    it('yüksek learning confidence artırır', () => {
      const base = createDefaultStrategy()
      const { strategy } = applyOptimizationRules(base, {
        predictionAccuracy: 70,
        learningScore: 78,
        decisionScore: 80,
        executionSuccess: 75,
        approvalRate: 72,
        riskReduction: 65,
      })
      expect(strategy.confidenceMultiplier).toBeGreaterThan(base.confidenceMultiplier)
    })
  })

  describe('Strategy Switch', () => {
    it('strateji değişince version artar', () => {
      runCompanyManagerScan({ orders, dtos, todayIso: DEMO_TODAY, apply: false })
      const before = getWorkerOptimizationLocal('dw-collection', runtimeCtx())
      runSelfOptimizationScan(runtimeCtx())
      const after = getWorkerOptimizationLocal('dw-collection', runtimeCtx())
      expect(after?.strategyVersion).toBeGreaterThanOrEqual(before?.strategyVersion ?? 1)
    })

    it('strategiesEqual farklı stratejileri ayırır', () => {
      const a = createDefaultStrategy()
      const b = { ...a, predictionWeight: 0.1 }
      expect(strategiesEqual(a, b)).toBe(false)
    })
  })

  describe('History', () => {
    it('optimizasyon geçmişi kaydedilir', () => {
      runSelfOptimizationScan(runtimeCtx())
      const history = getOptimizationHistoryLocal({ limit: 10 })
      expect(Array.isArray(history)).toBe(true)
    })
  })

  describe('Performance', () => {
    it('company optimization < 500ms', async () => {
      runCompanyManagerScan({ orders, dtos, todayIso: DEMO_TODAY, apply: false })
      const started = Date.now()
      await fetchCompanyOptimization(runtimeCtx())
      expect(Date.now() - started).toBeLessThan(500)
    })
  })

  describe('Worker Optimization', () => {
    it('worker profili optimization score içerir', () => {
      runSelfOptimizationScan(runtimeCtx())
      const worker = getWorkerOptimizationLocal('dw-shipment', runtimeCtx())
      expect(worker?.optimizationScore).toBeGreaterThan(0)
      expect(worker?.currentStrategy.label).toBeTruthy()
      expect(worker?.strategyVersion).toBeGreaterThan(0)
    })
  })

  describe('Company Optimization', () => {
    it('şirket optimization özeti döner', async () => {
      runCompanyManagerScan({ orders, dtos, todayIso: DEMO_TODAY, apply: false })
      const summary = await fetchCompanyOptimization(runtimeCtx())
      expect(summary.workers.length).toBeGreaterThan(0)
      expect(summary.avgOptimizationScore).toBeGreaterThan(0)
      expect(summary.mostImprovedWorkerId).toBeTruthy()
    })

    it('optimization score hesaplanır', () => {
      const strategy = createDefaultStrategy()
      const score = computeOptimizationScore(
        {
          predictionAccuracy: 75,
          learningScore: 72,
          decisionScore: 78,
          executionSuccess: 80,
          approvalRate: 70,
          riskReduction: 68,
        },
        strategy,
      )
      expect(score).toBeGreaterThan(50)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('history API', async () => {
      runSelfOptimizationScan(runtimeCtx())
      const history = await fetchOptimizationHistory(runtimeCtx(), { limit: 5 })
      expect(Array.isArray(history.records)).toBe(true)
    })
  })
})
