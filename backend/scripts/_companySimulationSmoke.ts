import { buildApp } from '../src/app.js'

const app = await buildApp()
await app.ready()

const getRes = await app.inject({ method: 'GET', url: '/v1/reports/company-simulation' })
const getBody = getRes.json() as Record<string, unknown>
const getRaw = JSON.stringify(getBody)

const postRes = await app.inject({
  method: 'POST',
  url: '/v1/reports/company-simulation/run',
  payload: {
    collectionChangePercent: -20,
    newStoreRevenue: 1500000,
    additionalSalesStaff: 2,
    additionalVehicles: 1,
    externalSupplyIncreasePercent: 50,
  },
})
const postBody = postRes.json() as Record<string, unknown>
const postRaw = JSON.stringify(postBody)

const checks = {
  get200: getRes.statusCode === 200,
  post200: postRes.statusCode === 200,
  summary: Boolean(getBody.summary),
  baseline: Boolean(getBody.baseline),
  scenarios: Array.isArray(getBody.scenarios) && (getBody.scenarios as unknown[]).length >= 5,
  bestCase: Boolean(getBody.bestCase),
  worstCase: Boolean(getBody.worstCase),
  managementAdvice: Boolean(postBody.managementAdvice),
  noDepoKati: !getRaw.includes('Depo Katı') && !postRaw.includes('Depo Katı'),
  noWarehouse: !getRaw.includes('WAREHOUSE') && !postRaw.includes('WAREHOUSE'),
  virtualOnly: (getBody.meta as { virtualOnly?: boolean })?.virtualOnly === true,
}

console.log(
  JSON.stringify(
    {
      getStatus: getRes.statusCode,
      postStatus: postRes.statusCode,
      checks,
      allPass: Object.values(checks).every(Boolean),
      baselineHealth: (getBody.baseline as { companyHealthScore?: number })?.companyHealthScore,
      bestAfter: (getBody.bestCase as { after?: { companyHealthScore?: number } })?.after?.companyHealthScore,
      worstAfter: (getBody.worstCase as { after?: { companyHealthScore?: number } })?.after?.companyHealthScore,
      advice: postBody.managementAdvice,
    },
    null,
    2,
  ),
)

await app.close()
