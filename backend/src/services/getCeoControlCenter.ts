/**
 * CEO Kontrol Merkezi — Faz 5–11 motorlarını tek geçişte toplar ve birleştirir.
 * Depo Katı satış kaynağı olarak hiçbir panelde görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import {
  aggregateProfitability,
  loadProfitabilityOrders,
  type ProfitOrderInput,
} from './getProfitabilityAnalytics.js'
import { getDataQualityReport } from './getDataQualityReport.js'
import { listSalesOrderListItems } from './listOrdersProjection.js'
import { assembleManagerCockpit } from './getManagerCockpit.js'
import { buildForecast } from './getForecastEngine.js'
import { buildAdvisories } from './getOperationsAdvisor.js'
import { buildActions } from './getActionCenter.js'
import { buildCases } from './getOperationCases.js'
import { buildJobs } from './getAutomationJobs.js'
import { getActionStatusOverrides } from './updateActionStatus.js'
import { getCaseOverrides } from './updateOperationCase.js'
import { getJobOverrides } from './getAutomationJobs.js'
import { getBusinessRules } from './getBusinessRules.js'
import type { SalesOrderListItemDto } from '../projection/salesOrderListItemProjection.js'
import type { DataQualityResponseDto } from '../contracts/dataQualityDto.js'
import type { ForecastEngineResponseDto } from '../contracts/forecastEngineDto.js'
import type { ProfitabilityAnalyticsResponseDto } from '../contracts/profitabilityAnalyticsDto.js'
import type { ManagerCockpitResponseDto } from '../contracts/managerCockpitDto.js'
import type { OperationsAdvisorResponseDto } from '../contracts/operationsAdvisorDto.js'
import type { ActionCenterResponseDto } from '../contracts/actionCenterDto.js'
import type { OperationCasesResponseDto } from '../contracts/operationCaseDto.js'
import type { AutomationJobsResponseDto } from '../contracts/automationJobDto.js'
import type { BusinessRulesResponseDto } from '../contracts/businessRuleDto.js'
import type {
  CeoAlertDto,
  CeoAlertSeverity,
  CeoAutomationPanelDto,
  CeoControlCenterResponseDto,
  CeoFinancePanelDto,
  CeoOperationsHealthDto,
  CeoPeopleRiskPanelDto,
  DailyBriefingDto,
  ManagerScoreBand,
  ManagerScoreDto,
} from '../contracts/ceoControlCenterDto.js'

const TOP_ALERTS_LIMIT = 10
const STAFF_FORECAST_LIMIT = 5
const TOP_JOBS_LIMIT = 5

const BAND_LABELS: Record<ManagerScoreBand, string> = {
  EXCELLENT: 'Mükemmel',
  GOOD: 'İyi',
  FAIR: 'Orta',
  POOR: 'Zayıf',
  CRITICAL: 'Kritik',
}

const SEVERITY_RANK: Record<CeoAlertSeverity, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 }

const ACTIVE_CASE_STATUSES = new Set(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING'])
const ACTIVE_ACTION_STATUSES = new Set(['OPEN', 'ASSIGNED', 'IN_PROGRESS'])

function num(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
function addDays(iso: string, delta: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`)
  return new Date(t + delta * 86_400_000).toISOString().slice(0, 10)
}
function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}
function monthBounds(ym: string): { from: string; to: string } {
  const year = Number.parseInt(ym.slice(0, 4), 10)
  const month = Number.parseInt(ym.slice(5, 7), 10)
  const total = daysInMonth(year, month)
  return { from: `${ym}-01`, to: `${ym}-${String(total).padStart(2, '0')}` }
}
function prevMonthBounds(ym: string): { from: string; to: string } {
  const year = Number.parseInt(ym.slice(0, 4), 10)
  const month = Number.parseInt(ym.slice(5, 7), 10)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return monthBounds(`${prevYear}-${String(prevMonth).padStart(2, '0')}`)
}

export type CeoGatheredData = {
  today: string
  monthFrom: string
  monthTo: string
  profitOrders: ProfitOrderInput[]
  srcRes: ProfitabilityAnalyticsResponseDto
  personRes: ProfitabilityAnalyticsResponseDto
  prevMonthSrc: ProfitabilityAnalyticsResponseDto
  supplierRes: ProfitabilityAnalyticsResponseDto
  dq: DataQualityResponseDto
  listItems: SalesOrderListItemDto[]
  paymentsTodayTotal: number
  crewByOrder: Map<string, string | null>
  delayedShipments: number
  overdueCount: number
  pendingShipmentCount: number
  forecast: ForecastEngineResponseDto
  cockpit: ManagerCockpitResponseDto
  advisories: OperationsAdvisorResponseDto
  actionResult: ActionCenterResponseDto
  caseResult: OperationCasesResponseDto
  jobResult: AutomationJobsResponseDto
  businessRules: BusinessRulesResponseDto
}

/** Tek geçiş veri yükleme — Faz 5–11 motorları için ortak ham veri. */
export async function gatherCeoData(prisma: PrismaClient): Promise<CeoGatheredData> {
  const today = process.env.DEMO_TODAY ?? '2026-05-14'
  const ym = today.slice(0, 7)
  const { from, to } = monthBounds(ym)
  const prev = prevMonthBounds(ym)

  const [profitOrders, dqCurrent, dqPrevious, shipments, listItems, payments] = await Promise.all([
    loadProfitabilityOrders(prisma),
    getDataQualityReport(prisma, { from, to }),
    getDataQualityReport(prisma, { from: addDays(from, -30), to: addDays(from, -1) }),
    prisma.shipment.findMany({
      where: { plannedShipDate: { gte: new Date(`${addDays(today, -89)}T00:00:00.000Z`) } },
      select: { plannedShipDate: true, salesOrderId: true, crewName: true },
    }),
    listSalesOrderListItems(prisma),
    prisma.paymentTransaction.findMany({
      where: { occurredAt: { gte: new Date(`${today}T00:00:00.000Z`), lt: new Date(`${today}T23:59:59.999Z`) } },
      select: { amount: true },
    }),
  ])

  const d30 = addDays(today, -29)
  const d60 = addDays(today, -59)
  const d90 = addDays(today, -89)
  let last30 = 0
  let last60 = 0
  let last90 = 0
  const crewByOrder = new Map<string, string | null>()
  for (const s of shipments) {
    if (s.crewName && !crewByOrder.get(s.salesOrderId)) crewByOrder.set(s.salesOrderId, s.crewName)
    if (!s.plannedShipDate) continue
    const iso = s.plannedShipDate.toISOString().slice(0, 10)
    if (iso > today) continue
    if (iso >= d90) last90 += 1
    if (iso >= d60) last60 += 1
    if (iso >= d30) last30 += 1
  }

  let delayedShipments = 0
  let overdueCount = 0
  let pendingShipmentCount = 0
  for (const it of listItems) {
    const delivered = it.displayStatus === 'Teslim Edildi'
    if (!delivered) pendingShipmentCount += 1
    if (!delivered && it.plannedShipmentDate && it.plannedShipmentDate < today) delayedShipments += 1
    if (it.hasOverdueBalance) overdueCount += 1
  }

  const paymentsTodayTotal = payments.reduce((s, p) => {
    const n = Number.parseFloat(p.amount.toString())
    return s + (Number.isFinite(n) ? n : 0)
  }, 0)

  const srcRes = aggregateProfitability(profitOrders, { from, to, groupBy: 'source' })
  const catRes = aggregateProfitability(profitOrders, { from, to, groupBy: 'category' })
  const personRes = aggregateProfitability(profitOrders, { from, to, groupBy: 'salesPerson' })
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

  const cockpit = assembleManagerCockpit({
    today,
    monthFrom: from,
    monthTo: to,
    profitOrders,
    srcRes,
    catRes,
    dq: dqCurrent,
    listItems,
    paymentsTodayTotal,
    crewByOrder,
    query: {},
  })

  const advisories = buildAdvisories({
    today,
    monthSrc: srcRes,
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
    overrides: getCaseOverrides(),
    orders: listItems,
    query: {},
  })

  const jobResult = buildJobs({
    actionResult,
    monthSrc: srcRes,
    prevMonthSrc,
    overrides: getJobOverrides(),
    orders: listItems,
    query: {},
  })

  const businessRules = getBusinessRules({})

  return {
    today,
    monthFrom: from,
    monthTo: to,
    profitOrders,
    srcRes,
    personRes,
    prevMonthSrc,
    supplierRes,
    dq: dqCurrent,
    listItems,
    paymentsTodayTotal,
    crewByOrder,
    delayedShipments,
    overdueCount,
    pendingShipmentCount,
    forecast,
    cockpit,
    advisories,
    actionResult,
    caseResult,
    jobResult,
    businessRules,
  }
}

