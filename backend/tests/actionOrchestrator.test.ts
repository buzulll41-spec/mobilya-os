import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { roleHasPermission, PERM } from '../src/middleware/rbac.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import {
  assembleActionOrchestrator,
  buildAffectedTasks,
  buildExecutionPlan,
  buildPriorityOverrides,
  computeOrchestratorScore,
  resetOrchestratorStore,
} from '../src/services/actionOrchestratorEngine.js'
import { assembleBusinessBrain } from '../src/services/businessBrainEngine.js'
import { assembleGroupChairman } from '../src/services/groupChairmanEngine.js'
import { assembleHoldingCenter } from '../src/services/holdingCenterEngine.js'
import { assembleOperationsAgentsResponse } from '../src/services/operationsAgentsEngine.js'
import { buildInvestorCtx } from './investorIntelligence.test.js'

function buildOrchestratorCtx(opts: Parameters<typeof buildInvestorCtx>[0] = {}) {
  const investorCtx = buildInvestorCtx(opts)
  const holdingReport = assembleHoldingCenter({ investorCtx, today: investorCtx.strategic.today })
  const groupReport = assembleGroupChairman({ investorCtx, today: investorCtx.strategic.today, holdingReport })
  const brain = assembleBusinessBrain({
    investorCtx,
    today: investorCtx.strategic.today,
    holdingReport,
    groupReport,
  })
  const agents = assembleOperationsAgentsResponse({
    ...investorCtx.strategic,
    runTimestamps: new Map(),
  })
  return { brain, ceo: investorCtx.strategic, agents, today: brain.today }
}

function orchestratorResult(opts: Parameters<typeof buildOrchestratorCtx>[0] = {}) {
  return assembleActionOrchestrator(buildOrchestratorCtx(opts))
}

