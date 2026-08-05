import { buildApp } from '../src/app.js'

const AGENT_CODES = [
  'COLLECTION_AGENT',
  'SHIPMENT_AGENT',
  'DATA_QUALITY_AGENT',
  'SALES_AGENT',
  'SUPPLIER_AGENT',
  'EXECUTIVE_AGENT',
]

const app = await buildApp()
await app.ready()

const listRes = await app.inject({ method: 'GET', url: '/v1/reports/operations-agents' })
const listBody = listRes.json() as Record<string, unknown>
const listRaw = JSON.stringify(listBody)

const execRes = await app.inject({
  method: 'GET',
  url: '/v1/reports/operations-agents/EXECUTIVE_AGENT',
})
const execBody = execRes.json() as Record<string, unknown>

const runRes = await app.inject({ method: 'POST', url: '/v1/reports/operations-agents/run' })
const runBody = runRes.json() as Record<string, unknown>
const runRaw = JSON.stringify(runBody)

const agents = (listBody.agents as { agentCode: string }[]) ?? []
const agentCodes = agents.map((a) => a.agentCode)
const briefing = listBody.briefing as {
  headline?: string
  paragraphs?: string[]
  whatToDoToday?: string[]
  criticalIssues?: unknown[]
} | undefined
const priorities = (listBody.priorities as unknown[]) ?? []
const summary = listBody.summary as {
  generatedCases?: number
  generatedActions?: number
  generatedJobs?: number
} | undefined

const checks = {
  listHttp200: listRes.statusCode === 200,
  execHttp200: execRes.statusCode === 200,
  runHttp200: runRes.statusCode === 200,
  sixAgentsPlusExecutive:
    agents.length === 6 &&
    AGENT_CODES.every((code) => agentCodes.includes(code)),
  briefingPresent: Boolean(
    briefing?.headline && briefing?.paragraphs?.length && briefing?.whatToDoToday?.length,
  ),
  prioritiesPresent: priorities.length > 0,
  generatedActionsPopulated: (summary?.generatedActions ?? 0) >= 0 && runBody.generatedActions !== undefined,
  generatedCasesPopulated: (summary?.generatedCases ?? 0) >= 0 && runBody.generatedCases !== undefined,
  generatedJobsPopulated: (summary?.generatedJobs ?? 0) >= 0 && runBody.generatedJobs !== undefined,
  runHasGeneratedCounts:
    typeof runBody.generatedActions === 'number' &&
    typeof runBody.generatedCases === 'number' &&
    typeof runBody.generatedJobs === 'number',
  noDepoKati:
    !listRaw.includes('Depo Katı') &&
    !runRaw.includes('Depo Katı') &&
    !JSON.stringify(execBody).includes('Depo Katı'),
  noWarehouse:
    !listRaw.includes('WAREHOUSE') &&
    !runRaw.includes('WAREHOUSE') &&
    !JSON.stringify(execBody).includes('WAREHOUSE'),
}

console.log(
  JSON.stringify(
    {
      list: { statusCode: listRes.statusCode, agentCount: agents.length, agentCodes },
      executive: {
        statusCode: execRes.statusCode,
        agentCode: (execBody as { agentCode?: string }).agentCode,
        outputCount: ((execBody as { outputs?: unknown[] }).outputs ?? []).length,
      },
      run: {
        statusCode: runRes.statusCode,
        generatedActions: runBody.generatedActions,
        generatedCases: runBody.generatedCases,
        generatedJobs: runBody.generatedJobs,
      },
      briefing: {
        headline: briefing?.headline,
        paragraphCount: briefing?.paragraphs?.length ?? 0,
        whatToDoTodayCount: briefing?.whatToDoToday?.length ?? 0,
        criticalIssuesCount: briefing?.criticalIssues?.length ?? 0,
      },
      prioritiesCount: priorities.length,
      prioritiesFirst3: priorities.slice(0, 3),
      summary,
      checks,
      allPass: Object.values(checks).every(Boolean),
    },
    null,
    2,
  ),
)

await app.close()
