import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { roleHasPermission, PERM } from '../src/middleware/rbac.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import {
  aggregateProfitability,
  type ProfitLineInput,
  type ProfitOrderInput,
} from '../src/services/getProfitabilityAnalytics.js'
import { evaluateDataQuality, type DataQualityRecordInput } from '../src/services/getDataQualityReport.js'
import { assembleManagerCockpit } from '../src/services/getManagerCockpit.js'
import { buildForecast } from '../src/services/getForecastEngine.js'
import { buildAdvisories } from '../src/services/getOperationsAdvisor.js'
import { buildActions } from '../src/services/getActionCenter.js'
import { buildCases } from '../src/services/getOperationCases.js'
import { buildJobs } from '../src/services/getAutomationJobs.js'
import { getBusinessRules } from '../src/services/getBusinessRules.js'
import { assembleCeoControlCenter, type CeoGatheredData } from '../src/services/getCeoControlCenter.js'
import {
  assembleStrategicIntelligence,
  type StrategicContext,
} from '../src/services/strategicIntelligenceEngine.js'
import type { SalesOrderListItemDto } from '../src/projection/salesOrderListItemProjection.js'
import { numberToMoney, type Money } from '../src/lib/money.js'
import {
  assembleExecutiveDirectorResponse,
  type DirectorContext,
} from '../src/services/executiveDirectorEngine.js'
import {
  assembleOperationsAgentsResponse,
  type AgentContext,
} from '../src/services/operationsAgentsEngine.js'
import { assembleBoardDirectors } from '../src/services/boardDirectorsEngine.js'
import {
  assembleCompanySimulation,
  type SimulationBaseline,
} from '../src/services/companySimulationEngine.js'
import {
  assembleCeoIntelligence,
  type CeoIntelligenceContext,
} from '../src/services/ceoIntelligenceEngine.js'
import {
  assembleChairmanIntelligence,
  type ChairmanContext,
} from '../src/services/chairmanEngine.js'
import {
  assembleEnterpriseFuture,
  type EnterpriseFutureContext,
} from '../src/services/enterpriseFutureEngine.js'
import {
  assembleInvestorIntelligence,
  computeInvestorScore,
  computeScoreComponents,
  resolveCompanyRating,
  resolveInvestmentDecision,
  type InvestorContext,
} from '../src/services/investorIntelligenceEngine.js'

const TODAY = '2026-05-14'
const MAY = { from: '2026-05-01', to: '2026-05-31' }
const APR = { from: '2026-04-01', to: '2026-04-30' }

function m(v: number): Money {
  return numberToMoney(v, 'TRY')
}

function line(p: Partial<ProfitLineInput>): ProfitLineInput {
  return {
    lineTotal: p.lineTotal ?? 0,
    qtyOrdered: p.qtyOrdered ?? 1,
    soldUnitCost: p.soldUnitCost ?? null,
    soldSalesSourceType: p.soldSalesSourceType ?? null,
    soldDisplayFloor: p.soldDisplayFloor ?? null,
    soldExternalSupplyType: p.soldExternalSupplyType ?? null,
    supplierId: p.supplierId ?? null,
    supplierName: p.supplierName ?? null,
    category: p.category ?? null,
    brand: p.brand ?? p.supplierName ?? null,
    productId: p.productId ?? null,
    productTitle: p.productTitle ?? 'Ürün',
  }
}

const PROFIT_ORDERS: ProfitOrderInput[] = [
  {
    id: 'O1',
    orderDate: TODAY,
    salesPerson: 'Ayşe',
    customerName: 'M1',
    paidAmount: 20000,
    remainingAmount: 8000,
    riskLevel: 'HIGH',
    lines: [
      line({
        lineTotal: 20000,
        soldUnitCost: 12000,
        soldSalesSourceType: 'IN_STORE_DISPLAY',
        soldDisplayFloor: 'GROUND_FLOOR',
        category: 'Koltuk',
        supplierName: 'Marka A',
      }),
    ],
  },
  {
    id: 'O2',
    orderDate: TODAY,
    salesPerson: 'Mehmet',
    customerName: 'M2',
    paidAmount: 15000,
    remainingAmount: 2000,
    riskLevel: 'MEDIUM',
    lines: [
      line({
        lineTotal: 17000,
        soldUnitCost: 10000,
        soldSalesSourceType: 'EXTERNAL_SUPPLY',
        soldExternalSupplyType: 'CATALOG',
        category: 'Masa',
        supplierName: 'Marka B',
      }),
    ],
  },
]

