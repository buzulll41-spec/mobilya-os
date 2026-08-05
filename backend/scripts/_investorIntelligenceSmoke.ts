import { buildApp } from '../src/app.js'



const app = await buildApp()

await app.ready()



const res = await app.inject({ method: 'GET', url: '/v1/reports/investor-intelligence' })

const body = res.json() as Record<string, unknown>

const raw = JSON.stringify(body)



const checks = {

  status200: res.statusCode === 200,

  summary: Boolean(body.summary),

  investorScore: typeof body.investorScore === 'number',

  scoreComponents: Boolean(body.scoreComponents),

  companyRating: Boolean(body.companyRating),

  investmentDecision: Boolean(body.investmentDecision),

  newStoreReadiness: Boolean(body.newStoreReadiness),

  swotStrengths: Array.isArray(body.strengths) && (body.strengths as unknown[]).length >= 10,

  swotWeaknesses: Array.isArray(body.weaknesses) && (body.weaknesses as unknown[]).length >= 10,

  swotOpportunities: Array.isArray(body.opportunities) && (body.opportunities as unknown[]).length >= 10,

  swotThreats: Array.isArray(body.threats) && (body.threats as unknown[]).length >= 10,

  briefing: Array.isArray(body.investorBriefing) && (body.investorBriefing as unknown[]).length === 5,

  recommendations: Array.isArray(body.topRecommendations) && (body.topRecommendations as unknown[]).length === 10,

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

      investorScore: body.investorScore,

      companyRating: body.companyRating,

      investmentDecision: body.investmentDecision,

      newStoreReadiness: (body.newStoreReadiness as { status?: string })?.status,

    },

    null,

    2,

  ),

)



await app.close()

