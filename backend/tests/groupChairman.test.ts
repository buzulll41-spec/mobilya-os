import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { roleHasPermission, PERM } from '../src/middleware/rbac.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import type { HoldingCompanyDto } from '../src/contracts/holdingCenterDto.js'
import {
  assembleGroupChairman,
  buildAlignmentAnalysis,
  buildCompanyDecisions,
  computeAlignmentPct,
  computeGroupChairmanScore,
  computeGroupHealth,
  resolveCapitalStrategy,
  resolveCompanyDecision,
  resolveGroupDecision,
} from '../src/services/groupChairmanEngine.js'
import { assembleHoldingCenter } from '../src/services/holdingCenterEngine.js'
import { buildInvestorCtx } from './investorIntelligence.test.js'

function groupResult() {
  const investorCtx = buildInvestorCtx()
  const holdingReport = assembleHoldingCenter({ investorCtx, today: investorCtx.strategic.today })
  return assembleGroupChairman({ investorCtx, today: investorCtx.strategic.today, holdingReport })
}

const MOCK_COMPANIES: HoldingCompanyDto[] = [
  {
    id: 'EVTREND',
    name: 'EVTREND',
    sector: 'Etkinlik',
    companyScore: 78,
    companyHealth: 75,
    riskScore: 70,
    growthScore: 85,
    profitabilityScore: 65,
    revenueTl: 5000000,
    investmentRank: 1,
  },
  {
    id: 'MONESKO',
    name: 'MONESKO',
    sector: 'Finans',
    companyScore: 72,
    companyHealth: 70,
    riskScore: 68,
    growthScore: 60,
    profitabilityScore: 80,
    revenueTl: 4000000,
    investmentRank: 2,
  },
  {
    id: 'USTANET',
    name: 'USTANET',
    sector: 'Usta',
    companyScore: 55,
    companyHealth: 52,
    riskScore: 48,
    growthScore: 58,
    profitabilityScore: 50,
    revenueTl: 2000000,
    investmentRank: 4,
  },
  {
    id: 'ATLAS_CONNECT',
    name: 'ATLAS CONNECT',
    sector: 'Dağıtım',
    companyScore: 68,
    companyHealth: 65,
    riskScore: 72,
    growthScore: 75,
    profitabilityScore: 62,
    revenueTl: 3500000,
    investmentRank: 3,
  },
  {
    id: 'MOBILYA_OS',
    name: 'MOBILYA OS',
    sector: 'ERP',
    companyScore: 62,
    companyHealth: 58,
    riskScore: 55,
    growthScore: 52,
    profitabilityScore: 60,
    revenueTl: 3000000,
    investmentRank: 5,
  },
]