const HIGH_COLLECTION_ORDERS: ProfitOrderInput[] = [
  {
    id: 'O3',
    orderDate: TODAY,
    salesPerson: 'Ayşe',
    customerName: 'M3',
    paidAmount: 50000,
    remainingAmount: 500,
    riskLevel: 'LOW',
    lines: [
      line({
        lineTotal: 50500,
        soldUnitCost: 30000,
        soldSalesSourceType: 'IN_STORE_DISPLAY',
        soldDisplayFloor: 'GROUND_FLOOR',
      }),
    ],
  },
]

const HIGH_PROFIT_ORDERS: ProfitOrderInput[] = [
  {
    id: 'O4',
    orderDate: TODAY,
    salesPerson: 'Ayşe',
    customerName: 'M4',
    paidAmount: 80000,
    remainingAmount: 1000,
    riskLevel: 'LOW',
    lines: [
      line({
        lineTotal: 81000,
        soldUnitCost: 35000,
        soldSalesSourceType: 'IN_STORE_DISPLAY',
        soldDisplayFloor: 'GROUND_FLOOR',
        category: 'Koltuk',
      }),
    ],
  },
]

const RISKY_ORDERS: ProfitOrderInput[] = [
  {
    id: 'O5',
    orderDate: TODAY,
    salesPerson: 'Mehmet',
    customerName: 'M5',
    paidAmount: 5000,
    remainingAmount: 45000,
    riskLevel: 'HIGH',
    lines: [
      line({
        lineTotal: 50000,
        soldUnitCost: 35000,
        soldSalesSourceType: 'IN_STORE_DISPLAY',
        soldDisplayFloor: 'GROUND_FLOOR',
      }),
    ],
  },
]

const DQ_RECORDS: DataQualityRecordInput[] = [
  {
    orderLineId: 'l1',
    orderId: 'O1',
    orderDate: TODAY,
    customerName: 'M1',
    productTitle: 'Koltuk X',
    salesPerson: 'Ayşe',
    soldSalesSourceType: 'IN_STORE_DISPLAY',
    soldDisplayFloor: 'GROUND_FLOOR',
    soldExternalSupplyType: null,
    soldUnitCost: 0,
  },
]

function listItem(over: Partial<SalesOrderListItemDto> & { id: string }): SalesOrderListItemDto {
  return {
    id: over.id,
    orderNumber: over.orderNumber ?? over.id,
    customerId: over.customerId ?? `C-${over.id}`,
    customerDisplayName: over.customerDisplayName ?? 'Müşteri',
    customerPhone: over.customerPhone ?? null,
    channel: over.channel ?? 'STORE',
    currency: over.currency ?? 'TRY',
    placedAt: over.placedAt ?? '2026-05-01T10:00:00.000Z',
    lifecycleStatus: over.lifecycleStatus ?? 'IN_FULFILLMENT',
    version: over.version ?? 1,
    subtotalAmount: over.subtotalAmount ?? m(10000),
    discountAmount: over.discountAmount ?? m(0),
    totalAmount: over.totalAmount ?? m(10000),
    amountPaid: over.amountPaid ?? m(5000),
    amountDue: over.amountDue ?? m(5000),
    remainingAmount: over.remainingAmount ?? m(5000),
    fulfillmentProgress: over.fulfillmentProgress ?? 0.5,
    currentRiskSeverity: over.currentRiskSeverity ?? 'HIGH',
    earliestCommittedShipBy: over.earliestCommittedShipBy ?? null,
    latestCommittedShipBy: over.latestCommittedShipBy ?? null,
    lineSummaryTitle: over.lineSummaryTitle ?? 'Ürün',
    displayStatus: over.displayStatus ?? 'Üretimde',
    plannedShipmentDate: over.plannedShipmentDate ?? null,
    salesPerson: over.salesPerson ?? 'Ayşe',
    lineCostAmount: over.lineCostAmount ?? null,
    notesSnapshot: over.notesSnapshot ?? null,
    hasOverdueBalance: over.hasOverdueBalance ?? false,
    openMissingItemsCount: over.openMissingItemsCount ?? 0,
  }
}

