import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { roleHasPermission, PERM } from '../src/middleware/rbac.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import {
  assemblePerformanceFeedback,
  buildFeedbackMetrics,
  buildImpactAnalysis,
  buildLessonsLearned,
  buildRecommendation,
  buildStrategyPerformance,
  computeFeedbackScore,
  computeStrategySuccessRate,
} from '../src/services/performanceFeedbackEngine.js'
import { assembleActionOrchestrator } from '../src/services/actionOrchestratorEngine.js'
import { assembleBusinessBrain } from '../src/services/businessBrainEngine.js'
import { assembleGroupChairman } from '../src/services/groupChairmanEngine.js'
import { assembleHoldingCenter } from '../src/services/holdingCenterEngine.js'
import { assembleOperationsAgentsResponse } from '../src/services/operationsAgentsEngine.js'
import { buildInvestorCtx } from './investorIntelligence.test.js'

function buildFeedbackCtx(opts: Parameters<typeof buildInvestorCtx>[0] = {}) {
  const investorCtx = buildInvestorCtx(opts)
  const holdingReport = assembleHoldingCenter({ investorCtx, today: investorCtx.strategic.today })
  const groupReport = assembleGroupChairman({ investorCtx, today: investorCtx.strategic.today, holdingReport })
  const brain = assembleBusinessBrain({
    investorCtx,
    today: investorCtx.strategic.today,
    holdingReport,
    groupReport,
  })
  const orchestratorCtx = {
    brain,
    ceo: investorCtx.strategic,
    agents: assembleOperationsAgentsResponse({ ...investorCtx.strategic, runTimestamps: new Map() }),
    today: brain.today,
  }
  const orchestrator = assembleActionOrchestrator(orchestratorCtx)
  return { ...orchestratorCtx, orchestrator }
}

function feedbackResult(opts: Parameters<typeof buildFeedbackCtx>[0] = {}) {
  return assemblePerformanceFeedback(buildFeedbackCtx(opts))
}