function scoreBand(score: number): ManagerScoreBand {
  if (score >= 85) return 'EXCELLENT'
  if (score >= 70) return 'GOOD'
  if (score >= 55) return 'FAIR'
  if (score >= 40) return 'POOR'
  return 'CRITICAL'
}

/** 7 bileşenli ağırlıklı yönetici skoru (0–100). */
export function computeManagerScore(args: {
  srcRes: ProfitabilityAnalyticsResponseDto
  dq: DataQualityResponseDto
  forecast: ForecastEngineResponseDto
  actionResult: ActionCenterResponseDto
  delayedShipments: number
  p1Cases: number
}): ManagerScoreDto {
  const { srcRes, dq, forecast, actionResult, delayedShipments, p1Cases } = args
  const totals = srcRes.totals

  const profitMarginRaw = (clamp(totals.profitMarginPct, 0, 30) / 30) * 100
  const collected = num(totals.collected)
  const open = num(totals.openBalance)
  const collectionRatioRaw = collected + open > 0 ? (collected / (collected + open)) * 100 : 100
  const risky = num(totals.riskyReceivable)
  const riskyShare = open > 0 ? risky / open : 0
  const riskyReceivableRaw = 100 - Math.min(100, riskyShare * 4)
  const operationsDisciplineRaw = 100 - Math.min(100, delayedShipments * 8 + p1Cases * 10)
  const taskCompletionRaw = clamp(actionResult.summary.completionRate, 0, 100)
  const dataQualityRaw = clamp(dq.totals.averageQualityScore, 0, 100)
  const monthEndTargetRaw = Math.min(100, clamp(forecast.summary.targetAchievementPct, 0, 200))

  const components = {
    profitMargin: { weight: 20, rawScore: round1(profitMarginRaw), weighted: round1(profitMarginRaw * 0.2) },
    collectionRatio: { weight: 20, rawScore: round1(collectionRatioRaw), weighted: round1(collectionRatioRaw * 0.2) },
    riskyReceivableShare: { weight: 15, rawScore: round1(riskyReceivableRaw), weighted: round1(riskyReceivableRaw * 0.15) },
    operationsDiscipline: { weight: 15, rawScore: round1(operationsDisciplineRaw), weighted: round1(operationsDisciplineRaw * 0.15) },
    taskCompletion: { weight: 10, rawScore: round1(taskCompletionRaw), weighted: round1(taskCompletionRaw * 0.1) },
    dataQuality: { weight: 10, rawScore: round1(dataQualityRaw), weighted: round1(dataQualityRaw * 0.1) },
    monthEndTarget: { weight: 10, rawScore: round1(monthEndTargetRaw), weighted: round1(monthEndTargetRaw * 0.1) },
  }

  const score = round1(
    components.profitMargin.weighted +
      components.collectionRatio.weighted +
      components.riskyReceivableShare.weighted +
      components.operationsDiscipline.weighted +
      components.taskCompletion.weighted +
      components.dataQuality.weighted +
      components.monthEndTarget.weighted,
  )

  const band = scoreBand(score)
  return { score, band, bandLabel: BAND_LABELS[band], components }
}

