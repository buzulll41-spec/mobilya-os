import { buildApp } from '../src/app.js'

const app = await buildApp()
await app.ready()
const res = await app.inject({ method: 'GET', url: '/v1/reports/strategic-intelligence' })
const body = res.json() as Record<string, unknown>
const raw = JSON.stringify(body)
const checks = {
  http200: res.statusCode === 200,
  summary: Boolean(body.summary),
  companyHealth: Boolean(body.companyHealth),
  boardBriefing: Boolean(body.boardBriefing),
  recommendations: Array.isArray(body.recommendations) && (body.recommendations as unknown[]).length > 0,
  noDepoKati: !raw.includes('Depo Katı'),
  noWarehouse: !raw.includes('WAREHOUSE'),
}
console.log(JSON.stringify({ statusCode: res.statusCode, checks, allPass: Object.values(checks).every(Boolean), healthScore: (body.companyHealth as { score?: number })?.score, briefingHeadline: (body.boardBriefing as { headline?: string })?.headline }, null, 2))
await app.close()
