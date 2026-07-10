import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { roleHasPermission, PERM } from '../src/middleware/rbac.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import type { HoldingCompanyDto } from '../src/contracts/holdingCenterDto.js'
import {
  assembleHoldingCenter,
  buildCompanyProfiles,
  computeCapitalAllocation,
  computeHoldingScore,
  resolveBestWorst,
  resolveHoldingDecision,
} from '../src/services/holdingCenterEngine.js'
import { buildInvestorCtx } from './investorIntelligence.test.js'

function holdingResult() {
  const investorCtx = buildInvestorCtx()
  return assembleHoldingCenter({ investorCtx, today: investorCtx.strategic.today })
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

describe('holdingCenterEngine', () => {
  it('1. holdingScore 0-100 aralığında', () => {
    const res = holdingResult()
    expect(res.holdingScore).toBeGreaterThanOrEqual(0)
    expect(res.holdingScore).toBeLessThanOrEqual(100)
  })

  it('2. holdingDecision üretilir', () => {
    const res = holdingResult()
    expect(['INVEST', 'GROW', 'MAINTAIN', 'REDUCE', 'EXIT']).toContain(res.holdingDecision)
  })

  it('3. 5 şirket profili oluşur', () => {
    const res = holdingResult()
    expect(res.companies).toHaveLength(5)
    const ids = res.companies.map((c) => c.id)
    expect(ids).toContain('EVTREND')
    expect(ids).toContain('MONESKO')
    expect(ids).toContain('USTANET')
    expect(ids).toContain('ATLAS_CONNECT')
    expect(ids).toContain('MOBILYA_OS')
  })

  it('4. şirket skorları 0-100 aralığında', () => {
    const res = holdingResult()
    for (const c of res.companies) {
      expect(c.companyScore).toBeGreaterThanOrEqual(0)
      expect(c.companyScore).toBeLessThanOrEqual(100)
      expect(c.companyHealth).toBeGreaterThanOrEqual(0)
      expect(c.companyHealth).toBeLessThanOrEqual(100)
      expect(c.riskScore).toBeGreaterThanOrEqual(0)
      expect(c.riskScore).toBeLessThanOrEqual(100)
      expect(c.growthScore).toBeGreaterThanOrEqual(0)
      expect(c.growthScore).toBeLessThanOrEqual(100)
      expect(c.profitabilityScore).toBeGreaterThanOrEqual(0)
      expect(c.profitabilityScore).toBeLessThanOrEqual(100)
    }
  })

  it('5. capitalAllocation toplamı %100', () => {
    const res = holdingResult()
    const sum = res.capitalAllocation.reduce((s, a) => s + a.percentage, 0)
    expect(sum).toBe(100)
    expect(res.capitalAllocation).toHaveLength(5)
  })

  it('6. capitalAllocation mock toplamı %100', () => {
    const alloc = computeCapitalAllocation(MOCK_COMPANIES)
    const sum = alloc.reduce((s, a) => s + a.percentage, 0)
    expect(sum).toBe(100)
  })

  it('7. growthRanking 1-5 sıralama', () => {
    const res = holdingResult()
    expect(res.growthRanking).toHaveLength(5)
    const ranks = res.growthRanking.map((r) => r.rank).sort((a, b) => a - b)
    expect(ranks).toEqual([1, 2, 3, 4, 5])
    expect(res.growthRanking[0]!.rank).toBe(1)
  })

  it('8. riskRanking 1-5 sıralama', () => {
    const res = holdingResult()
    expect(res.riskRanking).toHaveLength(5)
    const ranks = res.riskRanking.map((r) => r.rank).sort((a, b) => a - b)
    expect(ranks).toEqual([1, 2, 3, 4, 5])
  })

  it('9. profitabilityRanking 1-5 sıralama', () => {
    const res = holdingResult()
    expect(res.profitabilityRanking).toHaveLength(5)
    const ranks = res.profitabilityRanking.map((r) => r.rank).sort((a, b) => a - b)
    expect(ranks).toEqual([1, 2, 3, 4, 5])
  })

  it('10. investmentRanking 1-5 sıralama', () => {
    const res = holdingResult()
    expect(res.investmentRanking).toHaveLength(5)
    const ranks = res.investmentRanking.map((r) => r.rank).sort((a, b) => a - b)
    expect(ranks).toEqual([1, 2, 3, 4, 5])
  })

  it('11. bestCompany ve worstCompany belirlenir', () => {
    const res = holdingResult()
    expect(res.bestCompany).toBeTruthy()
    expect(res.worstCompany).toBeTruthy()
    expect(res.bestCompany).toBe(res.summary.bestCompany)
    expect(res.worstCompany).toBe(res.summary.worstCompany)
  })

  it('12. best/worst mock tutarlılığı', () => {
    const { best, worst } = resolveBestWorst(MOCK_COMPANIES)
    expect(best).toBe('EVTREND')
    expect(worst).toBe('USTANET')
  })

  it('13. holdingOpportunities minimum 10', () => {
    const res = holdingResult()
    expect(res.holdingOpportunities.length).toBeGreaterThanOrEqual(10)
  })

  it('14. holdingRisks minimum 10', () => {
    const res = holdingResult()
    expect(res.holdingRisks.length).toBeGreaterThanOrEqual(10)
  })

  it('15. holdingBriefing 5 paragraf', () => {
    const res = holdingResult()
    expect(res.holdingBriefing).toHaveLength(5)
  })

  it('16. fiveYearVision minimum 10', () => {
    const res = holdingResult()
    expect(res.fiveYearVision.length).toBeGreaterThanOrEqual(10)
  })

  it('17. holdingScore hesap tutarlılığı', () => {
    const res = holdingResult()
    const companies = buildCompanyProfiles(buildInvestorCtx())
    expect(computeHoldingScore(companies)).toBe(res.holdingScore)
  })

  it('18. holdingDecision hesap tutarlılığı', () => {
    const res = holdingResult()
    const companies = buildCompanyProfiles(buildInvestorCtx())
    expect(resolveHoldingDecision(res.holdingScore, companies)).toBe(res.holdingDecision)
  })

  it('19. INVEST kararı yüksek skor profili', () => {
    const highScore = MOCK_COMPANIES.map((c) => ({
      ...c,
      companyScore: 85,
      growthScore: 80,
      riskScore: 75,
      companyHealth: 82,
    }))
    const score = computeHoldingScore(highScore)
    const decision = resolveHoldingDecision(score, highScore)
    expect(score).toBeGreaterThanOrEqual(80)
    expect(decision).toBe('INVEST')
  })

  it('20. EXIT kararı düşük skor profili', () => {
    const lowScore = MOCK_COMPANIES.map((c) => ({
      ...c,
      companyScore: 25,
      growthScore: 20,
      riskScore: 30,
      companyHealth: 22,
    }))
    const score = computeHoldingScore(lowScore)
    const decision = resolveHoldingDecision(score, lowScore)
    expect(score).toBeLessThan(35)
    expect(decision).toBe('EXIT')
  })

  it('21. Depo Katı görünmez', () => {
    expect(JSON.stringify(holdingResult())).not.toContain('Depo Katı')
  })

  it('22. WAREHOUSE görünmez', () => {
    expect(JSON.stringify(holdingResult())).not.toContain('WAREHOUSE')
  })

  it('23. yetki ADMIN only', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.HOLDING_CENTER_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.HOLDING_CENTER_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.HOLDING_CENTER_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.HOLDING_CENTER_READ)).toBe(false)
  })

  it('24. meta.depoKatiExcluded true', () => {
    const res = holdingResult()
    expect(res.meta.depoKatiExcluded).toBe(true)
  })

  it('25. summary holdingScore eşleşir', () => {
    const res = holdingResult()
    expect(res.summary.holdingScore).toBe(res.holdingScore)
    expect(res.summary.holdingDecision).toBe(res.holdingDecision)
    expect(res.summary.companyCount).toBe(5)
    expect(res.summary.capitalAllocationTotal).toBe(100)
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/holding-center (canlı)', () => {
  let app: FastifyInstance
  let schemaReady = false

  beforeAll(async () => {
    try {
      const { PrismaClient } = await import('@prisma/client')
      const probe = new PrismaClient()
      await probe.salesOrder.findFirst({ take: 1 })
      await probe.$disconnect()
      schemaReady = true
    } catch {
      schemaReady = false
      return
    }
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    if (app) await app.close()
  })

  it.skipIf(() => !schemaReady)('Canlı smoke GET 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/holding-center' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(body.summary).toBeTruthy()
    expect(body.holdingScore).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
    const alloc = body.capitalAllocation as { percentage: number }[]
    const sum = alloc.reduce((s, a) => s + a.percentage, 0)
    expect(sum).toBe(100)
  })
})