/** Deterministik günlük brifing şablonu. */
export function buildDailyBriefing(args: {
  today: string
  managerScore: ManagerScoreDto
  cockpit: ManagerCockpitResponseDto
  finance: CeoFinancePanelDto
  operations: CeoOperationsHealthDto
  topAlerts: CeoAlertDto[]
}): DailyBriefingDto {
  const { today, managerScore, cockpit, finance, operations, topAlerts } = args
  const headline = `${today} — Yönetici skoru ${managerScore.score} (${managerScore.bandLabel})`

  const paragraphs = [
    `Bu ay ciro ${formatMoneyAmount(num(finance.monthRevenue))} ₺, brüt kâr ${formatMoneyAmount(num(finance.monthGrossProfit))} ₺ (marj %${round1(finance.profitMarginPct)}).`,
    `Tahsil edilen ${formatMoneyAmount(num(finance.collected))} ₺, açık bakiye ${formatMoneyAmount(num(finance.openBalance))} ₺; riskli alacak ${formatMoneyAmount(num(finance.riskyReceivable))} ₺.`,
    `Operasyon: ${operations.ordersToday} sipariş bugün, ${operations.delayedShipments} geciken sevk, ${operations.pendingShipmentCount} bekleyen sevk, ${operations.p1Actions} P1 görev.`,
  ]
  if (topAlerts[0]) {
    paragraphs.push(`Öncelikli konu: ${topAlerts[0].title} — ${topAlerts[0].message}`)
  }

  const highlights = [
    { label: 'Bugünkü satış', value: `${formatMoneyAmount(num(cockpit.summary.todaySales))} ₺`, tone: 'info' as const },
    {
      label: 'Ay sonu hedef',
      value: `%${round1(finance.targetAchievementPct)}`,
      tone: finance.targetAchievementPct < 90 ? ('warning' as const) : ('success' as const),
    },
    {
      label: 'Veri kalitesi',
      value: String(cockpit.summary.dataQualityScore),
      tone: cockpit.summary.dataQualityScore < 85 ? ('warning' as const) : ('success' as const),
    },
    {
      label: 'Açık görev',
      value: String(operations.openActions),
      tone: operations.p1Actions > 0 ? ('critical' as const) : ('neutral' as const),
    },
  ]

  return { headline, paragraphs, highlights }
}

