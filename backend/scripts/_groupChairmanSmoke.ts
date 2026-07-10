import { buildApp } from '../src/app.js'



const app = await buildApp()

await app.ready()



const res = await app.inject({ method: 'GET', url: '/v1/reports/group-chairman' })

const body = res.json() as Record<string, unknown>

const raw = JSON.stringify(body)



const allocation = body.recommendedCapitalAllocation as { percentage: number }[] | undefined

const capitalSum = allocation?.reduce((s, a) => s + a.percentage, 0) ?? 0



const checks = {

  status200: res.statusCode === 200,

  summary: Boolean(body.summary),

  groupChairmanScore: typeof body.groupChairmanScore === 'number',

  groupDecision: Boolean(body.groupDecision),

  groupHealth: typeof body.groupHealth === 'number',

  capitalStrategy: Boolean(body.capitalStrategy),

  companyDecisions:

    Array.isArray(body.companyDecisions) && (body.companyDecisions as unknown[]).length === 5,

  oneYearPlan: Array.isArray(body.oneYearPlan) && (body.oneYearPlan as unknown[]).length === 10,

  threeYearPlan: Array.isArray(body.threeYearPlan) && (body.threeYearPlan as unknown[]).length === 10,

  fiveYearPlan: Array.isArray(body.fiveYearPlan) && (body.fiveYearPlan as unknown[]).length === 10,

  threats: Array.isArray(body.groupThreats) && (body.groupThreats as unknown[]).length >= 10,

  opportunities:

    Array.isArray(body.groupOpportunities) && (body.groupOpportunities as unknown[]).length >= 10,

  strategicActions:

    Array.isArray(body.strategicActions) && (body.strategicActions as unknown[]).length >= 10,

  briefing: Array.isArray(body.chairmanBriefing) && (body.chairmanBriefing as unknown[]).length === 5,

  allocation: Array.isArray(allocation) && allocation.length === 5,

  capitalSum100: capitalSum === 100,

  alignment: Boolean(body.alignmentAnalysis),

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

      groupChairmanScore: body.groupChairmanScore,

      groupDecision: body.groupDecision,

      capitalStrategy: body.capitalStrategy,

      capitalSum,

    },

    null,

    2,

  ),

)



await app.close()

