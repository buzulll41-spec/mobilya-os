import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { roleHasPermission, PERM } from '../src/middleware/rbac.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import { assembleStrategicIntelligence } from '../src/services/strategicIntelligenceEngine.js'
import {
  assembleEnterpriseCommandCenter,
  buildCommandManagementBriefing,
  buildCriticalRisks,
  buildGoalStatus,
  buildLearningSummary,
  buildOpportunities,
  buildOperationsSummary,
  buildOptimizationSummary,
  buildTodayActions,
  computeCompanyHealthScore,
  resolveCommandDecision,
} from '../src/services/enterpriseCommandCenterEngine.js'
import { assembleGoalEngine } from '../src/services/goalEngine.js'
import { buildGoalCtx } from './helpers/buildGoalCtx.js'
import { buildInvestorCtx } from './investorIntelligence.test.js'

function buildCommandCenterCtx(opts: Parameters<typeof buildGoalCtx>[0] = {}) {
  const goalCtx = buildGoalCtx(opts)
  const investorCtx = buildInvestorCtx(opts)
  const strategic = assembleStrategicIntelligence(investorCtx.strategic)
  return {
    goalCtx,
    goal: assembleGoalEngine(goalCtx),
    ceo: investorCtx.ceoReport,
    chairman: investorCtx.chairmanReport,
    strategic,
    actionCenter: investorCtx.strategic.actionResult,
    operationCases: investorCtx.strategic.caseResult,
    automationJobs: investorCtx.strategic.jobResult,
    operationsAdvisor: investorCtx.strategic.advisories,
    brain: goalCtx.brain,
  }
}

function commandCenterResult(opts: Parameters<typeof buildGoalCtx>[0] = {}) {
  return assembleEnterpriseCommandCenter(buildCommandCenterCtx(opts))
}

