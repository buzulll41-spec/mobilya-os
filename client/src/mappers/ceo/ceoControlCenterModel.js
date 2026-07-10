import { DEMO_TODAY } from '../../data/constants.js'
import { buildCashRadarView } from '../cashRadar/cashRadarModel.js'
import { buildExecutiveWarRoomView, MONTH_FROM, MONTH_TO } from '../executive/executiveWarRoomModel.js'
import { estimateCashAndBank } from '../order/orderRealProfitModel.js'
import { remainingBalance } from '../../utils/orderFinance.js'

/** @typedef {import('../../contracts/v1/managerCockpit.js').ManagerCockpitResponseDto} ManagerCockpitResponseDto */
/** @typedef {import('../../contracts/v1/profitabilityAnalytics.js').ProfitabilityResponseDto} ProfitabilityResponseDto */
/** @typedef {import('../../contracts/v1/actionCenter.js').ActionDto} ActionDto */
/** @typedef {import('../../contracts/v1/operationCase.js').OperationCasesResponseDto} OperationCasesResponseDto */
/** @typedef {import('../../contracts/v1/operationsAgent.js').OperationsAgentsResponseDto} OperationsAgentsResponseDto */
/** @typedef {import('../../contracts/v1/dataQuality.js').DataQualityResponseDto} DataQualityResponseDto */
/** @typedef {import('../../contracts/v1/supplierOperations.js').SupplyOperationsBoardDto} SupplyOperationsBoardDto */
/** @typedef {import('../../contracts/v1/forecastEngine.js').ForecastEngineResponseDto} ForecastEngineResponseDto */
/** @typedef {import('../../contracts/v1/operationsAdvisor.js').OperationsAdvisorResponseDto} OperationsAdvisorResponseDto */
/** @typedef {import('../../contracts/v1/businessRule.js').BusinessRulesResponseDto} BusinessRulesResponseDto */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/supplierLedgerCenter.js').SupplierLedgerCenterDto} SupplierLedgerCenterDto */
/** @typedef {import('../../contracts/v1/payment.js').PaymentTransactionDto} PaymentTransactionDto */

const TL = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})

