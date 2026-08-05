import { buildApp } from '../src/app.js'

const app = await buildApp()
await app.ready()

const getRes = await app.inject({ method: 'GET', url: '/v1/reports/goal-engine' })
const getBody = getRes.json() as Record<string, unknown>
const getRaw = JSON.stringify(getBody)

const goalId = (getBody.activeGoals as { id: string }[])?.[0]?.id ?? 'goal-collection-rate'
const patchRes = await app.inject({ method: 'PATCH', url: `/v1/reports/goal-engine/${goalId}` })
const patchBody = patchRes.json() as Record<string, unknown>

const checks = {
  status200: getRes.statusCode === 200,
  goalScore: typeof getBody.goalScore === 'number',
  goalDecision: typeof getBody.goalDecision === 'string',
  activeGoals: Array.isArray(getBody.activeGoals) && (getBody.activeGoals as unknown[]).length >= 8,
  goalProgress: Array.isArray(getBody.goalProgress) && (getBody.goalProgress as unknown[]).length >= 8,
  goalRisks: Array.isArray(getBody.goalRisks) && (getBody.goalRisks as unknown[]).length > 0,
  goalOpportunities:
    Array.isArray(getBody.goalOpportunities) && (getBody.goalOpportunities as unknown[]).length > 0,
  managementBriefing:
    Array.isArray(getBody.managementBriefing) && (getBody.managementBriefing as unknown[]).length === 5,
  depoKatiExcluded: (getBody.meta as { depoKatiExcluded?: boolean })?.depoKatiExcluded === true,
  noDepoKati: !getRaw.includes('Depo Katı'),
  noWarehouse: !getRaw.includes('WAREHOUSE'),
  noWarehouseFloor: !getRaw.includes('WAREHOUSE_FLOOR'),
  patch200: patchRes.statusCode === 200,
  patchUpdated: (patchBody.status as string) === 'UPDATED',
}

console.log(
  JSON.stringify(
    {
      get: { status: getRes.statusCode, checks },
      patch: { status: patchRes.statusCode, statusField: patchBody.status },
      allPass: Object.values(checks).every(Boolean),
      goalScore: getBody.goalScore,
      goalDecision: getBody.goalDecision,
    },
    null,
    2,
  ),
)

await app.close()
