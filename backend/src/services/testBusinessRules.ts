/**
 * Rule Tester — kural değişikliğinin modül çıktılarına etkisini simüle eder.
 */

import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  BUSINESS_RULE_CODES,
  type BusinessRuleCode,
  type RuleSimulationDto,
  type RuleTestRequestDto,
} from '../contracts/businessRuleDto.js'
import {
  getBusinessRuleByCode,
  setSimulationOverlay,
} from './businessRulesEngine.js'
import { buildActions } from './getActionCenter.js'
import { buildCases } from './getOperationCases.js'
import { buildJobs } from './getAutomationJobs.js'
import { buildAdvisories } from './getOperationsAdvisor.js'
import { aggregateProfitability, loadProfitabilityOrders } from './getProfitabilityAnalytics.js'
import { getDataQualityReport } from './getDataQualityReport.js'
import { listSalesOrderListItems } from './listOrdersProjection.js'
import { buildForecast } from './getForecastEngine.js'
import { getActionStatusOverrides } from './updateActionStatus.js'

function isRuleCode(v: string): v is BusinessRuleCode {
  return (BUSINESS_RULE_CODES as string[]).includes(v)
}

export function assertValidRuleTestBody(body: unknown): RuleTestRequestDto {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const raw = body as Record<string, unknown>
  const code = typeof raw.code === 'string' ? raw.code.trim() : ''
  if (!isRuleCode(code)) {
    throw new AppHttpError(400, 'Geçersiz kural kodu', 'Bad Request', { code: 'Invalid' })
  }
  const value =
    raw.value !== undefined && raw.value !== null
      ? String(raw.value)
      : ''
  if (!value.trim()) {
    throw new AppHttpError(400, 'Simülasyon değeri gerekli', 'Bad Request', { value: 'Required' })
  }
  return { code, value: value.trim() }
}