const num = (v) => {
  const n = Number.parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

const fmtTL = (v) => TL.format(num(v))
const fmtPct = (v) => `%${Math.round(v * 10) / 10}`
const round1 = (n) => Math.round(n * 10) / 10
const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

const BAND_LABELS = {
  EXCELLENT: 'Mükemmel',
  GOOD: 'İyi',
  FAIR: 'Orta',
  POOR: 'Zayıf',
  CRITICAL: 'Kritik',
}

const SEVERITY_RANK = { CRITICAL: 3, WARNING: 2, INFO: 1 }

/**
 * @param {number} score
 */
function scoreBand(score) {
  if (score >= 85) return 'EXCELLENT'
  if (score >= 70) return 'GOOD'
  if (score >= 55) return 'FAIR'
  if (score >= 40) return 'POOR'
  return 'CRITICAL'
}

/**
 * @param {number} score
 * @returns {'success'|'warning'|'critical'|undefined}
 */
function healthScoreTone(score) {
  if (score >= 75) return 'success'
  if (score >= 60) return 'warning'
  return 'critical'
}

/**
 * @param {number} score
 */
function healthScoreLabel(score) {
  if (score >= 90) return 'Mükemmel'
  if (score >= 75) return 'İyi'
  if (score >= 60) return 'Orta'
  if (score >= 40) return 'Düşük'
  return 'Kritik'
}

/**
 * @param {ProfitabilityResponseDto} profitability
 * @param {DataQualityResponseDto} dataQuality
 * @param {ForecastEngineResponseDto} forecast
 * @param {{ actions: ActionDto[] }} actionResult
 * @param {number} delayed
 * @param {number} p1Cases
 */
function computeCompanyScore(profitability, dataQuality, forecast, actionResult, delayed, p1Cases) {
  const t = profitability.totals ?? {}
  const profitMarginRaw = (clamp(num(t.profitMarginPct), 0, 30) / 30) * 100
  const collected = num(t.collected)
  const open = num(t.openBalance)
  const collectionRatioRaw = collected + open > 0 ? (collected / (collected + open)) * 100 : 100
  const risky = num(t.riskyReceivable)
  const riskyShare = open > 0 ? risky / open : 0
  const riskyReceivableRaw = 100 - Math.min(100, riskyShare * 4)
  const operationsDisciplineRaw = 100 - Math.min(100, delayed * 8 + p1Cases * 10)
  const openActions = (actionResult.actions ?? []).filter(
    (a) => a.status !== 'COMPLETED' && a.status !== 'DISMISSED',
  )
  const completed = (actionResult.actions ?? []).filter((a) => a.status === 'COMPLETED').length
  const taskCompletionRaw =
    openActions.length + completed > 0 ? (completed / (openActions.length + completed)) * 100 : 100
  const dataQualityRaw = clamp(num(dataQuality.totals?.averageQualityScore), 0, 100)
  const monthEndTargetRaw = Math.min(100, clamp(num(forecast.summary?.targetAchievementPct), 0, 200))

  const components = {
    profitMargin: { weight: 20, rawScore: round1(profitMarginRaw) },
    collectionRatio: { weight: 20, rawScore: round1(collectionRatioRaw) },
    riskyReceivableShare: { weight: 15, rawScore: round1(riskyReceivableRaw) },
    operationsDiscipline: { weight: 15, rawScore: round1(operationsDisciplineRaw) },
    taskCompletion: { weight: 10, rawScore: round1(taskCompletionRaw) },
    dataQuality: { weight: 10, rawScore: round1(dataQualityRaw) },
    monthEndTarget: { weight: 10, rawScore: round1(monthEndTargetRaw) },
  }

  const score = round1(
    Object.values(components).reduce((s, c) => s + c.rawScore * (c.weight / 100), 0),
  )
  const band = scoreBand(score)

  return {
    score,
    band,
    bandLabel: BAND_LABELS[band],
    tone: healthScoreTone(score),
    label: healthScoreLabel(score),
    components,
  }
}

/**
 * @param {OperationsAdvisorResponseDto} advisories
 * @param {ManagerCockpitResponseDto} cockpit
 * @param {ForecastEngineResponseDto} forecast
 * @param {ActionDto[]} actions
 * @param {BusinessRulesResponseDto} rules
 * @param {ReturnType<typeof buildExecutiveWarRoomView>} warRoom
 * @param {ReturnType<typeof buildCashRadarView>} cashRadar
 */
function buildTopRisks(advisories, cockpit, forecast, actions, rules, warRoom, cashRadar) {
  /** @type {{ id: string, severity: string, category: string, title: string, impact: string, rank: number }[]} */
  const out = []
  const mapSev = (s) => (s === 'critical' ? 'CRITICAL' : s === 'warning' ? 'WARNING' : 'INFO')

  for (const a of advisories.advisories ?? []) {
    if (a.severity === 'INFO') continue
    out.push({
      id: `advisory:${a.id}`,
      severity: a.severity,
      category: a.category ?? 'OPERATIONS',
      title: a.title,
      impact: a.reason ?? a.impact ?? '—',
      rank: SEVERITY_RANK[a.severity] ?? 1,
    })
  }

  ;(cockpit.managerAlerts ?? []).forEach((a, i) => {
    out.push({
      id: `cockpit:${i}`,
      severity: mapSev(a.severity),
      category: 'OPERATIONS',
      title: 'Kokpit uyarısı',
      impact: a.message,
      rank: SEVERITY_RANK[mapSev(a.severity)] ?? 1,
    })
  })

  ;(forecast.alerts ?? []).forEach((a, i) => {
    if (a.severity === 'info') return
    out.push({
      id: `forecast:${i}`,
      severity: mapSev(a.severity).toUpperCase(),
      category: 'SALES',
      title: 'Tahmin uyarısı',
      impact: a.message,
      rank: SEVERITY_RANK[mapSev(a.severity)] ?? 1,
    })
  })

  for (const a of actions) {
    if (a.priority !== 'P1' || a.status === 'COMPLETED' || a.status === 'DISMISSED') continue
    out.push({
      id: `action:${a.id}`,
      severity: 'CRITICAL',
      category: a.category ?? 'OPERATIONS',
      title: a.title,
      impact: a.reason ?? a.recommendedAction ?? '—',
      rank: 3,
    })
  }

  for (const r of rules.rules ?? []) {
    if (!r.isEnabled || r.severity !== 'CRITICAL') continue
    out.push({
      id: `rule:${r.code}`,
      severity: 'CRITICAL',
      category: r.category ?? 'RULE',
      title: r.name,
      impact: r.description ?? '—',
      rank: 3,
    })
  }

  for (const c of warRoom.criticalCases.slice(0, 5)) {
    out.push({
      id: `case:${c.id}`,
      severity: c.priority === 'P1' ? 'CRITICAL' : 'WARNING',
      category: c.category ?? 'OPERATIONS',
      title: `${c.caseNumber} — ${c.customer}`,
      impact: c.nextAction ?? c.risk ?? '—',
      rank: c.priority === 'P1' ? 3 : 2,
    })
  }

  for (const d of cashRadar.topDebtors.slice(0, 3)) {
    out.push({
      id: `debtor:${d.id}`,
      severity: d.riskTone === 'critical' ? 'CRITICAL' : 'WARNING',
      category: 'COLLECTION',
      title: d.customer,
      impact: `${d.openBalance} açık bakiye · ${d.suggestion}`,
      rank: d.riskTone === 'critical' ? 3 : 2,
    })
  }

  out.sort((a, b) => b.rank - a.rank)
  return out.slice(0, 10)
}

/**
 * @param {ForecastEngineResponseDto} forecast
 * @param {ProfitabilityResponseDto} staffProfitability
 * @param {ReturnType<typeof buildExecutiveWarRoomView>} warRoom
 * @param {ReturnType<typeof buildCashRadarView>} cashRadar
 */
function buildTopOpportunities(forecast, staffProfitability, warRoom, cashRadar) {
  /** @type {{ id: string, title: string, impact: string, description: string, score: number }[]} */
  const out = []

  for (const s of forecast.staffForecast ?? []) {
    if (s.status !== 'HEDEF_USTU') continue
    out.push({
      id: `staff:${s.key}`,
      title: `${s.label} hedef üstü`,
      impact: `%${s.achievementPct} hedef`,
      description: `Projeksiyon ${fmtTL(s.projectedSales)} · mevcut ${fmtTL(s.currentSales)}`,
      score: num(s.achievementPct),
    })
  }

  for (const t of forecast.sourceTrends ?? []) {
    if (t.trend !== 'UP') continue
    out.push({
      id: `source:${t.key}`,
      title: `${t.label} büyümesi`,
      impact: `%${t.pct30} artış`,
      description: `30 gün ciro ${fmtTL(t.revenue30)}`,
      score: num(t.pct30) + 50,
    })
  }

  for (const row of warRoom.staffRows.slice(0, 3)) {
    out.push({
      id: `performer:${row.id}`,
      title: `${row.staff} performansı`,
      impact: row.profit,
      description: `Satış ${row.sales} · tahsilat ${row.collection}`,
      score: num(row.profit.replace(/\D/g, '')) / 1000,
    })
  }

  if (cashRadar.kpiMetrics[0]) {
    const todayVal = cashRadar.kpiMetrics[0].value
    out.push({
      id: 'cash-today',
      title: 'Bugün tahsilat fırsatı',
      impact: todayVal,
      description: 'Bugün tahsil edilebilir bakiye — nakit akışını hızlandırır.',
      score: 60,
    })
  }

  if (num(forecast.summary?.targetAchievementPct) >= 100) {
    out.push({
      id: 'target',
      title: 'Ay sonu ciro hedefi',
      impact: `%${forecast.summary.targetAchievementPct}`,
      description: 'Projeksiyon geçen ayın üzerinde; büyüme momentumu korunabilir.',
      score: num(forecast.summary.targetAchievementPct),
    })
  }

  for (const s of warRoom.supplierRows.filter((r) => r.riskTone === 'success').slice(0, 2)) {
    out.push({
      id: `supplier:${s.id}`,
      title: `${s.supplier} tedarik`,
      impact: 'Sağlıklı',
      description: `${s.ssh} açık ürün · gecikme ${s.delay}`,
      score: 45,
    })
  }

  out.sort((a, b) => b.score - a.score)
  return out.slice(0, 10)
}

/**
 * @param {ReturnType<typeof computeCompanyScore>} companyScore
 * @param {ReturnType<typeof buildExecutiveWarRoomView>} warRoom
 * @param {ReturnType<typeof buildCashRadarView>} cashRadar
 * @param {ManagerCockpitResponseDto} cockpit
 * @param {ProfitabilityResponseDto} profitability
 */
function buildCeoBriefing(companyScore, warRoom, cashRadar, cockpit, profitability) {
  const totals = profitability.totals ?? {}
  const todayCollectible = cashRadar.kpiMetrics.find((m) => m.id === 'today')?.value ?? '—'

  return {
    headline: `${warRoom.today} — Şirket skoru ${companyScore.score} (${companyScore.bandLabel})`,
    bullets: [
      ...warRoom.briefingBullets.slice(0, 4),
      `Bugün tahsil edilebilir ${todayCollectible}; aylık ciro ${fmtTL(cockpit.summary?.monthRevenue ?? totals.revenue)}.`,
      `Şirket skoru bileşenleri: tahsilat ${fmtPct(companyScore.components.collectionRatio.rawScore)}, operasyon disiplini ${fmtPct(companyScore.components.operationsDiscipline.rawScore)}.`,
    ].slice(0, 6),
    highlights: [
      { label: 'Şirket Skoru', value: `${companyScore.score} / 100`, tone: companyScore.tone },
      { label: 'Günlük Ciro', value: fmtTL(cockpit.summary?.todaySales), tone: 'success' },
      { label: 'Tahsilat Oranı', value: warRoom.kpiMetrics.find((m) => m.id === 'collection-rate')?.value ?? '—', tone: warRoom.kpiMetrics.find((m) => m.id === 'collection-rate')?.valueTone },
      { label: 'Riskli Alacak', value: fmtTL(cockpit.summary?.riskyReceivable ?? totals.riskyReceivable), tone: num(cockpit.summary?.riskyReceivable) > 0 ? 'critical' : 'success' },
      { label: 'Bugün Tahsil', value: todayCollectible, tone: 'operation' },
    ],
  }
}

/**
 * @param {{
 *   profitability: ProfitabilityResponseDto
 *   supplyBoard: SupplyOperationsBoardDto
 *   ledgerCenter?: SupplierLedgerCenterDto | null
 *   collectionRows: CollectionRowVM[]
 *   payments?: PaymentTransactionDto[]
 *   cockpit: ManagerCockpitResponseDto
 * }} input
 */
export function buildFinancialBackbone(input) {
  const { profitability, supplyBoard, ledgerCenter, collectionRows, payments = [], cockpit } = input
  const totals = profitability.totals ?? {}
  const { cash, bank } = estimateCashAndBank(payments)
  const pendingCollections = collectionRows
    .reduce((s, row) => s + remainingBalance(row), 0) || num(totals.openBalance)

  const supplierDebt =
    num(ledgerCenter?.kpis?.totalDebt) || num(supplyBoard.kpis?.totalOpenDebt)
  const pendingOrderDebt = num(ledgerCenter?.kpis?.pendingOrderDebt)
  const totalSupplierRisk = num(ledgerCenter?.kpis?.totalSupplierRisk) || supplierDebt + pendingOrderDebt
  const upcoming30 = num(ledgerCenter?.kpis?.upcomingPayments30)
  const upcoming15 = num(ledgerCenter?.kpis?.upcomingPayments15)
  const upcoming7 = num(ledgerCenter?.kpis?.upcomingPayments7)
  const netPosition = cash + bank + pendingCollections - supplierDebt

  return {
    cards: [
      { id: 'cash', label: 'Kasadaki Nakit', value: fmtTL(cash || num(cockpit.summary?.collectionToday)), tone: 'success' },
      { id: 'bank', label: 'Banka Bakiyesi', value: fmtTL(bank || num(totals.collected) - cash), tone: 'operation' },
      { id: 'pending-collect', label: 'Bekleyen Tahsilatlar', value: fmtTL(pendingCollections), tone: 'warning' },
      { id: 'supplier-debt', label: 'Toplam Cari Borç', value: fmtTL(supplierDebt), tone: supplierDebt > 0 ? 'critical' : 'success' },
      {
        id: 'pending-supplier-debt',
        label: 'Toplam Bekleyen Sipariş Borcu',
        value: fmtTL(pendingOrderDebt),
        tone: pendingOrderDebt > 0 ? 'warning' : 'success',
      },
      {
        id: 'total-supplier-risk',
        label: 'Toplam Tedarikçi Riski',
        value: fmtTL(totalSupplierRisk),
        tone: totalSupplierRisk > 0 ? 'critical' : 'success',
      },
      {
        id: 'upcoming-pay',
        label: 'Yaklaşan Ödemeler (30 Gün)',
        value: fmtTL(upcoming30),
        tone: upcoming30 > 0 ? 'warning' : 'success',
        sub: `7g: ${fmtTL(upcoming7)} · 15g: ${fmtTL(upcoming15)}`,
      },
      {
        id: 'net-position',
        label: 'Net Finansal Pozisyon',
        value: fmtTL(netPosition),
        tone: netPosition >= 0 ? 'success' : 'critical',
      },
    ],
  }
}

/**
 * @param {{
 *   cockpit: ManagerCockpitResponseDto
 *   profitability: ProfitabilityResponseDto
 *   staffProfitability: ProfitabilityResponseDto
 *   actions: ActionDto[]
 *   casesResponse: OperationCasesResponseDto
 *   agents: OperationsAgentsResponseDto
 *   dataQuality: DataQualityResponseDto
 *   supplyBoard: SupplyOperationsBoardDto
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   forecast: ForecastEngineResponseDto
 *   advisories: OperationsAdvisorResponseDto
 *   rules: BusinessRulesResponseDto
 *   ledgerCenter?: SupplierLedgerCenterDto | null
 *   payments?: PaymentTransactionDto[]
 * }} input
 */
export function buildCeoControlCenterView(input) {
  const {
    cockpit,
    profitability,
    staffProfitability,
    actions,
    casesResponse,
    agents,
    dataQuality,
    supplyBoard,
    orders,
    listItemDtos,
    collectionRows,
    forecast,
    advisories,
    rules,
    ledgerCenter,
    payments = [],
  } = input

  const warRoom = buildExecutiveWarRoomView({
    cockpit,
    profitability,
    staffProfitability,
    actions,
    casesResponse,
    agents,
    dataQuality,
    supplyBoard,
    orders,
    listItemDtos,
  })

  const cashRadar = buildCashRadarView({
    collectionRows,
    cockpit,
    profitability,
    todayIso: warRoom.today ?? DEMO_TODAY,
  })

  const delayed = cockpit.todayOperations?.delayedShipments ?? 0
  const p1Cases = (casesResponse.cases ?? []).filter(
    (c) => c.priority === 'P1' && !['RESOLVED', 'CLOSED'].includes(c.status),
  ).length

  const companyScore = computeCompanyScore(
    profitability,
    dataQuality,
    forecast,
    { actions },
    delayed,
    p1Cases,
  )

  const summary = cockpit.summary ?? {}
  const totals = profitability.totals ?? {}
  const collected = num(totals.collected)
  const openBalance = num(totals.openBalance)
  const collectionRate = collected + openBalance > 0 ? (collected / (collected + openBalance)) * 100 : 0

  const opsIssues = delayed + p1Cases + (cockpit.todayOperations?.criticalRiskOrders ?? 0)

  /** @type {import('../../components/erp-ops/ErpOpsSummaryStrip.jsx').ErpSummaryMetric[]} */
  const todayMetrics = [
    {
      id: 'revenue',
      label: 'Ciro',
      value: fmtTL(summary.monthRevenue ?? totals.revenue),
      itemTone: 'success',
    },
    {
      id: 'collection',
      label: 'Tahsilat',
      value: fmtPct(collectionRate),
      valueTone: collectionRate >= 80 ? 'success' : collectionRate >= 60 ? 'warning' : 'critical',
    },
    {
      id: 'risk',
      label: 'Risk',
      value: fmtTL(summary.riskyReceivable ?? totals.riskyReceivable),
      valueTone: num(summary.riskyReceivable ?? totals.riskyReceivable) > 0 ? 'critical' : 'success',
    },
    {
      id: 'operations',
      label: 'Operasyon',
      value: opsIssues > 0 ? `${opsIssues} açık konu` : 'Normal',
      valueTone: opsIssues > 3 ? 'critical' : opsIssues > 0 ? 'warning' : 'success',
      itemTone: opsIssues > 0 ? 'operation' : 'success',
    },
  ]

  const todayCollectible = cashRadar.kpiMetrics.find((m) => m.id === 'today')?.value ?? fmtTL(0)
  const moneySummary = [
    { id: 'incoming', label: 'Kasaya Girecek', value: todayCollectible, tone: 'operation' },
    {
      id: 'risky',
      label: 'Riskli Alacak',
      value: fmtTL(summary.riskyReceivable ?? totals.riskyReceivable),
      tone: num(summary.riskyReceivable) > 0 ? 'critical' : 'success',
    },
    {
      id: 'pending-profit',
      label: 'Bekleyen Kâr',
      value: fmtTL(summary.pendingProfit ?? totals.pendingProfit),
      tone: 'warning',
    },
    {
      id: 'realized-profit',
      label: 'Gerçekleşen Kâr',
      value: fmtTL(summary.realizedProfit ?? totals.realizedProfit),
      tone: 'success',
    },
  ]

  const departmentHealth = warRoom.departmentHeatmap.filter((d) =>
    ['sales', 'collection', 'shipment', 'assembly', 'ssh'].includes(d.id),
  )

  const briefing = buildCeoBriefing(companyScore, warRoom, cashRadar, cockpit, profitability)
  const topRisks = buildTopRisks(advisories, cockpit, forecast, actions, rules, warRoom, cashRadar)
  const topOpportunities = buildTopOpportunities(forecast, staffProfitability, warRoom, cashRadar)
  const financialBackbone = buildFinancialBackbone({
    profitability,
    supplyBoard,
    ledgerCenter,
    collectionRows,
    payments,
    cockpit,
  })

  return {
    today: warRoom.today,
    companyScore,
    todayMetrics,
    briefing,
    topRisks,
    topOpportunities,
    moneySummary,
    financialBackbone,
    departmentHealth,
    topActions: warRoom.topActions,
  }
}

export { MONTH_FROM, MONTH_TO }
