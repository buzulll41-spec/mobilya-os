import { buildApp } from '../src/app.js'



const app = await buildApp()

await app.ready()



const res = await app.inject({ method: 'GET', url: '/v1/reports/board-directors' })

const body = res.json() as Record<string, unknown>

const raw = JSON.stringify(body)



const checks = {

  status200: res.statusCode === 200,

  summary: Boolean(body.summary),

  boardScore: typeof body.boardScore === 'number',

  directors: Array.isArray(body.directors) && (body.directors as unknown[]).length === 6,

  boardDecision: Boolean(body.boardDecision),

  boardReason: Boolean(body.boardReason),

  topRisks: Array.isArray(body.topRisks) && (body.topRisks as unknown[]).length > 0,

  topOpportunities: Array.isArray(body.topOpportunities) && (body.topOpportunities as unknown[]).length > 0,

  actions: Array.isArray(body.whatBoardWouldDoToday) && (body.whatBoardWouldDoToday as unknown[]).length === 5,

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

      boardScore: body.boardScore,

      boardDecision: body.boardDecision,

      directorCount: (body.directors as unknown[])?.length,

      actionCount: (body.whatBoardWouldDoToday as unknown[])?.length,

    },

    null,

    2,

  ),

)



await app.close()


