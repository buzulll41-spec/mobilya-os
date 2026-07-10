import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { roleHasPermission, PERM } from '../src/middleware/rbac.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import {
  assembleOptimizationEngine,
  buildAgentOptimizations,
  buildManagementBriefing,
  buildRecommendedChanges,
  buildStrategyOptimizations,
  computeOptimizationScore,
  computeRecommendedWeight,
  resolveOptimizationDecision,
  resetOptimizationStore,
  applyOptimizationRun,
} from '../src/services/optimizationEngine.js'
import { assembleLearningEngine } from '../src/services/learningEngine.js'
import { assemblePerformanceFeedback, buildFeedbackMetrics } from '../src/services/performanceFeedbackEngine.js'
import { assembleActionOrchestrator } from '../src/services/actionOrchestratorEngine.js'
import { assembleBusinessBrain } from '../src/services/businessBrainEngine.js'
import { assembleGroupChairman } from '../src/services/groupChairmanEngine.js'
import { assembleHoldingCenter } from '../src/services/holdingCenterEngine.js'
import { assembleOperationsAgentsResponse } from '../src/services/operationsAgentsEngine.js'
import { buildInvestorCtx } from './investorIntelligence.test.js'

function buildOptCtx(opts: Parameters<typeof buildInvestorCtx>[0] = {}) {
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
  const orchestratorCtx = { brain, ceo: investorCtx.strategic, agents, today: brain.today }
  const orchestrator = assembleActionOrchestrator(orchestratorCtx)
  const base = { ...orchestratorCtx, orchestrator, agents }
  const learning = assembleLearningEngine(base)
  const feedback = assemblePerformanceFeedback(base)
  return { ...base, learning, feedback }
}

function optResult(opts: Parameters<typeof buildOptCtx>[0] = {}) {
  return assembleOptimizationEngine(buildOptCtx(opts))
}

