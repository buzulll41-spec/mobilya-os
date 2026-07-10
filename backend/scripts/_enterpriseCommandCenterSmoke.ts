import { buildApp } from '../src/app.js'

process.env.AUTH_DISABLED = 'true'

const app = await buildApp()
await app.ready()

const getRes = await app.inject({ method: 'GET', url: '/v1/reports/enterprise-command-center' })
const getBody = getRes.json() as Record<string, unknown>
const getRaw = JSON.stringify(getBody)

const checks = {
  status200: getRes.statusCode === 200,
  companyHealthScore: typeof getBody.companyHealthScore === 'number',
  commandDecision: typeof getBody.commandDecision === 'string',
  todayActions:
    Array.isArray(getBody.todayActions) && (getBody.todayActions as unknown[]).length > 0,
  criticalRisks:
    Array.isArray(getBody.criticalRisks) && (getBody.criticalRisks as unknown[]).length > 0,
  opportunities:
    Array.isArray(getBody.opportunities) && (getBody.opportunities as unknown[]).length > 0,
  goalStatus: typeof getBody.goalStatus === 'object' && getBody.goalStatus !== null,
  learningSummary: typeof getBody.learningSummary === 'object' && getBody.learningSummary !== null,
  optimizationSummary:
    typeof getBody.optimizationSummary === 'object' && getBody.optimizationSummary !== null,
  operationsSummary:
    typeof getBody.operationsSummary === 'object' && getBody.operationsSummary !== null,
  managementBriefing:
    Array.isArray(getBody.managementBriefing) &&
    (getBody.managementBriefing as unknown[]).length === 5,
  depoKatiExcluded: (getBody.meta as { depoKatiExcluded?: boolean })?.depoKatiExcluded === true,
  noDepoKati: !getRaw.includes('Depo Katı'),
  noWarehouse: !getRaw.includes('WAREHOUSE'),
  noWarehouseFloor: !getRaw.includes('WAREHOUSE_FLOOR'),
}

console.log(
  JSON.stringify(
    {
      get: { status: getRes.statusCode, checks },
      allPass: Object.values(checks).every(Boolean),
      companyHealthScore: getBody.companyHealthScore,
      commandDecision: getBody.commandDecision,
    },
    null,
    2,
  ),
)

await app.close()