function mapCockpitSeverity(s: string): CeoAlertSeverity {
  if (s === 'critical') return 'CRITICAL'
  if (s === 'warning') return 'WARNING'
  return 'INFO'
}

function mapForecastSeverity(s: string): CeoAlertSeverity {
  if (s === 'critical') return 'CRITICAL'
  if (s === 'warning') return 'WARNING'
  return 'INFO'
}

/** Danışman, kokpit, tahmin, P1 görev ve kritik kuralları birleştirir. */
export function mergeTopAlerts(args: {
  advisories: OperationsAdvisorResponseDto
  cockpit: ManagerCockpitResponseDto
  forecast: ForecastEngineResponseDto
  actionResult: ActionCenterResponseDto
  businessRules: BusinessRulesResponseDto
}): CeoAlertDto[] {
  const out: CeoAlertDto[] = []

  for (const a of args.advisories.advisories) {
    out.push({
      id: `advisory:${a.id}`,
      source: 'advisory',
      severity: a.severity,
      title: a.title,
      message: a.reason,
      category: a.category,
    })
  }

  args.cockpit.managerAlerts.forEach((a, i) => {
    out.push({
      id: `cockpit:${i}`,
      source: 'cockpit',
      severity: mapCockpitSeverity(a.severity),
      title: 'Kokpit uyarısı',
      message: a.message,
      category: 'OPERATIONS',
    })
  })

  args.forecast.alerts.forEach((a, i) => {
    out.push({
      id: `forecast:${i}`,
      source: 'forecast',
      severity: mapForecastSeverity(a.severity),
      title: 'Tahmin uyarısı',
      message: a.message,
      category: 'SALES',
    })
  })

  for (const a of args.actionResult.actions) {
    if (a.priority !== 'P1') continue
    if (!ACTIVE_ACTION_STATUSES.has(a.status)) continue
    out.push({
      id: `action:${a.id}`,
      source: 'action',
      severity: 'CRITICAL',
      title: a.title,
      message: a.reason,
      category: a.category,
    })
  }

  for (const r of args.businessRules.rules) {
    if (!r.isEnabled || r.severity !== 'CRITICAL') continue
    out.push({
      id: `rule:${r.code}`,
      source: 'rule',
      severity: 'CRITICAL',
      title: r.name,
      message: `${r.description} (eşik: ${r.value})`,
      category: r.category,
    })
  }

  out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
  return out.slice(0, TOP_ALERTS_LIMIT)
}

function buildFinancePanel(srcRes: ProfitabilityAnalyticsResponseDto, forecast: ForecastEngineResponseDto): CeoFinancePanelDto {
  const t = srcRes.totals
  return {
    monthRevenue: t.revenue,
    monthGrossProfit: t.grossProfit,
    profitMarginPct: t.profitMarginPct,
    collected: t.collected,
    openBalance: t.openBalance,
    riskyReceivable: t.riskyReceivable,
    realizedProfit: t.realizedProfit,
    pendingProfit: t.pendingProfit,
    projectedRevenue: forecast.summary.monthRevenueProjected,
    projectedGrossProfit: forecast.summary.monthGrossProfitProjected,
    targetAchievementPct: forecast.summary.targetAchievementPct,
  }
}

function buildOperationsHealth(
  cockpit: ManagerCockpitResponseDto,
  pendingShipmentCount: number,
  caseResult: OperationCasesResponseDto,
  actionResult: ActionCenterResponseDto,
): CeoOperationsHealthDto {
  const ops = cockpit.todayOperations
  const openCases = caseResult.cases.filter((c) => ACTIVE_CASE_STATUSES.has(c.status))
  const p1Cases = openCases.filter((c) => c.priority === 'P1').length
  const openActions = actionResult.actions.filter(
    (a) => a.status !== 'COMPLETED' && a.status !== 'DISMISSED',
  ).length
  const p1Actions = actionResult.actions.filter(
    (a) => a.priority === 'P1' && ACTIVE_ACTION_STATUSES.has(a.status),
  ).length

  return {
    ordersToday: ops.ordersToday,
    collectionToday: ops.collectionToday,
    readyToShipToday: ops.readyToShipToday,
    delayedShipments: ops.delayedShipments,
    pendingShipmentCount,
    criticalRiskOrders: ops.criticalRiskOrders,
    openCases: openCases.length,
    p1Cases,
    openActions,
    p1Actions,
  }
}