describe('performanceFeedbackEngine', () => {
  it('1. feedbackScore 0-100 aralığında', () => {
    const res = feedbackResult()
    expect(res.feedbackScore).toBeGreaterThanOrEqual(0)
    expect(res.feedbackScore).toBeLessThanOrEqual(100)
  })

  it('2. strategyPerformance 10 strateji', () => {
    const res = feedbackResult()
    expect(res.strategyPerformance).toHaveLength(10)
    for (const p of res.strategyPerformance) {
      expect(p.successRate).toBeGreaterThanOrEqual(0)
      expect(p.successRate).toBeLessThanOrEqual(100)
      expect(p.executionCount).toBeGreaterThan(0)
    }
  })

  it('3. successfulStrategies 10 madde', () => {
    expect(feedbackResult().successfulStrategies).toHaveLength(10)
  })

  it('4. failedStrategies 10 madde', () => {
    expect(feedbackResult().failedStrategies).toHaveLength(10)
  })

  it('5. impactAnalysis oluşur', () => {
    const impact = feedbackResult().impactAnalysis
    expect(typeof impact.collectionImpact).toBe('number')
    expect(typeof impact.profitImpact).toBe('number')
    expect(typeof impact.riskImpact).toBe('number')
    expect(typeof impact.shipmentImpact).toBe('number')
    expect(typeof impact.operationsImpact).toBe('number')
    expect(impact.summary.length).toBeGreaterThan(10)
  })

  it('6. lessonsLearned 10 madde', () => {
    const lessons = feedbackResult().lessonsLearned
    expect(lessons).toHaveLength(10)
    for (const l of lessons) {
      expect(l.lesson.length).toBeGreaterThan(10)
    }
  })

  it('7. recommendation oluşur', () => {
    expect(feedbackResult().recommendation.length).toBeGreaterThan(20)
  })

  it('8. activeStrategy brain ile uyumlu', () => {
    const ctx = buildFeedbackCtx()
    const res = assemblePerformanceFeedback(ctx)
    expect(res.activeStrategy).toBe(ctx.brain.primaryDecision)
  })

  it('9. COLLECTION_FIRST başarı oranı hesaplanır', () => {
    const ctx = buildFeedbackCtx()
    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)
    const rate = computeStrategySuccessRate('COLLECTION_FIRST', metrics)
    expect(rate).toBeGreaterThanOrEqual(0)
    expect(rate).toBeLessThanOrEqual(100)
  })

  it('10. DEFENSIVE_MODE başarı oranı hesaplanır', () => {
    const ctx = buildFeedbackCtx({ delayed: 10 })
    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)
    expect(computeStrategySuccessRate('DEFENSIVE_MODE', metrics)).toBeGreaterThan(40)
  })

  it('11. computeFeedbackScore', () => {
    const perfs = buildStrategyPerformance(
      buildFeedbackMetrics(buildFeedbackCtx().ceo, buildFeedbackCtx().brain, buildFeedbackCtx().orchestrator),
      'COLLECTION_FIRST',
      buildFeedbackCtx().orchestrator,
    )
    expect(computeFeedbackScore(perfs)).toBeGreaterThan(0)
  })

  it('12. buildImpactAnalysis', () => {
    const ctx = buildFeedbackCtx()
    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)
    const impact = buildImpactAnalysis(metrics, ctx.orchestrator, ctx.ceo)
    expect(impact).toBeTruthy()
  })

  it('13. buildLessonsLearned', () => {
    const ctx = buildFeedbackCtx()
    const perfs = buildStrategyPerformance(
      buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator),
      ctx.brain.primaryDecision,
      ctx.orchestrator,
    )
    expect(buildLessonsLearned(perfs, buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator))).toHaveLength(10)
  })

  it('14. buildRecommendation', () => {
    const ctx = buildFeedbackCtx()
    const perfs = buildStrategyPerformance(
      buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator),
      ctx.brain.primaryDecision,
      ctx.orchestrator,
    )
    expect(buildRecommendation(perfs, ctx.brain.primaryDecision).length).toBeGreaterThan(10)
  })

  it('15. boş veri kırılmaz', () => {
    expect(() => feedbackResult({ profitOrders: [] })).not.toThrow()
  })

  it('16. meta.depoKatiExcluded true', () => {
    expect(feedbackResult().meta.depoKatiExcluded).toBe(true)
  })

  it('17. Depo Katı görünmez', () => {
    expect(JSON.stringify(feedbackResult())).not.toContain('Depo Katı')
  })

  it('18. WAREHOUSE görünmez', () => {
    expect(JSON.stringify(feedbackResult())).not.toContain('WAREHOUSE')
  })

  it('19. RBAC READ — ADMIN erişir', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.PERFORMANCE_FEEDBACK_READ)).toBe(true)
  })

  it('20. RBAC READ — MANAGER erişir', () => {
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.PERFORMANCE_FEEDBACK_READ)).toBe(true)
  })

  it('21. RBAC — SALES erişemez', () => {
    expect(roleHasPermission(USER_ROLE.SALES, PERM.PERFORMANCE_FEEDBACK_READ)).toBe(false)
  })

  it('22. RBAC — OPERATION erişemez', () => {
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.PERFORMANCE_FEEDBACK_READ)).toBe(false)
  })

  it('23. successful sıralama yüksekten düşüğe', () => {
    const res = feedbackResult()
    for (let i = 1; i < res.successfulStrategies.length; i++) {
      expect(res.successfulStrategies[i - 1]!.successRate).toBeGreaterThanOrEqual(
        res.successfulStrategies[i]!.successRate,
      )
    }
  })

  it('24. failed sıralama düşükten yükseğe', () => {
    const res = feedbackResult()
    for (let i = 1; i < res.failedStrategies.length; i++) {
      expect(res.failedStrategies[i - 1]!.successRate).toBeLessThanOrEqual(
        res.failedStrategies[i]!.successRate,
      )
    }
  })

  it('25. STORE_EXPANSION zayıf nakit senaryosu', () => {
    const ctx = buildFeedbackCtx()
    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)
    metrics.cashFlowPressure = 90
    const rate = computeStrategySuccessRate('STORE_EXPANSION', metrics)
    const base = computeStrategySuccessRate('STORE_EXPANSION', { ...metrics, cashFlowPressure: 20 })
    expect(rate).toBeLessThan(base)
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/performance-feedback (canlı)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('26. canlı endpoint 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/performance-feedback' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(typeof body.feedbackScore).toBe('number')
    expect(body.strategyPerformance).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
  })
})