function buildStrategicCtx(opts: { profitOrders?: ProfitOrderInput[]; delayed?: number } = {}): StrategicContext {
  const profitOrders = opts.profitOrders ?? PROFIT_ORDERS
  const dq = evaluateDataQuality(DQ_RECORDS, {})
  const listItems = [
    listItem({
      id: 'O1',
      customerDisplayName: 'M1',
      remainingAmount: m(8000),
      currentRiskSeverity: 'HIGH',
      hasOverdueBalance: true,
      plannedShipmentDate: '2026-05-10',
      openMissingItemsCount: 2,
    }),
  ]

  let delayedShipments = opts.delayed ?? 0
  let overdueCount = 0
  for (const it of listItems) {
    if (it.displayStatus !== 'Teslim Edildi' && it.plannedShipmentDate && it.plannedShipmentDate < TODAY) {
      delayedShipments += 1
    }
    if (it.hasOverdueBalance) overdueCount += 1
  }

  const srcRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'source' })
  const personRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'salesPerson' })
  const prevMonthSrc = aggregateProfitability(profitOrders, { ...APR, groupBy: 'source' })
  const supplierRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'supplier' })
  const prevMonthCat = aggregateProfitability(profitOrders, { ...APR, groupBy: 'category' })
  const brandRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'brand' })

  const forecast = buildForecast({
    today: TODAY,
    profitOrders,
    shipmentWindows: { last30: 2, last60: 4, last90: 6 },
    dataQuality: { currentScore: dq.totals.averageQualityScore, previousScore: 90 },
    query: {},
  })

  const cockpit = assembleManagerCockpit({
    today: TODAY,
    monthFrom: MAY.from,
    monthTo: MAY.to,
    profitOrders,
    srcRes,
    catRes: aggregateProfitability(profitOrders, { ...MAY, groupBy: 'category' }),
    dq,
    listItems,
    paymentsTodayTotal: 5000,
    crewByOrder: new Map(),
    query: {},
  })

  const advisories = buildAdvisories({
    today: TODAY,
    monthSrc: srcRes,
    prevMonthSrc,
    supplierRes,
    dq,
    forecast,
    delayedShipments,
    overdueCount,
    query: {},
  })

  const actionResult = buildActions({
    today: TODAY,
    listItems,
    dq,
    forecast,
    supplierRes,
    overrides: new Map(),
    query: {},
  })

  const caseResult = buildCases({ actionResult, overrides: new Map(), orders: listItems, query: {} })
  const jobResult = buildJobs({
    actionResult,
    monthSrc: srcRes,
    prevMonthSrc,
    overrides: new Map(),
    orders: listItems,
    query: {},
  })

  const data: CeoGatheredData = {
    today: TODAY,
    monthFrom: MAY.from,
    monthTo: MAY.to,
    profitOrders,
    srcRes,
    personRes,
    prevMonthSrc,
    supplierRes,
    dq,
    listItems,
    paymentsTodayTotal: 5000,
    crewByOrder: new Map(),
    delayedShipments,
    overdueCount,
    pendingShipmentCount: 1,
    forecast,
    cockpit,
    advisories,
    actionResult,
    caseResult,
    jobResult,
    businessRules: getBusinessRules({}),
  }

  const ceo = assembleCeoControlCenter(data)
  return { ...data, ceo, prevMonthCat, brandRes }
}

function buildExecutiveCtx(strategic: StrategicContext): DirectorContext {
  const ctx: AgentContext = {
    today: strategic.today,
    monthFrom: strategic.monthFrom,
    monthTo: strategic.monthTo,
    profitOrders: strategic.profitOrders,
    srcRes: strategic.srcRes,
    personRes: strategic.personRes,
    prevMonthSrc: strategic.prevMonthSrc,
    supplierRes: strategic.supplierRes,
    dq: strategic.dq,
    listItems: strategic.listItems,
    paymentsTodayTotal: strategic.paymentsTodayTotal,
    crewByOrder: strategic.crewByOrder,
    delayedShipments: strategic.delayedShipments,
    overdueCount: strategic.overdueCount,
    pendingShipmentCount: strategic.pendingShipmentCount,
    forecast: strategic.forecast,
    cockpit: strategic.cockpit,
    advisories: strategic.advisories,
    actionResult: strategic.actionResult,
    caseResult: strategic.caseResult,
    jobResult: strategic.jobResult,
    businessRules: strategic.businessRules,
    runTimestamps: new Map(),
  }
  return { ctx, ceo: strategic.ceo, agents: assembleOperationsAgentsResponse(ctx), lastRunAt: null }
}

