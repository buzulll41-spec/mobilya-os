import { buildApp } from '../src/app.js'

const app = await buildApp()
await app.ready()

const getRes = await app.inject({ method: 'GET', url: '/v1/reports/optimization-engine' })
const getBody = getRes.json() as Record<string, unknown>
const getRaw = JSON.stringify(getBody)

const postRes = await app.inject({ method: 'POST', url: '/v1/reports/optimization-engine/apply' })
const postBody = postRes.json() as Record<string, unknown>
const postRaw = JSON.stringify(postBody)

const getChecks = {
  status200: getRes.statusCode === 200,
  optimizationScore: typeof getBody.optimizationScore === 'number',
  optimizationDecision: typeof getBody.optimizationDecision === 'string',
  strategyOptimizations:
    Array.isArray(getBody.strategyOptimizations) && (getBody.strategyOptimizations as unknown[]).length === 8,
  agentOptimizations:
    Array.isArray(getBody.agentOptimizations) && (getBody.agentOptimizations as unknown[]).length === 6,
  recommendedChanges:
    Array.isArray(getBody.recommendedChanges) && (getBody.recommendedChanges as unknown[]).length > 0,
  managementBriefing:
    Array.isArray(getBody.managementBriefing) && (getBody.managementBriefing as unknown[]).length === 5,
  depoKatiExcluded: (getBody.meta as { depoKatiExcluded?: boolean })?.depoKatiExcluded === true,
  noDepoKati: !getRaw.includes('Depo Katı'),
  noWarehouse: !getRaw.includes('WAREHOUSE'),
  noWarehouseFloor: !getRaw.includes('WAREHOUSE_FLOOR'),
}

const postChecks = {
  status200: postRes.statusCode === 200,
  statusApplied: (postBody.status as string) === 'APPLIED',
  appliedChanges: typeof postBody.appliedChanges === 'number' && (postBody.appliedChanges as number) > 0,
  virtualOnly: (postBody.meta as { virtualOnly?: boolean })?.virtualOnly === true,
  depoKatiExcluded: (postBody.meta as { depoKatiExcluded?: boolean })?.depoKatiExcluded === true,
  noDepoKati: !postRaw.includes('Depo Katı'),
  noWarehouse: !postRaw.includes('WAREHOUSE'),
}

const allPass = Object.values(getChecks).every(Boolean) && Object.values(postChecks).every(Boolean)

console.log(
  JSON.stringify(
    {
      get: { status: getRes.statusCode, checks: getChecks },
      post: { status: postRes.statusCode, checks: postChecks },
      allPass,
      optimizationScore: getBody.optimizationScore,
      optimizationDecision: getBody.optimizationDecision,
      appliedChanges: postBody.appliedChanges,
    },
    null,
    2,
  ),
)

await app.close()
