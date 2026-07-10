import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { roleHasPermission, PERM } from '../src/middleware/rbac.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import {
  assembleGoalEngine,
  buildActiveGoals,
  buildGoalOpportunities,
  buildGoalProgress,
  buildGoalRisks,
  buildGoalManagementBriefing,
  buildGoalTemplates,
  computeGoalScore,
  resetGoalProgressStore,
  resolveGoalDecision,
  virtualUpdateGoalProgress,
} from '../src/services/goalEngine.js'
import { buildFeedbackMetrics } from '../src/services/performanceFeedbackEngine.js'
import { buildGoalCtx } from './helpers/buildGoalCtx.js'

function goalResult(opts: Parameters<typeof buildGoalCtx>[0] = {}) {
  return assembleGoalEngine(buildGoalCtx(opts))
}

describe('goalEngine', () => {
  beforeAll(() => resetGoalProgressStore())

  it('1. goalScore 0-100', () => {
    const res = goalResult()
    expect(res.goalScore).toBeGreaterThanOrEqual(0)
    expect(res.goalScore).toBeLessThanOrEqual(100)
  })

  it('2. goalDecision oluşur', () => {
    expect([
      'FOCUS_COLLECTION',
      'FOCUS_PROFIT',
      'FOCUS_GROWTH',
      'FOCUS_SHIPMENT',
      'FOCUS_DATA_QUALITY',
      'FOCUS_RISK_REDUCTION',
      'BALANCED_GOALS',
    ]).toContain(goalResult().goalDecision)
  })

  it('3. activeGoals dolu', () => {
    const goals = goalResult().activeGoals
    expect(goals.length).toBeGreaterThanOrEqual(8)
    for (const g of goals) {
      expect(g.id).toBeTruthy()
      expect(g.title.length).toBeGreaterThan(5)
      expect(['ON_TRACK', 'AT_RISK', 'FAILED', 'ACHIEVED']).toContain(g.status)
    }
  })

  it('4. goalProgress her hedef için', () => {
    const res = goalResult()
    expect(res.goalProgress.length).toBe(res.activeGoals.length)
    for (const p of res.goalProgress) {
      expect(['UP', 'DOWN', 'FLAT']).toContain(p.trend)
      expect(p.estimatedCompletion).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('5. goalRisks oluşur', () => {
    const risks = goalResult().goalRisks
    expect(risks.length).toBeGreaterThan(0)
    expect(risks.length).toBeLessThanOrEqual(10)
  })

  it('6. goalOpportunities oluşur', () => {
    const opps = goalResult().goalOpportunities
    expect(opps.length).toBeGreaterThan(0)
    expect(opps.length).toBeLessThanOrEqual(10)
  })

  it('7. managementBriefing 5 madde', () => {
    expect(goalResult().managementBriefing).toHaveLength(5)
  })

  it('8. priority sıralaması P1 önce', () => {
    const goals = goalResult().activeGoals
    const p1idx = goals.findIndex((g) => g.priority === 'P1')
    const p3idx = goals.findIndex((g) => g.priority === 'P3')
    if (p1idx >= 0 && p3idx >= 0) expect(p1idx).toBeLessThan(p3idx)
  })

  it('9. trend hesapları', () => {
    resetGoalProgressStore()
    virtualUpdateGoalProgress('goal-collection-rate', 8)
    const ctx = buildGoalCtx()
    const templates = buildGoalTemplates(ctx, buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator))
    const progress = buildGoalProgress(templates)
    const col = progress.find((p) => p.goalId === 'goal-collection-rate')!
    expect(['UP', 'FLAT', 'DOWN']).toContain(col.trend)
  })

  it('10. hedef ilerleme hesapları', () => {
    resetGoalProgressStore()
    virtualUpdateGoalProgress('goal-profit-margin', 10)
    const res = assembleGoalEngine(buildGoalCtx())
    const profit = res.activeGoals.find((g) => g.id === 'goal-profit-margin')!
    expect(profit.progressPercent).toBeGreaterThan(0)
  })

  it('11. computeGoalScore', () => {
    const res = goalResult()
    expect(computeGoalScore(res.activeGoals)).toBe(res.goalScore)
  })

  it('12. resolveGoalDecision', () => {
    const ctx = buildGoalCtx()
    const res = assembleGoalEngine(ctx)
    expect(resolveGoalDecision(res.activeGoals, ctx.optimization)).toBe(res.goalDecision)
  })

  it('13. buildGoalTemplates 8+ kategori', () => {
    const ctx = buildGoalCtx()
    const templates = buildGoalTemplates(ctx, buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator))
    const cats = new Set(templates.map((t) => t.category))
    expect(cats.has('COLLECTION')).toBe(true)
    expect(cats.has('PROFITABILITY')).toBe(true)
    expect(cats.has('DATA_QUALITY')).toBe(true)
    expect(cats.has('SHIPMENT')).toBe(true)
  })

  it('14. buildActiveGoals', () => {
    const ctx = buildGoalCtx()
    const templates = buildGoalTemplates(ctx, buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator))
    expect(buildActiveGoals(templates).length).toBeGreaterThanOrEqual(8)
  })

  it('15. buildGoalRisks', () => {
    const res = goalResult()
    expect(buildGoalRisks(res.activeGoals).length).toBeGreaterThan(0)
  })

  it('16. buildGoalOpportunities', () => {
    const ctx = buildGoalCtx()
    const res = assembleGoalEngine(ctx)
    expect(buildGoalOpportunities(res.activeGoals, ctx.learning).length).toBeGreaterThan(0)
  })

  it('17. buildGoalManagementBriefing', () => {
    const res = goalResult()
    expect(buildGoalManagementBriefing(res.activeGoals, res.goalDecision)).toHaveLength(5)
  })

  it('18. Learning Engine verisi okunuyor', () => {
    expect(buildGoalCtx().learning.learningScore).toBeGreaterThan(0)
  })

  it('19. Performance Feedback verisi okunuyor', () => {
    expect(buildGoalCtx().feedback.feedbackScore).toBeGreaterThanOrEqual(0)
  })

  it('20. Optimization Engine verisi okunuyor', () => {
    expect(buildGoalCtx().optimization.optimizationScore).toBeGreaterThan(0)
  })

  it('21. boş veri kırılmaz', () => {
    expect(() => goalResult({ profitOrders: [] })).not.toThrow()
  })

  it('22. meta.depoKatiExcluded', () => {
    expect(goalResult().meta.depoKatiExcluded).toBe(true)
  })

  it('23. Depo Katı görünmez', () => {
    expect(JSON.stringify(goalResult())).not.toContain('Depo Katı')
  })

  it('24. WAREHOUSE görünmez', () => {
    expect(JSON.stringify(goalResult())).not.toContain('WAREHOUSE')
  })

  it('25. WAREHOUSE_FLOOR görünmez', () => {
    expect(JSON.stringify(goalResult())).not.toContain('WAREHOUSE_FLOOR')
  })

  it('26. RBAC READ — ADMIN', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.GOAL_ENGINE_READ)).toBe(true)
  })

  it('27. RBAC WRITE — ADMIN', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.GOAL_ENGINE_WRITE)).toBe(true)
  })

  it('28. RBAC READ — MANAGER', () => {
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.GOAL_ENGINE_READ)).toBe(true)
  })

  it('29. RBAC WRITE — MANAGER', () => {
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.GOAL_ENGINE_WRITE)).toBe(true)
  })

  it('30. RBAC — SALES erişemez', () => {
    expect(roleHasPermission(USER_ROLE.SALES, PERM.GOAL_ENGINE_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.GOAL_ENGINE_WRITE)).toBe(false)
  })

  it('31. RBAC — OPERATION erişemez', () => {
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.GOAL_ENGINE_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.GOAL_ENGINE_WRITE)).toBe(false)
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('goalEngine endpoints (canlı)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    resetGoalProgressStore()
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('32. GET endpoint 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/goal-engine' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(typeof body.goalScore).toBe('number')
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
  })

  it('33. PATCH endpoint 200 sanal', async () => {
    const getRes = await app.inject({ method: 'GET', url: '/v1/reports/goal-engine' })
    const getBody = getRes.json() as { activeGoals: { id: string }[] }
    const goalId = getBody.activeGoals[0]!.id
    const res = await app.inject({ method: 'PATCH', url: `/v1/reports/goal-engine/${goalId}` })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { status: string }
    expect(body.status).toBe('UPDATED')
  })
})
