import { buildApp } from '../src/app.js'

const app = await buildApp()
await app.ready()

const getRes = await app.inject({ method: 'GET', url: '/v1/reports/executive-director' })
const getBody = getRes.json() as Record<string, unknown>
const getRaw = JSON.stringify(getBody)

const runRes = await app.inject({ method: 'POST', url: '/v1/reports/executive-director/run' })
const runBody = runRes.json() as Record<string, unknown>

const plan = getBody.dailyPlan as unknown[]
const briefing = getBody.executiveBriefing as { headline?: string } | undefined
const queue = getBody.priorityQueue as unknown[]
const riskMap = getBody.riskMap as unknown[]
const impact = getBody.impactAnalysis as unknown[]
const summary = getBody.summary as { managerScore?: number } | undefined

const checks = {
  getHttp200: getRes.statusCode === 200,
  runHttp200: runRes.statusCode === 200,
  planPresent: Array.isArray(plan) && plan.length > 0,
  briefingPresent: Boolean(briefing?.headline),
  priorityQueuePresent: Array.isArray(queue) && queue.length > 0,
  riskMapPresent: Array.isArray(riskMap) && riskMap.length > 0,
  impactPresent: Array.isArray(impact) && impact.length > 0,
  managerScoreRange:
    typeof summary?.managerScore === 'number' &&
    summary.managerScore >= 0 &&
    summary.managerScore <= 100,
  noDepoKati: !getRaw.includes('Depo Katı'),
  noWarehouse: !getRaw.includes('WAREHOUSE'),
}

console.log(
  JSON.stringify(
    {
      get: { statusCode: getRes.statusCode, planSections: plan?.length, queueCount: queue?.length },
      run: { statusCode: runRes.statusCode, lastRunAt: (runBody.summary as { lastRunAt?: string })?.lastRunAt },
      briefingHeadline: briefing?.headline,
      planSample: (plan as { categoryLabel: string; items: { title: string }[] }[])?.slice(0, 2).map((s) => ({
        section: s.categoryLabel,
        items: s.items.slice(0, 2).map((i) => i.title),
      })),
      checks,
      allPass: Object.values(checks).every(Boolean),
    },
    null,
    2,
  ),
)

await app.close()
