import { buildApp } from '../src/app.js'



const app = await buildApp()

await app.ready()



const getRes = await app.inject({ method: 'GET', url: '/v1/reports/action-orchestrator' })

const getBody = getRes.json() as Record<string, unknown>

const getRaw = JSON.stringify(getBody)



const runRes = await app.inject({ method: 'POST', url: '/v1/reports/action-orchestrator/run' })

const runBody = runRes.json() as Record<string, unknown>

const runRaw = JSON.stringify(runBody)



const getChecks = {

  status200: getRes.statusCode === 200,

  orchestratorScore: typeof getBody.orchestratorScore === 'number',

  activeStrategy: Boolean(getBody.activeStrategy),

  executionPlan: Array.isArray(getBody.executionPlan) && (getBody.executionPlan as unknown[]).length === 20,

  priorityOverrides:

    Array.isArray(getBody.priorityOverrides) && (getBody.priorityOverrides as unknown[]).length > 0,

  noDepoKati: !getRaw.includes('Depo Katı'),

  noWarehouse: !getRaw.includes('WAREHOUSE'),

  depoKatiExcluded: (getBody.meta as { depoKatiExcluded?: boolean })?.depoKatiExcluded === true,

}



const runChecks = {

  status200: runRes.statusCode === 200,

  runStatus: runBody.runStatus === 'APPLIED',

  lastRunAt: Boolean(runBody.lastRunAt),

  noDepoKati: !runRaw.includes('Depo Katı'),

  noWarehouse: !runRaw.includes('WAREHOUSE'),

}



const checks = { ...getChecks, ...runChecks }



console.log(

  JSON.stringify(

    {

      getStatus: getRes.statusCode,

      runStatus: runRes.statusCode,

      checks,

      allPass: Object.values(checks).every(Boolean),

      orchestratorScore: getBody.orchestratorScore,

      activeStrategy: getBody.activeStrategy,

      applied: runBody.runStatus,

    },

    null,

    2,

  ),

)



await app.close()

