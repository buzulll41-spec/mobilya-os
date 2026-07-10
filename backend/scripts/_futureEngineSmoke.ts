import { buildApp } from '../src/app.js'

const app = await buildApp()
await app.ready()

const res = await app.inject({ method: 'GET', url: '/v1/reports/future-engine' })
const body = res.json() as Record<string, unknown>
const raw = JSON.stringify(body)

const checks = {
  status200: res.statusCode === 200,
  summary: Boolean(body.summary),
  futureScore: typeof body.futureScore === 'number',
  scenarios: Array.isArray(body.scenarios) && (body.scenarios as unknown[]).length === 6,
  bestScenario: Boolean(body.bestScenario),
  worstScenario: Boolean(body.worstScenario),
  briefing: Array.isArray(body.managementBriefing) && (body.managementBriefing as unknown[]).length === 5,
  noDepoKati: !raw.includes('Depo Katı'),
  noWarehouse: !raw.includes('WAREHOUSE'),
  virtualOnly: (body.meta as { virtualOnly?: boolean })?.virtualOnly === true,
}

console.log(
  JSON.stringify(
    {
      status: res.statusCode,
      checks,
      allPass: Object.values(checks).every(Boolean),
      futureScore: body.futureScore,
      best: (body.bestScenario as { scenarioId?: string })?.scenarioId,
      worst: (body.worstScenario as { scenarioId?: string })?.scenarioId,
    },
    null,
    2,
  ),
)

await app.close()
