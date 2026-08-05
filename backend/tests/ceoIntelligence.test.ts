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
  computeCeoScore,
  resolveCeoDecision,
  type CeoIntelligenceContext,
} from '../src/services/ceoIntelligenceEngine.js'

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

function buildStrategicCtx(opts: { profitOrders?: ProfitOrderInput[] } = {}): StrategicContext {
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

  let delayedShipments = 0
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
  const agents = assembleOperationsAgentsResponse(ctx)
  return { ctx, ceo: strategic.ceo, agents, lastRunAt: null }
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

function buildCeoCtx(opts: { profitOrders?: ProfitOrderInput[] } = {}): CeoIntelligenceContext {
  const strategic = buildStrategicCtx(opts)
  const strategicReport = assembleStrategicIntelligence(strategic)
  const executive = buildExecutiveCtx(strategic)
  const executiveReport = assembleExecutiveDirectorResponse(executive)
  const board = assembleBoardDirectors({ strategic, executive })
  const simulation = assembleCompanySimulation(buildSimulationBaseline(strategic), {})
  return { strategic, strategicReport, executive, executiveReport, board, simulation }
}

function ceoResult(opts: { profitOrders?: ProfitOrderInput[] } = {}) {
  return assembleCeoIntelligence(buildCeoCtx(opts))
}

describe('ceoIntelligenceEngine', () => {
  it('1. CEO score oluşur', () => {
    const ctx = buildCeoCtx()
    const score = computeCeoScore(ctx)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
    expect(ceoResult().ceoScore).toBe(score)
  })

  it('2. CEO decision oluşur', () => {
    const res = ceoResult()
    expect(res.ceoDecision).toBeTruthy()
    expect(resolveCeoDecision(buildCeoCtx())).toBe(res.ceoDecision)
  })

  it('3. CEO reason oluşur', () => {
    const res = ceoResult()
    expect(res.ceoReason.length).toBeGreaterThan(0)
    expect(res.ceoReason.length).toBeLessThanOrEqual(10)
    expect(res.ceoReason.some((r) => r.includes('Yönetim Kurulu'))).toBe(true)
  })

  it('4. Problems oluşur', () => {
    const res = ceoResult()
    expect(res.topProblems.length).toBeGreaterThan(0)
    expect(res.topProblems.length).toBeLessThanOrEqual(10)
  })

  it('5. Opportunities oluşur', () => {
    const res = ceoResult()
    expect(res.topOpportunities.length).toBeGreaterThan(0)
    expect(res.topOpportunities.length).toBeLessThanOrEqual(10)
  })

  it('6. Today actions oluşur', () => {
    const res = ceoResult()
    expect(res.todayActions.length).toBe(5)
  })

  it('7. 30 day plan oluşur', () => {
    const res = ceoResult()
    expect(res.next30Days.length).toBeGreaterThan(0)
  })

  it('8. 90 day plan oluşur', () => {
    const res = ceoResult()
    expect(res.next90Days.length).toBeGreaterThan(0)
  })

  it('9. Endpoint smoke/type check', () => {
    expect(typeof assembleCeoIntelligence).toBe('function')
  })

  it('10. Boş veri kırılmaz', () => {
    const res = ceoResult({ profitOrders: [] })
    expect(res.ceoScore).toBeGreaterThanOrEqual(0)
    expect(res.ceoDecision).toBeTruthy()
    expect(res.ceoReason.length).toBeGreaterThan(0)
  })

  it('11. Yetki çalışır', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.CEO_INTELLIGENCE_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.CEO_INTELLIGENCE_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.CEO_INTELLIGENCE_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.CEO_INTELLIGENCE_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.WAREHOUSE, PERM.CEO_INTELLIGENCE_READ)).toBe(false)
  })

  it('12. Board verisi okunur', () => {
    const ctx = buildCeoCtx()
    expect(ctx.board.boardDecision).toBeTruthy()
    expect(ctx.board.directors).toHaveLength(6)
    expect(ceoResult().summary.boardDecision).toBe(ctx.board.boardDecision)
  })

  it('13. Simulation verisi okunur', () => {
    const ctx = buildCeoCtx()
    expect(ctx.simulation.bestCase).toBeTruthy()
    expect(ctx.simulation.worstCase).toBeTruthy()
    expect(ceoResult().ceoReason.some((r) => r.includes('Simülasyon'))).toBe(true)
  })

  it('14. Executive Director verisi okunur', () => {
    const ctx = buildCeoCtx()
    expect(ctx.executiveReport.summary.managerScore).toBeGreaterThanOrEqual(0)
    expect(ceoResult().ceoReason.some((r) => r.includes('Genel Müdür'))).toBe(true)
  })

  it('15. Depo Katı görünmez', () => {
    const raw = JSON.stringify(ceoResult())
    expect(raw).not.toContain('Depo Katı')
  })

  it('16. WAREHOUSE görünmez', () => {
    const raw = JSON.stringify(ceoResult())
    expect(raw).not.toContain('WAREHOUSE')
  })

  it('17. Build kırılmaz', () => {
    expect(typeof computeCeoScore).toBe('function')
    expect(typeof resolveCeoDecision).toBe('function')
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/ceo-intelligence (canlı)', () => {
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
    const res = await app.inject({ method: 'GET', url: '/v1/reports/ceo-intelligence' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(body.summary).toBeTruthy()
    expect(body.ceoDecision).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
  })
})
