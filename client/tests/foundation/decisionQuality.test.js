import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import { COMPANY_MANAGER_DECISION } from '../../src/contracts/v1/aiCompanyManager.js'
import {
  computeDecisionConfidence,
  computeDecisionScore,
  scoreDecisionCriteria,
} from '../../src/engine/decision/DecisionQualityEngine.js'
import {
  getCompanyDecisionSummaryLocal,
  getDecisionHistoryLocal,
  getWorkerDecisionSummaryLocal,
  recordCompanyManagerDecisionQuality,
  resetDecisionQualityStoreForTests,
} from '../../src/services/decision/DecisionQualityService.js'
import { resetLearningStoreForTests } from '../../src/services/learning/LearningEngineService.js'
import { resetPredictionCacheForTests } from '../../src/services/prediction/PredictionService.js'
import { resetKnowledgeGraphCacheForTests } from '../../src/services/graph/KnowledgeGraphService.js'
import { fetchCompanyDecisionQuality, fetchDecisionHistory } from '../../src/services/decisionClient.js'
import { runCompanyManagerScan } from '../../src/services/company-manager/CompanyManager.js'
import { resetCompanyManagerStore } from '../../src/services/company-manager/companyManagerStore.js'

describe('Decision Quality Engine V1 (FAZ 106)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos
  const runtimeCtx = () => ({ orders, dtos, collectionRows: [], todayIso: DEMO_TODAY })

  beforeEach(() => {
    resetDecisionQualityStoreForTests()
    resetLearningStoreForTests()
    resetPredictionCacheForTests()
    resetKnowledgeGraphCacheForTests()
    resetCompanyManagerStore()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  describe('Decision Score', () => {
    it('8 kriter ile decision score hesaplar', () => {
      const criteria = scoreDecisionCriteria(
        { type: COMPANY_MANAGER_DECISION.RISK_REDUCED },
        { predictionAccuracy: 80, learningScore: 75 },
      )
      const score = computeDecisionScore(criteria)
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(100)
      expect(computeDecisionConfidence(criteria, score, 70, 75)).toBeLessThanOrEqual(100)
    })
  })

  describe('History', () => {
    it('karar geçmişi kaydedilir', () => {
      recordCompanyManagerDecisionQuality(
        [
          {
            id: 'd1',
            type: COMPANY_MANAGER_DECISION.CREATE_TASK,
            message: 'Test görev',
            occurredAt: `${DEMO_TODAY}T09:00:00.000Z`,
            orderId: orders[0].id,
            targetWorkerId: 'dw-collection',
          },
        ],
        runtimeCtx(),
      )
      const history = getDecisionHistoryLocal({ limit: 10 })
      expect(history.length).toBe(1)
      expect(history[0].decisionScore).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('company summary < 400ms', async () => {
      runCompanyManagerScan({ orders, dtos, todayIso: DEMO_TODAY, apply: false })
      const started = Date.now()
      await fetchCompanyDecisionQuality(runtimeCtx())
      expect(Date.now() - started).toBeLessThan(400)
    })
  })

  describe('Company Summary', () => {
    it('şirket karar özeti döner', async () => {
      runCompanyManagerScan({ orders, dtos, todayIso: DEMO_TODAY, apply: false })
      const summary = await fetchCompanyDecisionQuality(runtimeCtx())
      expect(summary.totalDecisions).toBeGreaterThan(0)
      expect(summary.avgDecisionScore).toBeGreaterThan(0)
      expect(Array.isArray(summary.topWorkers)).toBe(true)
    })
  })

  describe('Worker Summary', () => {
    it('worker karar özeti döner', () => {
      runCompanyManagerScan({ orders, dtos, todayIso: DEMO_TODAY, apply: false })
      const summary = getCompanyDecisionSummaryLocal(runtimeCtx())
      const workerId = summary.topWorkers[0]?.workerId ?? getDecisionHistoryLocal({ limit: 1 })[0]?.workerId
      expect(workerId).toBeTruthy()
      const worker = getWorkerDecisionSummaryLocal(workerId, runtimeCtx())
      expect(worker?.decisionCount).toBeGreaterThan(0)
    })

    it('history API kayıt listesi', async () => {
      runCompanyManagerScan({ orders, dtos, todayIso: DEMO_TODAY, apply: false })
      const history = await fetchDecisionHistory(runtimeCtx(), { limit: 5 })
      expect(history.records.length).toBeGreaterThan(0)
    })
  })
})
