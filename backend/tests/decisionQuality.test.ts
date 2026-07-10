import { describe, expect, it } from 'vitest'
import { computeDecisionConfidence, computeDecisionScore, scoreDecisionCriteria } from '../src/services/decision/DecisionQualityEngine.js'

describe('Decision Quality Engine (FAZ 106)', () => {
  describe('Decision Score', () => {
    it('kriterlerden skor üretir', () => {
      const criteria = scoreDecisionCriteria('RISK_REDUCED', 'HIGH', {
        predictionAccuracy: 82,
        learningScore: 76,
      })
      const score = computeDecisionScore(criteria)
      expect(score).toBeGreaterThan(60)
      expect(computeDecisionConfidence(score, 70, 75)).toBeLessThanOrEqual(100)
    })
  })

  describe('History', () => {
    it('skor sınırları korunur', () => {
      const criteria = scoreDecisionCriteria('CREATE_TASK', 'CRITICAL', {})
      for (const value of Object.values(criteria)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('Performance', () => {
    it('1000 score hesabı < 50ms', () => {
      const criteria = scoreDecisionCriteria('CREATE_TASK', 'HIGH', { predictionAccuracy: 70 })
      const started = Date.now()
      for (let i = 0; i < 1000; i++) computeDecisionScore(criteria)
      expect(Date.now() - started).toBeLessThan(50)
    })
  })

  describe('Company Summary', () => {
    it('risk reduced yüksek riskReduction', () => {
      const criteria = scoreDecisionCriteria('RISK_REDUCED', undefined, {})
      expect(criteria.riskReduction).toBeGreaterThan(85)
    })
  })

  describe('Worker Summary', () => {
    it('worker score ile business impact artar', () => {
      const low = scoreDecisionCriteria('CREATE_TASK', 'NORMAL', { workerScore: 40 })
      const high = scoreDecisionCriteria('CREATE_TASK', 'NORMAL', { workerScore: 90 })
      expect(computeDecisionScore(high)).toBeGreaterThan(computeDecisionScore(low))
    })
  })
})