describe('actionOrchestratorEngine', () => {
  beforeEach(() => {
    resetOrchestratorStore()
  })

  it('1. orchestratorScore 0-100 aralığında', () => {
    const res = orchestratorResult()
    expect(res.orchestratorScore).toBeGreaterThanOrEqual(0)
    expect(res.orchestratorScore).toBeLessThanOrEqual(100)
  })

  it('2. activeStrategy brain kararından gelir', () => {
    const ctx = buildOrchestratorCtx()
    const res = assembleActionOrchestrator(ctx)
    expect(res.activeStrategy).toBe(ctx.brain.primaryDecision)
  })

  it('3. priorityOverrides oluşur', () => {
    const res = orchestratorResult()
    expect(res.priorityOverrides.length).toBeGreaterThan(0)
    for (const o of res.priorityOverrides) {
      expect(o.boost).toBeGreaterThan(0)
      expect(o.targetType).toBeTruthy()
    }
  })

  it('4. COLLECTION_FIRST override haritası', () => {
    const overrides = buildPriorityOverrides('COLLECTION_FIRST')
    expect(overrides.find((o) => o.target === 'COLLECTION')?.boost).toBe(50)
    expect(overrides.find((o) => o.target === 'COLLECTION_AGENT')?.boost).toBe(50)
  })

  it('5. STORE_EXPANSION override haritası', () => {
    const overrides = buildPriorityOverrides('STORE_EXPANSION')
    expect(overrides.find((o) => o.target === 'GROWTH')?.boost).toBe(50)
    expect(overrides.find((o) => o.target === 'INVESTMENT')?.boost).toBe(40)
  })

  it('6. DEFENSIVE_MODE override haritası', () => {
    const overrides = buildPriorityOverrides('DEFENSIVE_MODE')
    expect(overrides.find((o) => o.target === 'RISK')?.boost).toBe(50)
    expect(overrides.find((o) => o.target === 'COLLECTION')?.boost).toBe(40)
  })

  it('7. executionPlan 20 madde', () => {
    expect(orchestratorResult().executionPlan).toHaveLength(20)
  })

  it('8. affectedTasks listesi oluşur', () => {
    expect(Array.isArray(orchestratorResult().affectedTasks)).toBe(true)
  })

  it('9. affectedCases listesi oluşur', () => {
    expect(Array.isArray(orchestratorResult().affectedCases)).toBe(true)
  })

  it('10. affectedJobs listesi oluşur', () => {
    expect(Array.isArray(orchestratorResult().affectedJobs)).toBe(true)
  })

  it('11. affectedAgents listesi oluşur', () => {
    expect(orchestratorResult().affectedAgents.length).toBeGreaterThan(0)
  })

  it('12. computeOrchestratorScore', () => {
    const score = computeOrchestratorScore(
      60,
      [{ id: '1', name: 't', category: 'COLLECTION', originalPriority: 'P2', boostedPriority: 'P1', boost: 50 }],
      10,
      Array(20).fill('x'),
    )
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('13. buildAffectedTasks boost uygular', () => {
    const tasks = buildAffectedTasks('COLLECTION_FIRST', [
      {
        id: 't1',
        priority: 'P3',
        category: 'COLLECTION',
        title: 'Tahsilat ara',
        reason: 'risk',
        recommendedAction: 'ara',
        assignedRole: 'COLLECTION',
        relatedEntityType: null,
        relatedEntityId: null,
        status: 'OPEN',
        evidence: {},
        createdAt: '2026-01-01',
        lastActionAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ])
    expect(tasks[0]?.boostedPriority).toBe('P1')
  })

  it('14. boş veri kırılmaz', () => {
    expect(() => orchestratorResult({ profitOrders: [] })).not.toThrow()
  })

  it('15. brainScore yansır', () => {
    const ctx = buildOrchestratorCtx()
    const res = assembleActionOrchestrator(ctx)
    expect(res.brainScore).toBe(ctx.brain.brainScore)
  })

  it('16. meta.depoKatiExcluded true', () => {
    expect(orchestratorResult().meta.depoKatiExcluded).toBe(true)
  })

  it('17. Depo Katı görünmez', () => {
    expect(JSON.stringify(orchestratorResult())).not.toContain('Depo Katı')
  })

  it('18. WAREHOUSE görünmez', () => {
    expect(JSON.stringify(orchestratorResult())).not.toContain('WAREHOUSE')
  })

  it('19. RBAC READ — ADMIN erişir', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.ACTION_ORCHESTRATOR_READ)).toBe(true)
  })

  it('20. RBAC READ — MANAGER erişir', () => {
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.ACTION_ORCHESTRATOR_READ)).toBe(true)
  })

  it('21. RBAC RUN — ADMIN erişir', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.ACTION_ORCHESTRATOR_RUN)).toBe(true)
  })

  it('22. RBAC RUN — MANAGER erişir', () => {
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.ACTION_ORCHESTRATOR_RUN)).toBe(true)
  })

  it('23. RBAC — SALES erişemez', () => {
    expect(roleHasPermission(USER_ROLE.SALES, PERM.ACTION_ORCHESTRATOR_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.ACTION_ORCHESTRATOR_RUN)).toBe(false)
  })

  it('24. runStatus PLANNED varsayılan', () => {
    expect(orchestratorResult().runStatus).toBe('PLANNED')
  })

  it('25. buildExecutionPlan brain aksiyonlarını kullanır', () => {
    const ctx = buildOrchestratorCtx()
    const plan = buildExecutionPlan(ctx.brain, ctx.ceo)
    expect(plan).toHaveLength(20)
    expect(plan[0]).toBe(ctx.brain.todayActions[0])
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('action-orchestrator endpoints (canlı)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('26. GET 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/action-orchestrator' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(typeof body.orchestratorScore).toBe('number')
    expect(body.activeStrategy).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
  })

  it('27. POST run 200', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/reports/action-orchestrator/run' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(body.runStatus).toBe('APPLIED')
    expect(Array.isArray(body.executionPlan)).toBe(true)
  })
})
