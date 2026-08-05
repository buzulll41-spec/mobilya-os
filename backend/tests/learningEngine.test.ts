import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { FastifyInstance } from 'fastify'

import { buildApp } from '../src/app.js'

import { roleHasPermission, PERM } from '../src/middleware/rbac.js'

import { USER_ROLE } from '../src/constants/userRoles.js'

import {

  assembleLearningEngine,

  buildAgentLearning,

  buildDecisionTrend,

  buildLessonsLearned,

  buildRecommendations,

  buildStrategyTable,

  computeAgentSuccessRate,

  computeDecisionWindowScore,

  computeLearningScore,

  computeLearningStrategySuccessRate,

} from '../src/services/learningEngine.js'

import { assembleActionOrchestrator } from '../src/services/actionOrchestratorEngine.js'

import { assembleBusinessBrain } from '../src/services/businessBrainEngine.js'

import { assembleGroupChairman } from '../src/services/groupChairmanEngine.js'

import { assembleHoldingCenter } from '../src/services/holdingCenterEngine.js'

import { assembleOperationsAgentsResponse } from '../src/services/operationsAgentsEngine.js'

import { buildFeedbackMetrics } from '../src/services/performanceFeedbackEngine.js'

import { buildInvestorCtx } from './investorIntelligence.test.js'



function buildLearningCtx(opts: Parameters<typeof buildInvestorCtx>[0] = {}) {

  const investorCtx = buildInvestorCtx(opts)

  const holdingReport = assembleHoldingCenter({ investorCtx, today: investorCtx.strategic.today })

  const groupReport = assembleGroupChairman({ investorCtx, today: investorCtx.strategic.today, holdingReport })

  const brain = assembleBusinessBrain({

    investorCtx,

    today: investorCtx.strategic.today,

    holdingReport,

    groupReport,

  })

  const agents = assembleOperationsAgentsResponse({ ...investorCtx.strategic, runTimestamps: new Map() })

  const orchestratorCtx = {

    brain,

    ceo: investorCtx.strategic,

    agents,

    today: brain.today,

  }

  const orchestrator = assembleActionOrchestrator(orchestratorCtx)

  return { ...orchestratorCtx, orchestrator, agents }

}



function learningResult(opts: Parameters<typeof buildLearningCtx>[0] = {}) {

  return assembleLearningEngine(buildLearningCtx(opts))

}