function toHighlight(h: { key: string; label: string; value: string; metric: string } | null) {
  if (!h) return null
  return { key: h.key, label: h.label, value: h.value, metric: h.metric }
}

function buildPeopleRisk(
  cockpit: ManagerCockpitResponseDto,
  personRes: ProfitabilityAnalyticsResponseDto,
  forecast: ForecastEngineResponseDto,
): CeoPeopleRiskPanelDto {
  const persons = [...personRes.rows].filter((r) => num(r.revenue) > 0)
  const topPerson = persons.sort((a, b) => num(b.grossProfit) - num(a.grossProfit))[0] ?? null
  const bottomPerson = persons.sort((a, b) => num(a.grossProfit) - num(b.grossProfit))[0] ?? null
  const ph = cockpit.profitabilityHighlights

  return {
    topSalesPerson: topPerson
      ? { key: topPerson.key, label: topPerson.label, value: topPerson.grossProfit, metric: 'grossProfit' }
      : null,
    bottomSalesPerson: bottomPerson
      ? { key: bottomPerson.key, label: bottomPerson.label, value: bottomPerson.grossProfit, metric: 'grossProfit' }
      : null,
    riskiestSource: toHighlight(ph.riskiestSource),
    highestOpenBalanceSource: toHighlight(ph.highestOpenBalanceSource),
    staffForecast: forecast.staffForecast.slice(0, STAFF_FORECAST_LIMIT).map((s) => ({
      key: s.key,
      label: s.label,
      projectedSales: s.projectedSales,
      achievementPct: s.achievementPct,
      status: s.status,
    })),
    criticalOrdersCount: cockpit.criticalOrders.length,
  }
}

function buildAutomationPanel(jobResult: AutomationJobsResponseDto): CeoAutomationPanelDto {
  const s = jobResult.summary
  const readyToRun = s.autoRunReadyCount
  const topJobs = [...jobResult.jobs]
    .sort((a, b) => {
      const pr = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }
      return (pr[a.priority] ?? 9) - (pr[b.priority] ?? 9)
    })
    .slice(0, TOP_JOBS_LIMIT)
    .map((j) => ({
      id: j.id,
      title: j.title ?? j.jobType,
      jobType: j.jobType,
      priority: j.priority,
      status: j.status,
      requiresApproval: j.requiresApproval,
    }))

  return {
    totalJobs: s.totalJobs,
    waitingApproval: s.waitingApprovalCount,
    readyToRun,
    completed: s.completedCount,
    cancelled: s.cancelledCount,
    topJobs,
  }
}

/** Ana montaj — toplanan veriyi CEO Kontrol Merkezi DTO'suna dönüştürür. */
export function assembleCeoControlCenter(data: CeoGatheredData): CeoControlCenterResponseDto {
  const finance = buildFinancePanel(data.srcRes, data.forecast)
  const operations = buildOperationsHealth(data.cockpit, data.pendingShipmentCount, data.caseResult, data.actionResult)
  const peopleRisk = buildPeopleRisk(data.cockpit, data.personRes, data.forecast)
  const automation = buildAutomationPanel(data.jobResult)

  const managerScore = computeManagerScore({
    srcRes: data.srcRes,
    dq: data.dq,
    forecast: data.forecast,
    actionResult: data.actionResult,
    delayedShipments: data.delayedShipments,
    p1Cases: operations.p1Cases,
  })

  const topAlerts = mergeTopAlerts({
    advisories: data.advisories,
    cockpit: data.cockpit,
    forecast: data.forecast,
    actionResult: data.actionResult,
    businessRules: data.businessRules,
  })

  const dailyBriefing = buildDailyBriefing({
    today: data.today,
    managerScore,
    cockpit: data.cockpit,
    finance,
    operations,
    topAlerts,
  })

  return {
    managerScore,
    dailyBriefing,
    finance,
    operationsHealth: operations,
    peopleRisk,
    automation,
    topAlerts,
    currency: 'TRY',
    today: data.today,
    generatedAt: new Date().toISOString(),
  }
}

export async function getCeoControlCenter(prisma: PrismaClient): Promise<CeoControlCenterResponseDto> {
  try {
    const data = await gatherCeoData(prisma)
    return assembleCeoControlCenter(data)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
