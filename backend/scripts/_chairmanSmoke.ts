import { buildApp } from '../src/app.js'

const app = await buildApp()
await app.ready()

const res = await app.inject({ method: 'GET', url: '/v1/reports/chairman-intelligence' })
const body = res.json() as Record<string, unknown>
const raw = JSON.stringify(body)

const checks = {
  status200: res.statusCode === 200,
  summary: Boolean(body.summary),
  chairmanScore: typeof body.chairmanScore === 'number',
  chairmanDecision: Boolean(body.chairmanDecision),
  chairmanReason: Array.isArray(body.chairmanReason) && (body.chairmanReason as unknown[]).length > 0,
  oneYearPlan: Array.isArray(body.oneYearPlan) && (body.oneYearPlan as unknown[]).length > 0,
  threeYearPlan: Array.isArray(body.threeYearPlan) && (body.threeYearPlan as unknown[]).length > 0,
  fiveYearVision: Array.isArray(body.fiveYearVision) && (body.fiveYearVision as unknown[]).length > 0,
  topThreats: Array.isArray(body.topThreats) && (body.topThreats as unknown[]).length > 0,
  topOpportunities: Array.isArray(body.topOpportunities) && (body.topOpportunities as unknown[]).length > 0,
  boardAlignment: Boolean(body.boardAlignment),
  ceoAlignment: Boolean(body.ceoAlignment),
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
      chairmanScore: body.chairmanScore,
      chairmanDecision: body.chairmanDecision,
      boardAlignment: (body.boardAlignment as { status?: string })?.status,
      ceoAlignment: (body.ceoAlignment as { status?: string })?.status,
    },
    null,
    2,
  ),
)

await app.close()