describe('optimizationEngine', () => {
  beforeAll(() => resetOptimizationStore())

  it('1. optimizationScore 0-100', () => {
    const res = optResult()
    expect(res.optimizationScore).toBeGreaterThanOrEqual(0)
    expect(res.optimizationScore).toBeLessThanOrEqual(100)
  })

  it('2. optimizationDecision oluşur', () => {
    const decision = optResult().optimizationDecision
    expect([
      'BOOST_COLLECTION_STRATEGY',
      'BOOST_SHIPMENT_STRATEGY',
      'BOOST_SALES_STRATEGY',
      'BOOST_DATA_QUALITY',
      'BOOST_SUPPLIER_STRATEGY',
      'BALANCED_MODE',
      'NO_CHANGE',
    ]).toContain(decision)
  })

  it('3. strategyOptimizations 8 strateji', () => {
    const rows = optResult().strategyOptimizations
    expect(rows).toHaveLength(8)
    expect(rows.map((r) => r.strategy)).toContain('COLLECTION_FIRST')
    expect(rows.map((r) => r.strategy)).toContain('DATA_QUALITY_FIRST')
    expect(rows.map((r) => r.strategy)).toContain('BALANCED_MODE')
  })

  it('4. agentOptimizations 6 ajan', () => {
    const rows = optResult().agentOptimizations
    expect(rows).toHaveLength(6)
    expect(rows.map((r) => r.agent)).toContain('COLLECTION_AGENT')
    expect(rows.map((r) => r.agent)).toContain('EXECUTIVE_AGENT')
  })

  it('5. recommendedChanges oluşur', () => {
    const changes = optResult().recommendedChanges
    expect(changes.length).toBeGreaterThan(0)
    expect(changes.length).toBeLessThanOrEqual(10)
    for (const c of changes) {
      expect(c.priority).toMatch(/^P[123]$/)
    }
  })

  it('6. managementBriefing 5 madde', () => {
    expect(optResult().managementBriefing).toHaveLength(5)
  })

  it('7. computeRecommendedWeight', () => {
    expect(computeRecommendedWeight(82)).toBeGreaterThan(100)
    expect(computeRecommendedWeight(41)).toBeLessThan(100)
  })

  it('8. COLLECTION_FIRST başarılıysa ağırlık artar', () => {
    const ctx = buildOptCtx()
    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)
    const rows = buildStrategyOptimizations(ctx.learning, ctx.feedback, ctx.brain, ctx.orchestrator, metrics)
    const col = rows.find((r) => r.strategy === 'COLLECTION_FIRST')!
    if (col.successRate >= 65) expect(col.recommendedWeight).toBeGreaterThan(100)
  })

  it('9. AGGRESSIVE_GROWTH düşük başarıda ağırlık düşer', () => {
    const ctx = buildOptCtx()
    const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)
    const rows = buildStrategyOptimizations(ctx.learning, ctx.feedback, ctx.brain, ctx.orchestrator, metrics)
    const agg = rows.find((r) => r.strategy === 'AGGRESSIVE_GROWTH')!
    if (agg.successRate < 50) expect(agg.recommendedWeight).toBeLessThan(100)
  })

  it('10. agent ağırlıkları hesaplanır', () => {
    const agents = buildAgentOptimizations(buildOptCtx().learning)
    for (const a of agents) {
      expect(a.currentWeight).toBe(100)
      expect(a.recommendedWeight).toBeGreaterThanOrEqual(50)
      expect(a.recommendedWeight).toBeLessThanOrEqual(150)
    }
  })

  it('11. strategy ranking doğru', () => {
    const rows = optResult().strategyOptimizations
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.recommendedWeight).toBeGreaterThanOrEqual(rows[i]!.recommendedWeight)
    }
  })

  it('12. change priority doğru', () => {
    const res = optResult()
    const changes = buildRecommendedChanges(res.strategyOptimizations, res.agentOptimizations)
    const p1 = changes.filter((c) => c.priority === 'P1')
    for (const c of p1) expect(c.impact).toBeGreaterThanOrEqual(9)
  })

  it('13. Learning Engine verisi okunuyor', () => {
    const res = optResult()
    expect(res.optimizationScore).toBeGreaterThan(0)
    expect(buildOptCtx().learning.learningScore).toBeGreaterThan(0)
  })

  it('14. Performance Feedback verisi okunuyor', () => {
    expect(buildOptCtx().feedback.feedbackScore).toBeGreaterThanOrEqual(0)
  })

  it('15. Business Brain kararı okunuyor', () => {
    expect(buildOptCtx().brain.primaryDecision).toBeTruthy()
  })

  it('16. resolveOptimizationDecision', () => {
    const res = optResult()
    const d = resolveOptimizationDecision(res.strategyOptimizations, res.agentOptimizations)
    expect(d).toBe(res.optimizationDecision)
  })

  it('17. computeOptimizationScore', () => {
    const res = optResult()
    const score = computeOptimizationScore(
      res.strategyOptimizations,
      res.agentOptimizations,
      res.optimizationScore,
      buildOptCtx().feedback.feedbackScore,
    )
    expect(score).toBeGreaterThan(0)
  })

  it('18. buildManagementBriefing', () => {
    const res = optResult()
    const brief = buildManagementBriefing(res.strategyOptimizations, res.agentOptimizations, res.optimizationDecision)
    expect(brief).toHaveLength(5)
  })

  it('19. boş veri kırılmaz', () => {
    expect(() => optResult({ profitOrders: [] })).not.toThrow()
  })

  it('20. meta.depoKatiExcluded ve virtualOnly', () => {
    const meta = optResult().meta
    expect(meta.depoKatiExcluded).toBe(true)
    expect(meta.virtualOnly).toBe(true)
  })

  it('21. Depo Katı görünmez', () => {
    expect(JSON.stringify(optResult())).not.toContain('Depo Katı')
  })

  it('22. WAREHOUSE görünmez', () => {
    expect(JSON.stringify(optResult())).not.toContain('WAREHOUSE')
  })

  it('23. WAREHOUSE_FLOOR görünmez', () => {
    expect(JSON.stringify(optResult())).not.toContain('WAREHOUSE_FLOOR')
  })

  it('24. RBAC READ — ADMIN', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.OPTIMIZATION_ENGINE_READ)).toBe(true)
  })

  it('25. RBAC APPLY — ADMIN', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.OPTIMIZATION_ENGINE_APPLY)).toBe(true)
  })

  it('26. RBAC READ — MANAGER', () => {
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.OPTIMIZATION_ENGINE_READ)).toBe(true)
  })

  it('27. RBAC APPLY — MANAGER', () => {
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.OPTIMIZATION_ENGINE_APPLY)).toBe(true)
  })

  it('28. RBAC — SALES erişemez', () => {
    expect(roleHasPermission(USER_ROLE.SALES, PERM.OPTIMIZATION_ENGINE_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.OPTIMIZATION_ENGINE_APPLY)).toBe(false)
  })

  it('29. RBAC — OPERATION erişemez', () => {
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.OPTIMIZATION_ENGINE_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.OPTIMIZATION_ENGINE_APPLY)).toBe(false)
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('optimizationEngine endpoints (canlı)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    resetOptimizationStore()
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('30. GET endpoint 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/optimization-engine' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(typeof body.optimizationScore).toBe('number')
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
  })

  it('31. POST apply endpoint 200 sanal', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/reports/optimization-engine/apply' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { status: string; appliedChanges: number; meta: { virtualOnly: boolean } }
    expect(body.status).toBe('APPLIED')
    expect(body.appliedChanges).toBeGreaterThan(0)
    expect(body.meta.virtualOnly).toBe(true)
  })
})

describe('applyOptimizationRun unit', () => {
  it('32. APPLY sanal çalışır', async () => {
    resetOptimizationStore()
    const ctx = buildOptCtx()
    const report = assembleOptimizationEngine(ctx)
    expect(report.recommendedChanges.length).toBeGreaterThan(0)
  })
})
