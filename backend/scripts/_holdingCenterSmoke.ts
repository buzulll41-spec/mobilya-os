import { buildApp } from '../src/app.js'

const app = await buildApp()
await app.ready()

const res = await app.inject({ method: 'GET', url: '/v1/reports/holding-center' })
const body = res.json() as Record<string, unknown>
const raw = JSON.stringify(body)

const capitalAllocation = body.capitalAllocation as { percentage: number }[] | undefined
const capitalSum = capitalAllocation?.reduce((s, a) => s + a.percentage, 0) ?? 0

const checks = {
  status200: res.statusCode === 200,
  summary: Boolean(body.summary),
  holdingScore: typeof body.holdingScore === 'number',
  holdingDecision: Boolean(body.holdingDecision),
  companies: Array.isArray(body.companies) && (body.companies as unknown[]).length === 5,
  capitalAllocation: Array.isArray(capitalAllocation) && capitalAllocation.length === 5,
  capitalSum100: capitalSum === 100,
  growthRanking: Array.isArray(body.growthRanking) && (body.growthRanking as unknown[]).length === 5,
  riskRanking: Array.isArray(body.riskRanking) && (body.riskRanking as unknown[]).length === 5,
  profitabilityRanking:
    Array.isArray(body.profitabilityRanking) && (body.profitabilityRanking as unknown[]).length === 5,
  investmentRanking:
    Array.isArray(body.investmentRanking) && (body.investmentRanking as unknown[]).length === 5,
  bestCompany: Boolean(body.bestCompany),
  worstCompany: Boolean(body.worstCompany),
  opportunities:
    Array.isArray(body.holdingOpportunities) && (body.holdingOpportunities as unknown[]).length >= 10,
  risks: Array.isArray(body.holdingRisks) && (body.holdingRisks as unknown[]).length >= 10,
  briefing: Array.isArray(body.holdingBriefing) && (body.holdingBriefing as unknown[]).length === 5,
  vision: Array.isArray(body.fiveYearVision) && (body.fiveYearVision as unknown[]).length >= 10,
  noDepoKati: !raw.includes('Depo Katı'),
  noWarehouse: !raw.includes('WAREHOUSE'),
  depoKatiExcluded: (body.meta as { depoKatiExcluded?: boolean })?.depoKatiExcluded === true,
}

console.log(
  JSON.stringify(
    {
      status: res.statusCode,
      checks,
      allPass: Object.values(checks).every(Boolean),
      holdingScore: body.holdingScore,
      holdingDecision: body.holdingDecision,
      bestCompany: body.bestCompany,
      worstCompany: body.worstCompany,
      capitalSum,
    },
    null,
    2,
  ),
)

await app.close()
