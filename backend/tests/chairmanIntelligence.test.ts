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
  buildBoardAlignment,
  buildCeoAlignment,
  computeChairmanScore,
  resolveChairmanDecision,
  type ChairmanContext,
} from '../src/services/chairmanEngine.js'

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

function buildChairmanCtx(opts: { profitOrders?: ProfitOrderInput[] } = {}): ChairmanContext {
  const ceoCtx = buildCeoCtx(opts)
  const ceoReport = assembleCeoIntelligence(ceoCtx)
  return { ...ceoCtx, ceoReport }
}

function chairmanResult(opts: { profitOrders?: ProfitOrderInput[] } = {}) {
  return assembleChairmanIntelligence(buildChairmanCtx(opts))
}

describe('chairmanEngine', () => {
  it('1. chairmanScore oluşur', () => {
    const ctx = buildChairmanCtx()
    const score = computeChairmanScore(ctx)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
    expect(chairmanResult().chairmanScore).toBe(score)
  })

  it('2. chairmanDecision oluşur', () => {
    const res = chairmanResult()
    expect(res.chairmanDecision).toBeTruthy()
    expect(resolveChairmanDecision(buildChairmanCtx())).toBe(res.chairmanDecision)
  })

  it('3. oneYearPlan oluşur', () => {
    const res = chairmanResult()
    expect(res.oneYearPlan.length).toBeGreaterThan(0)
    expect(res.oneYearPlan.some((p) => p.includes('Tahsilat') || p.includes('Veri'))).toBe(true)
  })

  it('4. threeYearPlan oluşur', () => {
    const res = chairmanResult()
    expect(res.threeYearPlan.length).toBeGreaterThan(0)
  })

  it('5. fiveYearVision oluşur', () => {
    const res = chairmanResult()
    expect(res.fiveYearVision.length).toBeGreaterThan(0)
  })

  it('6. threats oluşur', () => {
    const res = chairmanResult()
    expect(res.topThreats.length).toBeGreaterThan(0)
    expect(res.topThreats.length).toBeLessThanOrEqual(10)
  })

  it('7. opportunities oluşur', () => {
    const res = chairmanResult()
    expect(res.topOpportunities.length).toBeGreaterThan(0)
    expect(res.topOpportunities.length).toBeLessThanOrEqual(10)
  })

  it('8. boardAlignment oluşur', () => {
    const ctx = buildChairmanCtx()
    const alignment = buildBoardAlignment(ctx)
    expect(alignment.score).toBeGreaterThanOrEqual(0)
    expect(alignment.status).toBeTruthy()
    expect(alignment.summary).toBeTruthy()
    expect(chairmanResult().boardAlignment.status).toBe(alignment.status)
  })

  it('9. ceoAlignment oluşur', () => {
    const ctx = buildChairmanCtx()
    const decision = resolveChairmanDecision(ctx)
    const alignment = buildCeoAlignment(ctx, decision)
    expect(alignment.score).toBeGreaterThanOrEqual(0)
    expect(alignment.details.length).toBeGreaterThan(0)
    expect(chairmanResult().ceoAlignment.summary).toBeTruthy()
  })

  it('10. endpoint smoke/type check', () => {
    expect(typeof assembleChairmanIntelligence).toBe('function')
  })

  it('11. boş veri kırılmaz', () => {
    const res = chairmanResult({ profitOrders: [] })
    expect(res.chairmanScore).toBeGreaterThanOrEqual(0)
    expect(res.chairmanDecision).toBeTruthy()
    expect(res.oneYearPlan.length).toBeGreaterThan(0)
  })

  it('12. yetki çalışır', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.CHAIRMAN_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.CHAIRMAN_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.CHAIRMAN_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.CHAIRMAN_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.WAREHOUSE, PERM.CHAIRMAN_READ)).toBe(false)
  })

  it('13. CEO verisi okunur', () => {
    const ctx = buildChairmanCtx()
    expect(ctx.ceoReport.ceoDecision).toBeTruthy()
    expect(chairmanResult().summary.ceoScore).toBe(ctx.ceoReport.ceoScore)
  })

  it('14. Board verisi okunur', () => {
    const ctx = buildChairmanCtx()
    expect(ctx.board.boardDecision).toBeTruthy()
    expect(chairmanResult().summary.boardScore).toBe(ctx.board.boardScore)
  })

  it('15. Simulation verisi okunur', () => {
    const ctx = buildChairmanCtx()
    expect(ctx.simulation.bestCase).toBeTruthy()
    expect(chairmanResult().chairmanReason.some((r) => r.includes('Simülasyon'))).toBe(true)
  })

  it('16. Depo Katı görünmez', () => {
    const raw = JSON.stringify(chairmanResult())
    expect(raw).not.toContain('Depo Katı')
  })

  it('17. WAREHOUSE görünmez', () => {
    const raw = JSON.stringify(chairmanResult())
    expect(raw).not.toContain('WAREHOUSE')
  })

  it('18. Build kırılmaz', () => {
    expect(typeof computeChairmanScore).toBe('function')
    expect(typeof resolveChairmanDecision).toBe('function')
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/chairman-intelligence (canlı)', () => {
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
    const res = await app.inject({ method: 'GET', url: '/v1/reports/chairman-intelligence' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(body.summary).toBeTruthy()
    expect(body.chairmanDecision).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
  })
})
