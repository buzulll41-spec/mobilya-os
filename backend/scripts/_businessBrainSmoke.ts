import { buildApp } from '../src/app.js'



const app = await buildApp()

await app.ready()



const res = await app.inject({ method: 'GET', url: '/v1/reports/business-brain' })

const body = res.json() as Record<string, unknown>

const raw = JSON.stringify(body)



const checks = {

  status200: res.statusCode === 200,

  brainScore: typeof body.brainScore === 'number',

  primaryDecision: Boolean(body.primaryDecision),

  todayActions: Array.isArray(body.todayActions) && (body.todayActions as unknown[]).length === 10,

  plan30Days: Array.isArray(body.plan30Days) && (body.plan30Days as unknown[]).length === 10,

  plan90Days: Array.isArray(body.plan90Days) && (body.plan90Days as unknown[]).length === 10,

  plan365Days: Array.isArray(body.plan365Days) && (body.plan365Days as unknown[]).length === 10,

  topRisks: Array.isArray(body.topRisks) && (body.topRisks as unknown[]).length === 10,

  topOpportunities:

    Array.isArray(body.topOpportunities) && (body.topOpportunities as unknown[]).length === 10,

  managementBriefing:

    Array.isArray(body.managementBriefing) && (body.managementBriefing as unknown[]).length === 10,

  subScores:

    typeof body.operationsScore === 'number' &&

    typeof body.financeScore === 'number' &&

    typeof body.growthScore === 'number',

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

      brainScore: body.brainScore,

      primaryDecision: body.primaryDecision,

    },

    null,

    2,

  ),

)



await app.close()

