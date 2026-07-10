import { mockGetManagerCockpit } from './mockManagerCockpitApi.js'
import { mockGetForecastEngine } from './mockForecastEngineApi.js'
import { mockGetOperationsAdvisor } from './mockOperationsAdvisorApi.js'
import { mockGetActionCenter } from './mockActionCenterApi.js'
import { mockGetOperationCases } from './mockOperationCaseApi.js'
import { mockGetAutomationJobs } from './mockAutomationApi.js'
import { mockGetBusinessRules } from './mockBusinessRuleApi.js'
import { mockGetProfitabilityAnalytics } from './mockProfitabilityAnalyticsApi.js'

/**
 * Mock CEO Kontrol Merkezi — Faz 5–11 mock motorlarını birleştirir.
 * Depo Katı satış kaynağı olarak görünmez.
 */

const TODAY = '2026-05-14'
const MAY = { from: '2026-05-01', to: '2026-05-31' }

const num = (s) => {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
const round1 = (n) => Math.round(n * 10) / 10
const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
const money = (n) => (Math.round(n * 100) / 100).toFixed(2)

const BAND_LABELS = {
  EXCELLENT: 'Mükemmel',
  GOOD: 'İyi',
  FAIR: 'Orta',
  POOR: 'Zayıf',
  CRITICAL: 'Kritik',
}

function scoreBand(score) {
  if (score >= 85) return 'EXCELLENT'
  if (score >= 70) return 'GOOD'
  if (score >= 55) return 'FAIR'
  if (score >= 40) return 'POOR'
  return 'CRITICAL'
}

function computeScore(src, dq, forecast, actionResult, delayed, p1Cases) {
  const t = src.totals
  const profitMarginRaw = (clamp(t.profitMarginPct, 0, 30) / 30) * 100
  const collected = num(t.collected)
  const open = num(t.openBalance)
  const collectionRatioRaw = collected + open > 0 ? (collected / (collected + open)) * 100 : 100
  const risky = num(t.riskyReceivable)
  const riskyShare = open > 0 ? risky / open : 0
  const riskyReceivableRaw = 100 - Math.min(100, riskyShare * 4)
  const operationsDisciplineRaw = 100 - Math.min(100, delayed * 8 + p1Cases * 10)
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

  const score = round1(Object.values(components).reduce((s, c) => s + c.weighted, 0))
  const band = scoreBand(score)
  return { score, band, bandLabel: BAND_LABELS[band], components }
}

function mergeAlerts(advisories, cockpit, forecast, actions, rules) {
  const out = []
  const rank = { CRITICAL: 3, WARNING: 2, INFO: 1 }
  const mapSev = (s) => (s === 'critical' ? 'CRITICAL' : s === 'warning' ? 'WARNING' : 'INFO')

  for (const a of advisories.advisories) {
    out.push({ id: `advisory:${a.id}`, source: 'advisory', severity: a.severity, title: a.title, message: a.reason, category: a.category })
  }
  ;(cockpit.managerAlerts ?? []).forEach((a, i) => {
    out.push({ id: `cockpit:${i}`, source: 'cockpit', severity: mapSev(a.severity), title: 'Kokpit uyarısı', message: a.message, category: 'OPERATIONS' })
  })
  ;(forecast.alerts ?? []).forEach((a, i) => {
    out.push({ id: `forecast:${i}`, source: 'forecast', severity: mapSev(a.severity), title: 'Tahmin uyarısı', message: a.message, category: 'SALES' })
  })
  for (const a of actions.actions) {
    if (a.priority !== 'P1' || a.status === 'COMPLETED' || a.status === 'DISMISSED') continue
    out.push({ id: `action:${a.id}`, source: 'action', severity: 'CRITICAL', title: a.title, message: a.reason, category: a.category })
  }
  for (const r of rules.rules) {
    if (!r.isEnabled || r.severity !== 'CRITICAL') continue
    out.push({ id: `rule:${r.code}`, source: 'rule', severity: 'CRITICAL', title: r.name, message: `${r.description} (eşik: ${r.value})`, category: r.category })
  }

  out.sort((a, b) => rank[b.severity] - rank[a.severity])
  return out.slice(0, 10)
}

export async function mockGetCeoControlCenter() {
  const [cockpit, forecast, advisories, actions, cases, jobs, rules, src, person] = await Promise.all([
    mockGetManagerCockpit({}),
    mockGetForecastEngine({}),
    mockGetOperationsAdvisor({}),
    mockGetActionCenter({}),
    mockGetOperationCases({}),
    mockGetAutomationJobs({}),
    mockGetBusinessRules({}),
    mockGetProfitabilityAnalytics({ ...MAY, groupBy: 'source' }),
    mockGetProfitabilityAnalytics({ ...MAY, groupBy: 'salesPerson' }),
  ])

  const delayed = cockpit.todayOperations?.delayedShipments ?? 0
  const pendingShipmentCount = (cockpit.pendingShipments ?? []).length + 2
  const p1Cases = (cases.cases ?? []).filter((c) => c.priority === 'P1' && !['RESOLVED', 'CLOSED'].includes(c.status)).length
  const openActions = (actions.actions ?? []).filter((a) => a.status !== 'COMPLETED' && a.status !== 'DISMISSED').length
  const p1Actions = (actions.actions ?? []).filter((a) => a.priority === 'P1' && !['COMPLETED', 'DISMISSED'].includes(a.status)).length

  const managerScore = computeScore(src, { totals: { averageQualityScore: cockpit.summary.dataQualityScore } }, forecast, actions, delayed, p1Cases)

  const finance = {
    monthRevenue: src.totals.revenue,
    monthGrossProfit: src.totals.grossProfit,
    profitMarginPct: src.totals.profitMarginPct,
    collected: src.totals.collected,
    openBalance: src.totals.openBalance,
    riskyReceivable: src.totals.riskyReceivable,
    realizedProfit: src.totals.realizedProfit,
    pendingProfit: src.totals.pendingProfit,
    projectedRevenue: forecast.summary.monthRevenueProjected,
    projectedGrossProfit: forecast.summary.monthGrossProfitProjected,
    targetAchievementPct: forecast.summary.targetAchievementPct,
  }

  const operationsHealth = {
    ordersToday: cockpit.todayOperations.ordersToday,
    collectionToday: cockpit.todayOperations.collectionToday,
    readyToShipToday: cockpit.todayOperations.readyToShipToday,
    delayedShipments: delayed,
    pendingShipmentCount,
    criticalRiskOrders: cockpit.todayOperations.criticalRiskOrders,
    openCases: (cases.cases ?? []).filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status)).length,
    p1Cases,
    openActions,
    p1Actions,
  }

  const persons = [...person.rows].filter((r) => num(r.revenue) > 0)
  const topPerson = persons.sort((a, b) => num(b.grossProfit) - num(a.grossProfit))[0] ?? null
  const bottomPerson = persons.sort((a, b) => num(a.grossProfit) - num(b.grossProfit))[0] ?? null
  const ph = cockpit.profitabilityHighlights

  const peopleRisk = {
    topSalesPerson: topPerson ? { key: topPerson.key, label: topPerson.label, value: topPerson.grossProfit, metric: 'grossProfit' } : null,
    bottomSalesPerson: bottomPerson ? { key: bottomPerson.key, label: bottomPerson.label, value: bottomPerson.grossProfit, metric: 'grossProfit' } : null,
    riskiestSource: ph.riskiestSource,
    highestOpenBalanceSource: ph.highestOpenBalanceSource,
    staffForecast: (forecast.staffForecast ?? []).slice(0, 5).map((s) => ({
      key: s.key,
      label: s.label,
      projectedSales: s.projectedSales,
      achievementPct: s.achievementPct,
      status: s.status,
    })),
    criticalOrdersCount: (cockpit.criticalOrders ?? []).length,
  }

  const automation = {
    totalJobs: jobs.summary.totalJobs,
    waitingApproval: jobs.summary.waitingApprovalCount,
    readyToRun: jobs.summary.autoRunReadyCount,
    completed: jobs.summary.completedCount,
    cancelled: jobs.summary.cancelledCount,
    topJobs: (jobs.jobs ?? []).slice(0, 5).map((j) => ({
      id: j.id,
      title: j.title ?? j.jobType,
      jobType: j.jobType,
      priority: j.priority,
      status: j.status,
      requiresApproval: j.requiresApproval,
    })),
  }

  const topAlerts = mergeAlerts(advisories, cockpit, forecast, actions, rules)

  const dailyBriefing = {
    headline: `${TODAY} — Yönetici skoru ${managerScore.score} (${managerScore.bandLabel})`,
    paragraphs: [
      `Bu ay ciro ${money(num(finance.monthRevenue))} ₺, brüt kâr ${money(num(finance.monthGrossProfit))} ₺ (marj %${round1(finance.profitMarginPct)}).`,
      `Tahsil edilen ${money(num(finance.collected))} ₺, açık bakiye ${money(num(finance.openBalance))} ₺; riskli alacak ${money(num(finance.riskyReceivable))} ₺.`,
      `Operasyon: ${operationsHealth.ordersToday} sipariş bugün, ${operationsHealth.delayedShipments} geciken sevk, ${operationsHealth.pendingShipmentCount} bekleyen sevk, ${operationsHealth.p1Actions} P1 görev.`,
      ...(topAlerts[0] ? [`Öncelikli konu: ${topAlerts[0].title} — ${topAlerts[0].message}`] : []),
    ],
    highlights: [
      { label: 'Bugünkü satış', value: `${money(num(cockpit.summary.todaySales))} ₺`, tone: 'info' },
      { label: 'Ay sonu hedef', value: `%${round1(finance.targetAchievementPct)}`, tone: finance.targetAchievementPct < 90 ? 'warning' : 'success' },
      { label: 'Veri kalitesi', value: String(cockpit.summary.dataQualityScore), tone: cockpit.summary.dataQualityScore < 85 ? 'warning' : 'success' },
      { label: 'Açık görev', value: String(openActions), tone: p1Actions > 0 ? 'critical' : 'neutral' },
    ],
  }

  return {
    managerScore,
    dailyBriefing,
    finance,
    operationsHealth,
    peopleRisk,
    automation,
    topAlerts,
    currency: 'TRY',
    today: TODAY,
    generatedAt: new Date().toISOString(),
  }
}
