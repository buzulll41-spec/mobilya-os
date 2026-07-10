import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { roleHasPermission, PERM } from '../src/middleware/rbac.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import {
  assembleBusinessBrain,
  computeBrainScore,
  computeFinanceScore,
  computeGrowthScore,
  computeOperationsScore,
  computeRiskScore,
  resolvePrimaryDecision,
} from '../src/services/businessBrainEngine.js'
import { assembleGroupChairman } from '../src/services/groupChairmanEngine.js'
import { assembleHoldingCenter } from '../src/services/holdingCenterEngine.js'
import { buildInvestorCtx } from './investorIntelligence.test.js'

function buildBrainCtx(opts: { profitOrders?: Parameters<typeof buildInvestorCtx>[0]['profitOrders']; delayed?: number } = {}) {
  const investorCtx = buildInvestorCtx(opts)
  const holdingReport = assembleHoldingCenter({ investorCtx, today: investorCtx.strategic.today })
  const groupReport = assembleGroupChairman({ investorCtx, today: investorCtx.strategic.today, holdingReport })
  return { investorCtx, today: investorCtx.strategic.today, holdingReport, groupReport }
}

function brainResult(opts: Parameters<typeof buildBrainCtx>[0] = {}) {
  return assembleBusinessBrain(buildBrainCtx(opts))
}

describe('businessBrainEngine', () => {
  it('1. brainScore 0-100 aralığında', () => {
    const res = brainResult()
    expect(res.brainScore).toBeGreaterThanOrEqual(0)
    expect(res.brainScore).toBeLessThanOrEqual(100)
  })

  it('2. alt skorlar 0-100 aralığında', () => {
    const res = brainResult()
    for (const key of [
      'operationsScore',
      'financeScore',
      'growthScore',
      'riskScore',
      'futureScore',
      'investmentScore',
    ] as const) {
      expect(res[key]).toBeGreaterThanOrEqual(0)
      expect(res[key]).toBeLessThanOrEqual(100)
    }
  })

  it('3. primaryDecision üretilir', () => {
    const res = brainResult()
    expect([
      'COLLECTION_FIRST',
      'AGGRESSIVE_GROWTH',
      'CONTROLLED_GROWTH',
      'DEFENSIVE_MODE',
      'STORE_EXPANSION',
      'SUPPLIER_RESTRUCTURE',
      'COST_REDUCTION',
      'PROFITABILITY_RECOVERY',
      'INVESTMENT_WINDOW',
      'WAIT_AND_MONITOR',
    ]).toContain(res.primaryDecision)
  })

  it('4. todayActions tam 10 madde', () => {
    expect(brainResult().todayActions).toHaveLength(10)
  })

  it('5. plan30Days 10 madde', () => {
    expect(brainResult().plan30Days).toHaveLength(10)
  })

  it('6. plan90Days 10 madde', () => {
    expect(brainResult().plan90Days).toHaveLength(10)
  })

  it('7. plan365Days 10 madde', () => {
    expect(brainResult().plan365Days).toHaveLength(10)
  })

  it('8. topRisks 10 madde', () => {
    expect(brainResult().topRisks).toHaveLength(10)
  })

  it('9. topOpportunities 10 madde', () => {
    expect(brainResult().topOpportunities).toHaveLength(10)
  })

  it('10. managementBriefing 10 madde', () => {
    expect(brainResult().managementBriefing).toHaveLength(10)
  })

  it('11. computeBrainScore ağırlıklı ortalama', () => {
    const score = computeBrainScore({
      operationsScore: 70,
      financeScore: 60,
      growthScore: 80,
      riskScore: 65,
      futureScore: 75,
      investmentScore: 55,
    })
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('12. boş veri kırılmaz', () => {
    expect(() => brainResult({ profitOrders: [] })).not.toThrow()
  })

  it('13. riskli veri profili', () => {
    const res = brainResult({ delayed: 12 })
    expect(res.brainScore).toBeGreaterThanOrEqual(0)
    expect(res.primaryDecision).toBeTruthy()
  })

  it('14. primaryDecision resolve çalışır', () => {
    const ctx = buildBrainCtx()
    expect(resolvePrimaryDecision(ctx, 55)).toBeTruthy()
  })

  it('15. operationsScore hesaplanır', () => {
    expect(computeOperationsScore(buildBrainCtx())).toBeGreaterThanOrEqual(0)
  })

  it('16. financeScore hesaplanır', () => {
    expect(computeFinanceScore(buildBrainCtx())).toBeGreaterThanOrEqual(0)
  })

  it('17. growthScore hesaplanır', () => {
    expect(computeGrowthScore(buildBrainCtx())).toBeGreaterThanOrEqual(0)
  })

  it('18. riskScore hesaplanır', () => {
    expect(computeRiskScore(buildBrainCtx())).toBeGreaterThanOrEqual(0)
  })

  it('19. Depo Katı görünmez', () => {
    expect(JSON.stringify(brainResult())).not.toContain('Depo Katı')
  })

  it('20. WAREHOUSE görünmez', () => {
    expect(JSON.stringify(brainResult())).not.toContain('WAREHOUSE')
  })

  it('21. meta.depoKatiExcluded true', () => {
    expect(brainResult().meta.depoKatiExcluded).toBe(true)
  })

  it('22. RBAC — ADMIN erişir', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.BUSINESS_BRAIN_READ)).toBe(true)
  })

  it('23. RBAC — MANAGER erişir', () => {
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.BUSINESS_BRAIN_READ)).toBe(true)
  })

  it('24. RBAC — SALES erişemez', () => {
    expect(roleHasPermission(USER_ROLE.SALES, PERM.BUSINESS_BRAIN_READ)).toBe(false)
  })

  it('25. RBAC — OPERATION erişemez', () => {
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.BUSINESS_BRAIN_READ)).toBe(false)
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/business-brain (canlı)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('26. canlı endpoint 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/business-brain' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(typeof body.brainScore).toBe('number')
    expect(body.todayActions).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
  })
})