describe('enterpriseCommandCenterEngine', () => {
  it('1. companyHealthScore 0-100', () => {
    const res = commandCenterResult()
    expect(res.companyHealthScore).toBeGreaterThanOrEqual(0)
    expect(res.companyHealthScore).toBeLessThanOrEqual(100)
  })

  it('2. commandDecision oluşur', () => {
    expect(['FOCUS_COLLECTION', 'FOCUS_GROWTH', 'BALANCED_MODE']).toContain(
      commandCenterResult().commandDecision,
    )
  })

  it('3. todayActions dolu', () => {
    const actions = commandCenterResult().todayActions
    expect(actions.length).toBeGreaterThan(0)
    expect(actions.length).toBeLessThanOrEqual(10)
    for (const a of actions) {
      expect(a.id).toBeTruthy()
      expect(a.action.length).toBeGreaterThan(3)
      expect(['P1', 'P2', 'P3']).toContain(a.priority)
    }
  })

  it('4. criticalRisks oluşur', () => {
    const risks = commandCenterResult().criticalRisks
    expect(risks.length).toBeGreaterThan(0)
    expect(risks.length).toBeLessThanOrEqual(10)
  })

  it('5. opportunities oluşur', () => {
    const opps = commandCenterResult().opportunities
    expect(opps.length).toBeGreaterThan(0)
    expect(opps.length).toBeLessThanOrEqual(10)
  })

  it('6. goalStatus sayıları', () => {
    const gs = commandCenterResult().goalStatus
    expect(gs.total).toBeGreaterThanOrEqual(8)
    expect(gs.atRisk).toBeGreaterThanOrEqual(0)
    expect(gs.achieved).toBeGreaterThanOrEqual(0)
  })

  it('7. learningSummary top/bottom 5', () => {
    const ls = commandCenterResult().learningSummary
    expect(ls.topSuccessful.length).toBeGreaterThan(0)
    expect(ls.topSuccessful.length).toBeLessThanOrEqual(5)
    expect(ls.bottomFailed.length).toBeGreaterThan(0)
    expect(ls.bottomFailed.length).toBeLessThanOrEqual(5)
  })

  it('8. optimizationSummary', () => {
    const os = commandCenterResult().optimizationSummary
    expect(os.strategyChanges).toBeGreaterThanOrEqual(0)
    expect(os.agentChanges).toBeGreaterThanOrEqual(0)
  })

  it('9. operationsSummary', () => {
    const os = commandCenterResult().operationsSummary
    expect(os.openCases).toBeGreaterThanOrEqual(0)
    expect(os.criticalCases).toBeGreaterThanOrEqual(0)
    expect(os.pendingTasks).toBeGreaterThanOrEqual(0)
    expect(os.automationQueue).toBeGreaterThanOrEqual(0)
  })

  it('10. managementBriefing 5 paragraf', () => {
    expect(commandCenterResult().managementBriefing).toHaveLength(5)
  })

  it('11. computeCompanyHealthScore', () => {
    const ctx = buildCommandCenterCtx()
    const res = assembleEnterpriseCommandCenter(ctx)
    expect(computeCompanyHealthScore(ctx)).toBe(res.companyHealthScore)
  })

  it('12. resolveCommandDecision', () => {
    const ctx = buildCommandCenterCtx()
    const res = assembleEnterpriseCommandCenter(ctx)
    expect(resolveCommandDecision(ctx.goal.goalDecision)).toBe(res.commandDecision)
  })

  it('13. buildTodayActions dedupe', () => {
    const ctx = buildCommandCenterCtx()
    const actions = buildTodayActions(ctx)
    const keys = actions.map((a) => a.action.toLowerCase().trim())
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('14. buildCriticalRisks kaynak çeşitliliği', () => {
    const risks = buildCriticalRisks(buildCommandCenterCtx())
    const sources = new Set(risks.map((r) => r.source))
    expect(sources.size).toBeGreaterThan(0)
  })

  it('15. buildOpportunities', () => {
    expect(buildOpportunities(buildCommandCenterCtx()).length).toBeGreaterThan(0)
  })

  it('16. buildGoalStatus', () => {
    const ctx = buildCommandCenterCtx()
    const gs = buildGoalStatus(ctx.goal)
    expect(gs.total).toBe(ctx.goal.activeGoals.length)
  })

  it('17. buildLearningSummary', () => {
    const ls = buildLearningSummary(buildCommandCenterCtx())
    expect(ls.topSuccessful[0]!.successRate).toBeGreaterThanOrEqual(ls.bottomFailed[0]!.successRate)
  })

  it('18. buildOptimizationSummary', () => {
    const os = buildOptimizationSummary(buildCommandCenterCtx())
    expect(typeof os.strategyChanges).toBe('number')
    expect(typeof os.agentChanges).toBe('number')
  })

  it('19. buildOperationsSummary', () => {
    const os = buildOperationsSummary(buildCommandCenterCtx())
    expect(os.pendingTasks).toBeGreaterThanOrEqual(0)
  })

  it('20. buildCommandManagementBriefing', () => {
    expect(buildCommandManagementBriefing(buildCommandCenterCtx())).toHaveLength(5)
  })

  it('21. boş veri kırılmaz', () => {
    expect(() => commandCenterResult({ profitOrders: [] })).not.toThrow()
  })

  it('22. meta.depoKatiExcluded', () => {
    expect(commandCenterResult().meta.depoKatiExcluded).toBe(true)
  })

  it('23. Depo Katı görünmez', () => {
    expect(JSON.stringify(commandCenterResult())).not.toContain('Depo Katı')
  })

  it('24. WAREHOUSE görünmez', () => {
    expect(JSON.stringify(commandCenterResult())).not.toContain('WAREHOUSE')
  })

  it('25. WAREHOUSE_FLOOR görünmez', () => {
    expect(JSON.stringify(commandCenterResult())).not.toContain('WAREHOUSE_FLOOR')
  })

  it('26. RBAC READ — ADMIN', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.ENTERPRISE_COMMAND_CENTER_READ)).toBe(true)
  })

  it('27. RBAC READ — MANAGER', () => {
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.ENTERPRISE_COMMAND_CENTER_READ)).toBe(true)
  })

  it('28. RBAC — SALES erişemez', () => {
    expect(roleHasPermission(USER_ROLE.SALES, PERM.ENTERPRISE_COMMAND_CENTER_READ)).toBe(false)
  })

  it('29. RBAC — OPERATION erişemez', () => {
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.ENTERPRISE_COMMAND_CENTER_READ)).toBe(false)
  })

  it('30. currency TRY', () => {
    expect(commandCenterResult().currency).toBe('TRY')
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('enterpriseCommandCenter endpoints (canlı)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('31. GET endpoint 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/enterprise-command-center' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(typeof body.companyHealthScore).toBe('number')
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
  })
})
