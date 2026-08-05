import { describe, expect, it } from 'vitest'
import {
  applyOptimizationRules,
  computeOptimizationScore,
  createDefaultStrategy,
  strategiesEqual,
} from '../src/services/optimization/SelfOptimizationEngine.js'

describe('Self Optimization Engine (FAZ 107)', () => {
  describe('Optimization Rules', () => {
    it('approval düşükse human approval ister', () => {
      const { strategy } = applyOptimizationRules(createDefaultStrategy(), {
        predictionAccuracy: 65,
        learningScore: 60,
        decisionScore: 55,
        executionSuccess: 70,
        approvalRate: 45,
        riskReduction: 50,
      })
      expect(strategy.humanApprovalRequired).toBe(true)
    })
  })

  describe('Strategy Switch', () => {
    it('decision score yüksekse agresiflik artar', () => {
      const { strategy } = applyOptimizationRules(createDefaultStrategy(), {
        predictionAccuracy: 70,
        learningScore: 65,
        decisionScore: 82,
        executionSuccess: 75,
        approvalRate: 72,
        riskReduction: 60,
      })
      expect(strategy.aggressiveness).toBeGreaterThan(0.55)
    })
  })

  describe('History', () => {
    it('score 0-100 aralığında', () => {
      const score = computeOptimizationScore(
        {
          predictionAccuracy: 70,
          learningScore: 68,
          decisionScore: 72,
          executionSuccess: 75,
          approvalRate: 70,
          riskReduction: 65,
        },
        createDefaultStrategy(),
      )
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  describe('Performance', () => {
    it('1000 rule apply < 50ms', () => {
      const metrics = {
        predictionAccuracy: 60,
        learningScore: 65,
        decisionScore: 70,
        executionSuccess: 72,
        approvalRate: 68,
        riskReduction: 55,
      }
      const started = Date.now()
      for (let i = 0; i < 1000; i++) applyOptimizationRules(createDefaultStrategy(), metrics)
      expect(Date.now() - started).toBeLessThan(50)
    })
  })

  describe('Worker Optimization', () => {
    it('strateji eşitliği', () => {
      const a = createDefaultStrategy()
      expect(strategiesEqual(a, { ...a })).toBe(true)
    })
  })

  describe('Company Optimization', () => {
    it('risk yüksekse agresiflik düşer', () => {
      const { strategy } = applyOptimizationRules(createDefaultStrategy(), {
        predictionAccuracy: 65,
        learningScore: 55,
        decisionScore: 40,
        executionSuccess: 60,
        approvalRate: 70,
        riskReduction: 30,
      })
      expect(strategy.aggressiveness).toBeLessThan(0.55)
    })
  })
})