function num(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function buildSimulationBaseline(strategic: StrategicContext): SimulationBaseline {
  const totals = strategic.srcRes.totals
  const extRow = strategic.srcRes.rows.find((r) => r.label.includes('Dış') || r.key.includes('EXTERNAL'))
  const extRev = extRow ? num(extRow.revenue) : 0
  const totalRev = num(totals.revenue)
  return {
    ctx: strategic,
    metrics: {
      revenue: totalRev,
      grossProfit: num(totals.grossProfit),
      profitMarginPct: totals.profitMarginPct,
      collected: num(totals.collected),
      openBalance: num(totals.openBalance),
      riskyReceivable: num(totals.riskyReceivable),
      delayedShipments: strategic.delayedShipments,
      dataQualityScore: strategic.dq.totals.averageQualityScore,
      managerScore: strategic.ceo.managerScore.score,
      externalSupplyShare: totalRev > 0 ? extRev / totalRev : 0,
    },
  }
}

export function buildInvestorCtx(opts: { profitOrders?: ProfitOrderInput[]; delayed?: number } = {}): InvestorContext {
  const strategic = buildStrategicCtx(opts)
  const strategicReport = assembleStrategicIntelligence(strategic)
  const executive = buildExecutiveCtx(strategic)
  const executiveReport = assembleExecutiveDirectorResponse(executive)
  const board = assembleBoardDirectors({ strategic, executive })
  const simulation = assembleCompanySimulation(buildSimulationBaseline(strategic), {})
  const ceoCtx: CeoIntelligenceContext = { strategic, strategicReport, executive, executiveReport, board, simulation }
  const ceoReport = assembleCeoIntelligence(ceoCtx)
  const chairmanCtx: ChairmanContext = { ...ceoCtx, ceoReport }
  const chairmanReport = assembleChairmanIntelligence(chairmanCtx)
  const futureCtx: EnterpriseFutureContext = { ...chairmanCtx, chairmanReport }
  const futureReport = assembleEnterpriseFuture(futureCtx)
  return { ...futureCtx, futureReport }
}

function investorResult(opts: { profitOrders?: ProfitOrderInput[]; delayed?: number } = {}) {
  return assembleInvestorIntelligence(buildInvestorCtx(opts))
}

describe('investorIntelligenceEngine', () => {
  it('1. investorScore oluşur', () => {
    const res = investorResult()
    expect(res.investorScore).toBeGreaterThanOrEqual(0)
    expect(res.investorScore).toBeLessThanOrEqual(100)
  })

  it('2. scoreComponents 6 bileşen', () => {
    const res = investorResult()
    expect(res.scoreComponents.profitabilityScore).toBeDefined()
    expect(res.scoreComponents.growthScore).toBeDefined()
    expect(res.scoreComponents.collectionScore).toBeDefined()
    expect(res.scoreComponents.riskScore).toBeDefined()
    expect(res.scoreComponents.cashFlowScore).toBeDefined()
    expect(res.scoreComponents.stabilityScore).toBeDefined()
  })

  it('3. companyRating üretilir', () => {
    const res = investorResult()
    expect(['EXCELLENT', 'GOOD', 'AVERAGE', 'WEAK', 'CRITICAL']).toContain(res.companyRating)
  })

  it('4. investmentDecision üretilir', () => {
    const res = investorResult()
    expect(['STRONG_BUY', 'BUY', 'WATCH', 'AVOID', 'CRITICAL']).toContain(res.investmentDecision)
  })

  it('5. newStoreReadiness üretilir', () => {
    const res = investorResult()
    expect(['READY', 'PARTIAL', 'NOT_READY']).toContain(res.newStoreReadiness.status)
    expect(res.newStoreReadiness.reasons.length).toBeGreaterThan(0)
  })

  it('6. growthPotential üretilir', () => {
    const res = investorResult()
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(res.growthPotential)
  })

  it('7. financingNeed üretilir', () => {
    const res = investorResult()
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(res.financingNeed)
  })

  it('8. investmentRisk üretilir', () => {
    const res = investorResult()
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(res.investmentRisk)
  })

  it('9. valuationTrend üretilir', () => {
    const res = investorResult()
    expect(['DECLINING', 'STABLE', 'GROWING', 'FAST_GROWING']).toContain(res.valuationTrend)
  })

  it('10. SWOT minimum 10 madde', () => {
    const res = investorResult()
    expect(res.strengths.length).toBeGreaterThanOrEqual(10)
    expect(res.weaknesses.length).toBeGreaterThanOrEqual(10)
    expect(res.opportunities.length).toBeGreaterThanOrEqual(10)
    expect(res.threats.length).toBeGreaterThanOrEqual(10)
  })

  it('11. investorBriefing 5 paragraf', () => {
    const res = investorResult()
    expect(res.investorBriefing).toHaveLength(5)
  })

  it('12. topRecommendations 10 madde', () => {
    const res = investorResult()
    expect(res.topRecommendations).toHaveLength(10)
    expect(res.topRecommendations[0]!.priority).toBe(1)
  })

  it('13. boş veri kırılmaz', () => {
    const res = investorResult({ profitOrders: [] })
    expect(res.investorScore).toBeGreaterThanOrEqual(0)
    expect(res.strengths.length).toBeGreaterThanOrEqual(10)
  })

  it('14. yüksek tahsilat profili', () => {
    const res = investorResult({ profitOrders: HIGH_COLLECTION_ORDERS })
    expect(res.scoreComponents.collectionScore).toBeGreaterThan(70)
  })

  it('15. yüksek kârlılık profili', () => {
    const res = investorResult({ profitOrders: HIGH_PROFIT_ORDERS })
    expect(res.scoreComponents.profitabilityScore).toBeGreaterThan(50)
  })

  it('16. riskli veri profili', () => {
    const res = investorResult({ profitOrders: RISKY_ORDERS })
    expect(['AVOID', 'CRITICAL', 'WATCH']).toContain(res.investmentDecision)
  })

  it('17. Strong Buy koşulu', () => {
    const components = {
      profitabilityScore: 85,
      growthScore: 80,
      collectionScore: 90,
      riskScore: 75,
      cashFlowScore: 80,
      stabilityScore: 85,
    }
    const score = computeInvestorScore(components)
    const decision = resolveInvestmentDecision(score, components)
    expect(score).toBeGreaterThanOrEqual(80)
    expect(decision).toBe('STRONG_BUY')
  })

  it('18. Avoid koşulu', () => {
    const components = {
      profitabilityScore: 40,
      growthScore: 38,
      collectionScore: 42,
      riskScore: 40,
      cashFlowScore: 38,
      stabilityScore: 40,
    }
    const score = computeInvestorScore(components)
    const decision = resolveInvestmentDecision(score, components)
    expect(score).toBeGreaterThanOrEqual(35)
    expect(score).toBeLessThan(50)
    expect(decision).toBe('AVOID')
  })

  it('19. Company Rating eşleşmesi', () => {
    expect(resolveCompanyRating(90)).toBe('EXCELLENT')
    expect(resolveCompanyRating(75)).toBe('GOOD')
    expect(resolveCompanyRating(60)).toBe('AVERAGE')
    expect(resolveCompanyRating(45)).toBe('WEAK')
    expect(resolveCompanyRating(30)).toBe('CRITICAL')
  })

  it('20. Investor Score hesap tutarlılığı', () => {
    const ctx = buildInvestorCtx()
    const res = assembleInvestorIntelligence(ctx)
    const components = computeScoreComponents(ctx)
    expect(computeInvestorScore(components)).toBe(res.investorScore)
  })

  it('21. Depo Katı görünmez', () => {
    expect(JSON.stringify(investorResult())).not.toContain('Depo Katı')
  })

  it('22. WAREHOUSE görünmez', () => {
    expect(JSON.stringify(investorResult())).not.toContain('WAREHOUSE')
  })

  it('23. yetki çalışır', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.INVESTOR_INTELLIGENCE_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.INVESTOR_INTELLIGENCE_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.INVESTOR_INTELLIGENCE_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.INVESTOR_INTELLIGENCE_READ)).toBe(false)
  })

  it('24. meta.depoKatiExcluded true', () => {
    const res = investorResult()
    expect(res.meta.depoKatiExcluded).toBe(true)
  })

  it('25. kriz senaryosu riskli profil', () => {
    const res = investorResult({ profitOrders: RISKY_ORDERS, delayed: 8 })
    expect(['HIGH', 'CRITICAL', 'MEDIUM']).toContain(res.investmentRisk)
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/investor-intelligence (canlı)', () => {
  let app: FastifyInstance
  let schemaReady = false

  beforeAll(async () => {
    try {
      const { PrismaClient } = await import('@prisma/client')
      const probe = new PrismaClient()
      await probe.salesOrder.findFirst({ take: 1 })
      await probe.$disconnect()
      schemaReady = true
    } catch {
      schemaReady = false
      return
    }
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    if (app) await app.close()
  })

  it.skipIf(() => !schemaReady)('Canlı smoke GET 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/investor-intelligence' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(body.summary).toBeTruthy()
    expect(body.investorScore).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
  })
})
