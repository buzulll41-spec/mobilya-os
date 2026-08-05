import { buildApp } from '../src/app.js'



const app = await buildApp()

await app.ready()



const res = await app.inject({ method: 'GET', url: '/v1/reports/performance-feedback' })

const body = res.json() as Record<string, unknown>

const raw = JSON.stringify(body)



const checks = {

  status200: res.statusCode === 200,

  feedbackScore: typeof body.feedbackScore === 'number',

  strategyPerformance:

    Array.isArray(body.strategyPerformance) && (body.strategyPerformance as unknown[]).length === 10,

  successfulStrategies:

    Array.isArray(body.successfulStrategies) && (body.successfulStrategies as unknown[]).length === 10,

  failedStrategies:

    Array.isArray(body.failedStrategies) && (body.failedStrategies as unknown[]).length === 10,

  impactAnalysis: Boolean(body.impactAnalysis),

  lessonsLearned:

    Array.isArray(body.lessonsLearned) && (body.lessonsLearned as unknown[]).length === 10,

  recommendation: typeof body.recommendation === 'string' && (body.recommendation as string).length > 10,

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

      feedbackScore: body.feedbackScore,

      activeStrategy: body.activeStrategy,

      recommendation: body.recommendation,

    },

    null,

    2,

  ),

)



await app.close()