function addDays(iso: string, delta: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`)
  return new Date(t + delta * 86_400_000).toISOString().slice(0, 10)
}
function monthBounds(ym: string): { from: string; to: string } {
  const year = Number.parseInt(ym.slice(0, 4), 10)
  const month = Number.parseInt(ym.slice(5, 7), 10)
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { from: `${ym}-01`, to: `${ym}-${String(total).padStart(2, '0')}` }
}
function prevMonthBounds(ym: string): { from: string; to: string } {
  const year = Number.parseInt(ym.slice(0, 4), 10)
  const month = Number.parseInt(ym.slice(5, 7), 10)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return monthBounds(`${prevYear}-${String(prevMonth).padStart(2, '0')}`)
}

type PipelineCounts = {
  advisories: number
  actions: number
  cases: number
  automationJobs: number
  collectionActions: number
  riskyCollectionCases: number
  raw: string
}

async function runPipeline(prisma: PrismaClient): Promise<PipelineCounts> {
  const today = process.env.DEMO_TODAY ?? '2026-05-14'
  const ym = today.slice(0, 7)
  const { from, to } = monthBounds(ym)
  const prev = prevMonthBounds(ym)

  const [profitOrders, dqCurrent, dqPrevious, shipments, listItems] = await Promise.all([
    loadProfitabilityOrders(prisma),
    getDataQualityReport(prisma, { from, to }),
    getDataQualityReport(prisma, { from: addDays(from, -30), to: addDays(from, -1) }),
    prisma.shipment.findMany({
      where: { plannedShipDate: { gte: new Date(`${addDays(today, -89)}T00:00:00.000Z`) } },
      select: { plannedShipDate: true },
    }),
    listSalesOrderListItems(prisma),
  ])

  const d30 = addDays(today, -29)
  const d60 = addDays(today, -59)
  const d90 = addDays(today, -89)
  let last30 = 0
  let last60 = 0
  let last90 = 0
  for (const s of shipments) {
    if (!s.plannedShipDate) continue
    const iso = s.plannedShipDate.toISOString().slice(0, 10)
    if (iso > today) continue
    if (iso >= d90) last90 += 1
    if (iso >= d60) last60 += 1
    if (iso >= d30) last30 += 1
  }

  const monthSrc = aggregateProfitability(profitOrders, { from, to, groupBy: 'source' })
  const prevMonthSrc = aggregateProfitability(profitOrders, { from: prev.from, to: prev.to, groupBy: 'source' })
  const supplierRes = aggregateProfitability(profitOrders, { from, to, groupBy: 'supplier' })
  const forecast = buildForecast({
    today,
    profitOrders,
    shipmentWindows: { last30, last60, last90 },
    dataQuality: {
      currentScore: dqCurrent.totals.averageQualityScore,
      previousScore: dqPrevious.totals.averageQualityScore,
    },
    query: {},
  })

  let delayedShipments = 0
  let overdueCount = 0
  for (const it of listItems) {
    const delivered = it.displayStatus === 'Teslim Edildi'
    if (!delivered && it.plannedShipmentDate && it.plannedShipmentDate < today) delayedShipments += 1
    if (it.hasOverdueBalance) overdueCount += 1
  }

  const advisories = buildAdvisories({
    today,
    monthSrc,
    prevMonthSrc,
    supplierRes,
    dq: dqCurrent,
    forecast,
    delayedShipments,
    overdueCount,
    query: {},
  })

  const actionResult = buildActions({
    today,
    listItems,
    dq: dqCurrent,
    forecast,
    supplierRes,
    overrides: getActionStatusOverrides(),
    query: {},
  })

  const caseResult = buildCases({
    actionResult,
    overrides: new Map(),
    orders: listItems,
    query: {},
  })

  const jobResult = buildJobs({
    actionResult,
    monthSrc,
    prevMonthSrc,
    overrides: new Map(),
    orders: listItems,
    query: {},
  })

  const collectionActions = actionResult.actions.filter((a) => a.id.startsWith('collection-call:')).length
  const riskyCollectionCases = caseResult.cases.filter((c) => {
    if (!c.caseNumber.startsWith('CASE-')) return false
    return c.priority === 'P1' && (c.riskLevel === 'Yüksek' || c.riskLevel === 'Kritik')
  }).length

  const raw = JSON.stringify({
    advisories: advisories.advisories,
    actions: actionResult.actions,
    cases: caseResult.cases,
    jobs: jobResult.jobs,
  })

  return {
    advisories: advisories.advisories.length,
    actions: actionResult.actions.length,
    cases: caseResult.cases.length,
    automationJobs: jobResult.jobs.length,
    collectionActions,
    riskyCollectionCases,
    raw,
  }
}

export async function testBusinessRule(
  prisma: PrismaClient,
  req: RuleTestRequestDto,
): Promise<RuleSimulationDto> {
  const current = getBusinessRuleByCode(req.code)
  if (!current) {
    throw new AppHttpError(404, 'Kural bulunamadı', 'Not Found', { code: req.code })
  }

  const before = await runPipeline(prisma)

  setSimulationOverlay(new Map([[req.code, req.value]]))
  let after: PipelineCounts
  try {
    after = await runPipeline(prisma)
  } finally {
    setSimulationOverlay(null)
  }

  const depoKatiMentioned =
    before.raw.includes('Depo Katı') ||
    before.raw.includes('WAREHOUSE') ||
    after.raw.includes('Depo Katı') ||
    after.raw.includes('WAREHOUSE')

  const metricLabel =
    req.code === 'COLLECTION_HIGH_RISK_RATIO'
      ? 'P1 riskli tahsilat vakaları'
      : req.code.startsWith('AUTO_')
        ? 'Otomasyon işleri'
        : req.code.startsWith('DATA_QUALITY') || req.code === 'ZERO_COST_CRITICAL'
          ? 'Danışman uyarıları'
          : 'Açık görevler'

  const metricValue =
    req.code === 'COLLECTION_HIGH_RISK_RATIO'
      ? { before: before.riskyCollectionCases, after: after.riskyCollectionCases }
      : req.code.startsWith('AUTO_')
        ? { before: before.automationJobs, after: after.automationJobs }
        : req.code.startsWith('DATA_QUALITY') || req.code === 'ZERO_COST_CRITICAL'
          ? { before: before.advisories, after: after.advisories }
          : { before: before.actions, after: after.actions }

  return {
    ruleCode: req.code,
    proposedValue: req.value,
    currentValue: current.value,
    metrics: [
      {
        label: metricLabel,
        before: metricValue.before,
        after: metricValue.after,
        delta: metricValue.after - metricValue.before,
      },
    ],
    advisoriesBefore: before.advisories,
    advisoriesAfter: after.advisories,
    actionsBefore: before.actions,
    actionsAfter: after.actions,
    automationJobsBefore: before.automationJobs,
    automationJobsAfter: after.automationJobs,
    casesBefore: before.cases,
    casesAfter: after.cases,
    depoKatiMentioned,
    generatedAt: new Date().toISOString(),
  }
}