describe('groupChairmanEngine', () => {
  it('1. groupChairmanScore 0-100 aralığında', () => {
    const res = groupResult()
    expect(res.groupChairmanScore).toBeGreaterThanOrEqual(0)
    expect(res.groupChairmanScore).toBeLessThanOrEqual(100)
  })

  it('2. groupDecision üretilir', () => {
    const res = groupResult()
    expect([
      'AGGRESSIVE_GROWTH',
      'CONTROLLED_GROWTH',
      'MAINTAIN',
      'RESTRUCTURE',
      'DEFENSIVE',
      'CRISIS',
    ]).toContain(res.groupDecision)
  })

  it('3. groupHealth 0-100 aralığında', () => {
    const res = groupResult()
    expect(res.groupHealth).toBeGreaterThanOrEqual(0)
    expect(res.groupHealth).toBeLessThanOrEqual(100)
  })

  it('4. capitalStrategy üretilir', () => {
    const res = groupResult()
    expect(['INVEST', 'BALANCE', 'PROTECT', 'CUT_COSTS']).toContain(res.capitalStrategy)
  })

  it('5. 5 şirket kararı üretilir', () => {
    const res = groupResult()
    expect(res.companyDecisions).toHaveLength(5)
    for (const d of res.companyDecisions) {
      expect(d.companyName).toBeTruthy()
      expect(['INVEST', 'GROW', 'MAINTAIN', 'REDUCE', 'EXIT']).toContain(d.decision)
      expect(d.reason.length).toBeGreaterThan(10)
    }
  })

  it('6. recommendedCapitalAllocation toplamı %100', () => {
    const res = groupResult()
    const sum = res.recommendedCapitalAllocation.reduce((s, a) => s + a.percentage, 0)
    expect(sum).toBe(100)
    expect(res.recommendedCapitalAllocation).toHaveLength(5)
  })

  it('7. oneYearPlan 10 madde', () => {
    const res = groupResult()
    expect(res.oneYearPlan).toHaveLength(10)
  })

  it('8. threeYearPlan 10 madde', () => {
    const res = groupResult()
    expect(res.threeYearPlan).toHaveLength(10)
  })

  it('9. fiveYearPlan 10 madde', () => {
    const res = groupResult()
    expect(res.fiveYearPlan).toHaveLength(10)
  })

  it('10. groupThreats minimum 10', () => {
    const res = groupResult()
    expect(res.groupThreats.length).toBeGreaterThanOrEqual(10)
  })

  it('11. groupOpportunities minimum 10', () => {
    const res = groupResult()
    expect(res.groupOpportunities.length).toBeGreaterThanOrEqual(10)
  })

  it('12. strategicActions minimum 10 öncelikli', () => {
    const res = groupResult()
    expect(res.strategicActions.length).toBeGreaterThanOrEqual(10)
    const priorities = res.strategicActions.map((a) => a.priority).sort((a, b) => a - b)
    expect(priorities[0]).toBe(1)
  })

  it('13. chairmanBriefing 5 paragraf', () => {
    const res = groupResult()
    expect(res.chairmanBriefing).toHaveLength(5)
    for (const p of res.chairmanBriefing) {
      expect(p.length).toBeGreaterThan(50)
    }
  })

  it('14. alignmentAnalysis yüzdesel', () => {
    const res = groupResult()
    const a = res.alignmentAnalysis
    expect(a.ceoAlignment).toBeGreaterThanOrEqual(0)
    expect(a.ceoAlignment).toBeLessThanOrEqual(100)
    expect(a.chairmanAlignment).toBeGreaterThanOrEqual(0)
    expect(a.chairmanAlignment).toBeLessThanOrEqual(100)
    expect(a.investorAlignment).toBeGreaterThanOrEqual(0)
    expect(a.investorAlignment).toBeLessThanOrEqual(100)
    expect(a.holdingAlignment).toBeGreaterThanOrEqual(0)
    expect(a.holdingAlignment).toBeLessThanOrEqual(100)
    expect(a.overallAlignment).toBeGreaterThanOrEqual(0)
    expect(a.overallAlignment).toBeLessThanOrEqual(100)
    expect(a.summary.length).toBeGreaterThan(10)
  })

  it('15. computeGroupChairmanScore mock', () => {
    const score = computeGroupChairmanScore(70, 65, 72, 68, 60, 64)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('16. resolveGroupDecision CRISIS senaryosu', () => {
    expect(resolveGroupDecision(25, 'EXIT', 40, 30, 'CRITICAL')).toBe('CRISIS')
  })

  it('17. resolveGroupDecision AGGRESSIVE_GROWTH senaryosu', () => {
    expect(resolveGroupDecision(85, 'INVEST', 75, 70, 'STRONG_BUY')).toBe('AGGRESSIVE_GROWTH')
  })

  it('18. resolveCapitalStrategy CUT_COSTS', () => {
    expect(resolveCapitalStrategy('CRISIS', 'EXIT')).toBe('CUT_COSTS')
  })

  it('19. company decision INVEST üst sıra', () => {
    const decision = resolveCompanyDecision(MOCK_COMPANIES[0]!)
    expect(decision).toBe('INVEST')
  })

  it('20. company decision EXIT düşük skor', () => {
    const weak: HoldingCompanyDto = {
      ...MOCK_COMPANIES[4]!,
      companyScore: 30,
      investmentRank: 5,
    }
    expect(resolveCompanyDecision(weak)).toBe('EXIT')
  })

  it('21. Depo Katı görünmez', () => {
    expect(JSON.stringify(groupResult())).not.toContain('Depo Katı')
  })

  it('22. WAREHOUSE görünmez', () => {
    expect(JSON.stringify(groupResult())).not.toContain('WAREHOUSE')
  })

  it('23. meta.depoKatiExcluded true', () => {
    expect(groupResult().meta.depoKatiExcluded).toBe(true)
  })

  it('24. summary tutarlılığı', () => {
    const res = groupResult()
    expect(res.summary.groupChairmanScore).toBe(res.groupChairmanScore)
    expect(res.summary.groupDecision).toBe(res.groupDecision)
    expect(res.summary.capitalAllocationTotal).toBe(100)
  })

  it('25. RBAC — ADMIN erişir, MANAGER erişemez', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.GROUP_CHAIRMAN_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.GROUP_CHAIRMAN_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.GROUP_CHAIRMAN_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.GROUP_CHAIRMAN_READ)).toBe(false)
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/group-chairman (canlı)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('26. canlı endpoint 200 ve yapı doğru', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/group-chairman' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(typeof body.groupChairmanScore).toBe('number')
    expect(body.companyDecisions).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
  })
})