describe('learningEngine', () => {

  it('1. learningScore 0-100 aralığında', () => {

    const res = learningResult()

    expect(res.learningScore).toBeGreaterThanOrEqual(0)

    expect(res.learningScore).toBeLessThanOrEqual(100)

  })



  it('2. bestStrategy en yüksek successRate', () => {

    const res = learningResult()

    const maxRate = Math.max(...res.strategyTable.map((s) => s.successRate))

    expect(res.bestStrategy.successRate).toBe(maxRate)

    expect(res.bestStrategy.strategy).toBeTruthy()

  })



  it('3. worstStrategy en düşük successRate', () => {

    const res = learningResult()

    const minRate = Math.min(...res.strategyTable.map((s) => s.successRate))

    expect(res.worstStrategy.successRate).toBe(minRate)

    expect(res.worstStrategy.strategy).toBeTruthy()

  })



  it('4. strategyTable 6 strateji', () => {

    const res = learningResult()

    expect(res.strategyTable).toHaveLength(6)

    const strategies = res.strategyTable.map((s) => s.strategy)

    expect(strategies).toContain('COLLECTION_FIRST')

    expect(strategies).toContain('AGGRESSIVE_GROWTH')

    expect(strategies).toContain('CONTROLLED_GROWTH')

    expect(strategies).toContain('COST_REDUCTION')

    expect(strategies).toContain('CASH_PROTECTION')

    expect(strategies).toContain('SUPPLIER_FOCUS')

  })



  it('5. agentLearning 6 ajan', () => {

    const res = learningResult()

    expect(res.agentLearning).toHaveLength(6)

    const agents = res.agentLearning.map((a) => a.agent)

    expect(agents).toContain('COLLECTION_AGENT')

    expect(agents).toContain('SHIPMENT_AGENT')

    expect(agents).toContain('DATA_QUALITY_AGENT')

    expect(agents).toContain('SALES_AGENT')

    expect(agents).toContain('SUPPLIER_AGENT')

    expect(agents).toContain('EXECUTIVE_AGENT')

  })



  it('6. decisionTrend 30/90/180 pencereleri', () => {

    const trend = learningResult().decisionTrend

    expect(trend.days30.score).toBeGreaterThanOrEqual(0)

    expect(trend.days90.score).toBeGreaterThanOrEqual(0)

    expect(trend.days180.score).toBeGreaterThanOrEqual(0)

    expect(['UP', 'DOWN', 'FLAT']).toContain(trend.days30.trend)

    expect(['UP', 'DOWN', 'FLAT']).toContain(trend.days90.trend)

    expect(['UP', 'DOWN', 'FLAT']).toContain(trend.days180.trend)

  })



  it('7. lessonsLearned 10 madde', () => {

    const lessons = learningResult().lessonsLearned

    expect(lessons).toHaveLength(10)

    for (const l of lessons) {

      expect(l.lesson.length).toBeGreaterThan(10)

      expect(l.confidence).toBeGreaterThanOrEqual(50)

    }

  })



  it('8. recommendations 5 madde', () => {

    const recs = learningResult().recommendations

    expect(recs).toHaveLength(5)

    for (const r of recs) {

      expect(r.title.length).toBeGreaterThan(5)

      expect(r.rationale.length).toBeGreaterThan(10)

    }

  })



  it('9. summary oluşur', () => {

    expect(learningResult().summary.length).toBeGreaterThan(20)

  })



  it('10. computeLearningStrategySuccessRate', () => {

    const ctx = buildLearningCtx()

    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)

    const rate = computeLearningStrategySuccessRate('COLLECTION_FIRST', {

      ...metrics,

      dataQualityScore: 80,

      supplierHealth: 70,

      agentCompletion: 60,

    })

    expect(rate).toBeGreaterThanOrEqual(0)

    expect(rate).toBeLessThanOrEqual(100)

  })



  it('11. buildStrategyTable', () => {

    const ctx = buildLearningCtx()

    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)

    const table = buildStrategyTable(

      { ...metrics, dataQualityScore: 80, supplierHealth: 70, agentCompletion: 60 },

      ctx.brain,

      ctx.orchestrator,

    )

    expect(table).toHaveLength(6)

  })



  it('12. buildAgentLearning', () => {

    const ctx = buildLearningCtx()

    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)

    const agents = buildAgentLearning(

      { ...metrics, dataQualityScore: 80, supplierHealth: 70, agentCompletion: 60 },

      ctx.agents,

    )

    expect(agents).toHaveLength(6)

  })



  it('13. computeAgentSuccessRate', () => {

    const ctx = buildLearningCtx()

    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)

    const m = { ...metrics, dataQualityScore: 80, supplierHealth: 70, agentCompletion: 60 }

    expect(computeAgentSuccessRate('COLLECTION_AGENT', m, ctx.agents)).toBeGreaterThan(0)

  })



  it('14. buildDecisionTrend', () => {

    const ctx = buildLearningCtx()

    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)

    const trend = buildDecisionTrend(

      { ...metrics, dataQualityScore: 80, supplierHealth: 70, agentCompletion: 60 },

      ctx.orchestrator,

    )

    expect(trend.days30).toBeTruthy()

    expect(trend.days90).toBeTruthy()

    expect(trend.days180).toBeTruthy()

  })



  it('15. computeDecisionWindowScore', () => {

    const ctx = buildLearningCtx()

    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)

    const m = { ...metrics, dataQualityScore: 80, supplierHealth: 70, agentCompletion: 60 }

    expect(computeDecisionWindowScore(30, m, ctx.orchestrator)).toBeGreaterThan(0)

  })



  it('16. computeLearningScore', () => {

    const res = learningResult()

    const score = computeLearningScore(res.strategyTable, res.agentLearning, res.decisionTrend)

    expect(score).toBe(res.learningScore)

  })



  it('17. buildLessonsLearned', () => {

    const ctx = buildLearningCtx()

    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)

    const table = buildStrategyTable(

      { ...metrics, dataQualityScore: 80, supplierHealth: 70, agentCompletion: 60 },

      ctx.brain,

      ctx.orchestrator,

    )

    expect(buildLessonsLearned({ ...metrics, dataQualityScore: 80, supplierHealth: 70, agentCompletion: 60 }, table)).toHaveLength(10)

  })



  it('18. buildRecommendations', () => {

    const ctx = buildLearningCtx()

    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)

    const m = { ...metrics, dataQualityScore: 80, supplierHealth: 70, agentCompletion: 60 }

    const table = buildStrategyTable(m, ctx.brain, ctx.orchestrator)

    const agents = buildAgentLearning(m, ctx.agents)

    expect(buildRecommendations(table, agents, m)).toHaveLength(5)

  })



  it('19. boş veri kırılmaz', () => {

    expect(() => learningResult({ profitOrders: [] })).not.toThrow()

  })



  it('20. meta.depoKatiExcluded ve virtualOnly', () => {

    const meta = learningResult().meta

    expect(meta.depoKatiExcluded).toBe(true)

    expect(meta.virtualOnly).toBe(true)

  })



  it('21. Depo Katı görünmez', () => {

    expect(JSON.stringify(learningResult())).not.toContain('Depo Katı')

  })



  it('22. WAREHOUSE görünmez', () => {

    expect(JSON.stringify(learningResult())).not.toContain('WAREHOUSE')

  })



  it('23. RBAC READ — ADMIN erişir', () => {

    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.LEARNING_ENGINE_READ)).toBe(true)

  })



  it('24. RBAC READ — MANAGER erişir', () => {

    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.LEARNING_ENGINE_READ)).toBe(true)

  })



  it('25. RBAC — SALES erişemez', () => {

    expect(roleHasPermission(USER_ROLE.SALES, PERM.LEARNING_ENGINE_READ)).toBe(false)

  })



  it('26. RBAC — OPERATION erişemez', () => {

    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.LEARNING_ENGINE_READ)).toBe(false)

  })

})



const hasDb = Boolean(process.env.DATABASE_URL)



describe.skipIf(!hasDb)('GET /v1/reports/learning-engine (canlı)', () => {

  let app: FastifyInstance



  beforeAll(async () => {

    app = await buildApp()

    await app.ready()

  })



  afterAll(async () => {

    await app.close()

  })



  it('27. canlı endpoint 200', async () => {

    const res = await app.inject({ method: 'GET', url: '/v1/reports/learning-engine' })

    expect(res.statusCode).toBe(200)

    const body = res.json() as Record<string, unknown>

    expect(typeof body.learningScore).toBe('number')

    expect(body.strategyTable).toBeTruthy()

    expect(JSON.stringify(body)).not.toContain('Depo Katı')

    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')

  })

})


