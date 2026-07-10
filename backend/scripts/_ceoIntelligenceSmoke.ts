import { buildApp } from '../src/app.js'

const app = await buildApp()
await app.ready()

const res = await app.inject({ method: 'GET', url: '/v1/reports/ceo-intelligence' })
const body = res.json() as Record<string, unknown>
const raw = JSON.stringify(body)

const checks = {
  status200: res.statusCode === 200,
  summary: Boolean(body.summary),
  ceoScore: typeof body.ceoScore === 'number',
  ceoDecision: Boolean(body.ceoDecision),
  ceoReason: Array.isArray(body.ceoReason) && (body.ceoReason as unknown[]).length > 0,
  topProblems: Array.isArray(body.topProblems) && (body.topProblems as unknown[]).length > 0,
  topOpportunities: Array.isArray(body.topOpportunities) && (body.topOpportunities as unknown[]).length > 0,
  todayActions: Array.isArray(body.todayActions) && (body.todayActions as unknown[]).length === 5,
  next30Days: Array.isArray(body.next30Days) && (body.next30Days as unknown[]).length > 0,
  next90Days: Array.isArray(body.next90Days) && (body.next90Days as unknown[]).length > 0,
  noDepoKati: !raw.includes('Depo Katı'),
  noWarehouse: !raw.includes('WAREHOUSE'),
  depoKatiExcluded: (body.meta as { depoKatiExcluded?: boolean })?.depoKatiExcluded === true,
  sourcesRead: ((body.summary as { sourcesRead?: number })?.sourcesRead ?? 0) >= 12,
}

console.log(
  JSON.stringify(
    {
      status: res.statusCode,
      checks,
      allPass: Object.values(checks).every(Boolean),
      ceoScore: body.ceoScore,
      ceoDecision: body.ceoDecision,
      reasonCount: (body.ceoReason as unknown[])?.length,
      actionCount: (body.todayActions as unknown[])?.length,
    },
    null,
    2,
  ),
)

await app.close()
