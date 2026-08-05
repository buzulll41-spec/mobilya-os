import { buildApp } from '../src/app.js'



const app = await buildApp()

await app.ready()



const res = await app.inject({ method: 'GET', url: '/v1/reports/learning-engine' })

const body = res.json() as Record<string, unknown>

const raw = JSON.stringify(body)



const checks = {

  status200: res.statusCode === 200,

  learningScore: typeof body.learningScore === 'number',

  bestStrategy: Boolean(body.bestStrategy),

  worstStrategy: Boolean(body.worstStrategy),

  strategyTable: Array.isArray(body.strategyTable) && (body.strategyTable as unknown[]).length === 6,

  agentLearning: Array.isArray(body.agentLearning) && (body.agentLearning as unknown[]).length === 6,

  decisionTrend: Boolean(body.decisionTrend),

  lessonsLearned: Array.isArray(body.lessonsLearned) && (body.lessonsLearned as unknown[]).length === 10,

  recommendations: Array.isArray(body.recommendations) && (body.recommendations as unknown[]).length === 5,

  summary: typeof body.summary === 'string' && (body.summary as string).length > 10,

  noDepoKati: !raw.includes('Depo Katı'),

  noWarehouse: !raw.includes('WAREHOUSE'),

  depoKatiExcluded: (body.meta as { depoKatiExcluded?: boolean })?.depoKatiExcluded === true,

  virtualOnly: (body.meta as { virtualOnly?: boolean })?.virtualOnly === true,

}



console.log(

  JSON.stringify(

    {

      status: res.statusCode,

      checks,

      allPass: Object.values(checks).every(Boolean),

      learningScore: body.learningScore,

      bestStrategy: body.bestStrategy,

    },

    null,

    2,

  ),

)



await app.close()


