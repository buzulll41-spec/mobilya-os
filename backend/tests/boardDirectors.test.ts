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

import type { StrategicContext } from '../src/services/strategicIntelligenceEngine.js'

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

import {

  assembleBoardDirectors,

  buildDirectorVotes,

  computeBoardScore,

  resolveBoardDecision,

  voteExecutiveDirector,

  voteFinanceDirector,

  voteOperationsDirector,

  voteRiskDirector,

  voteSalesDirector,

  voteSupplierDirector,

  type BoardContext,

} from '../src/services/boardDirectorsEngine.js'



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



function buildBoardCtx(opts: { profitOrders?: ProfitOrderInput[] } = {}): BoardContext {

  const strategic = buildStrategicCtx(opts)

  const executive = buildExecutiveCtx(strategic)

  return { strategic, executive }

}



function boardResult(opts: { profitOrders?: ProfitOrderInput[] } = {}) {

  return assembleBoardDirectors(buildBoardCtx(opts))

}



describe('boardDirectorsEngine', () => {

  it('1. Direktörler oluşur', () => {

    const res = boardResult()

    expect(res.directors).toHaveLength(6)

    const codes = res.directors.map((d) => d.code)

    expect(codes).toContain('FINANCE_DIRECTOR')

    expect(codes).toContain('OPERATIONS_DIRECTOR')

    expect(codes).toContain('SALES_DIRECTOR')

    expect(codes).toContain('SUPPLIER_DIRECTOR')

    expect(codes).toContain('RISK_DIRECTOR')

    expect(codes).toContain('EXECUTIVE_DIRECTOR')

  })



  it('2. Finans direktörü oy verir', () => {

    const ctx = buildBoardCtx()

    const vote = voteFinanceDirector(ctx.strategic)

    expect(vote.code).toBe('FINANCE_DIRECTOR')

    expect(vote.vote).toBeTruthy()

    expect(vote.confidence).toBeGreaterThanOrEqual(0)

    expect(vote.confidence).toBeLessThanOrEqual(100)

    expect(vote.reason).toBeTruthy()

  })



  it('3. Operasyon direktörü oy verir', () => {

    const ctx = buildBoardCtx()

    const vote = voteOperationsDirector(ctx.strategic)

    expect(vote.code).toBe('OPERATIONS_DIRECTOR')

    expect(vote.vote).toBeTruthy()

    expect(vote.weight).toBe(20)

  })



  it('4. Satış direktörü oy verir', () => {

    const ctx = buildBoardCtx()

    const vote = voteSalesDirector(ctx.strategic)

    expect(vote.code).toBe('SALES_DIRECTOR')

    expect(vote.voteLabel).toBeTruthy()

    expect(vote.reason).toBeTruthy()

  })



  it('5. Tedarikçi direktörü oy verir', () => {

    const ctx = buildBoardCtx()

    const vote = voteSupplierDirector(ctx.strategic)

    expect(vote.code).toBe('SUPPLIER_DIRECTOR')

    expect(vote.vote).toBeTruthy()

    expect(vote.weight).toBe(10)

  })



  it('6. Risk direktörü oy verir', () => {

    const ctx = buildBoardCtx()

    const vote = voteRiskDirector(ctx.strategic)

    expect(vote.code).toBe('RISK_DIRECTOR')

    expect(vote.confidence).toBeGreaterThan(0)

    expect(vote.reason).toBeTruthy()

  })



  it('7. Genel müdür oy verir', () => {

    const ctx = buildBoardCtx()

    const vote = voteExecutiveDirector(ctx.executive)

    expect(vote.code).toBe('EXECUTIVE_DIRECTOR')

    expect(vote.vote).toBeTruthy()

    expect(vote.weight).toBe(10)

    expect(assembleExecutiveDirectorResponse(ctx.executive)).toBeTruthy()

  })



  it('8. Kurul kararı oluşur', () => {

    const res = boardResult()

    expect(res.boardDecision).toBeTruthy()

    expect(res.boardReason).toBeTruthy()

    const directors = buildDirectorVotes(buildBoardCtx())

    const resolved = resolveBoardDecision(directors)

    expect(resolved.decision).toBe(res.boardDecision)

  })



  it('9. Kurul skoru oluşur', () => {

    const ctx = buildBoardCtx()

    const score = computeBoardScore(ctx.strategic)

    const res = boardResult()

    expect(score).toBeGreaterThanOrEqual(0)

    expect(score).toBeLessThanOrEqual(100)

    expect(res.boardScore).toBe(score)

    expect(res.summary.boardScore).toBe(score)

  })



  it('10. Risk listesi oluşur', () => {

    const res = boardResult()

    expect(Array.isArray(res.topRisks)).toBe(true)

    expect(res.topRisks.length).toBeGreaterThan(0)

    expect(res.topRisks[0]!.title).toBeTruthy()

  })



  it('11. Fırsat listesi oluşur', () => {

    const res = boardResult()

    expect(Array.isArray(res.topOpportunities)).toBe(true)

    expect(res.topOpportunities.length).toBeGreaterThan(0)

    expect(res.topOpportunities[0]!.impact).toBeTruthy()

  })



  it('12. Endpoint 200 (smoke/type check)', () => {

    expect(typeof assembleBoardDirectors).toBe('function')

    const res = boardResult()

    expect(res.summary).toBeTruthy()

    expect(res.whatBoardWouldDoToday).toHaveLength(5)

  })



  it('13. Boş veri kırılmaz', () => {

    const res = boardResult({ profitOrders: [] })

    expect(res.boardScore).toBeGreaterThanOrEqual(0)

    expect(res.boardDecision).toBeTruthy()

    expect(res.directors).toHaveLength(6)

  })



  it('14. Yetki çalışır', () => {

    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.BOARD_DIRECTORS_READ)).toBe(true)

    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.BOARD_DIRECTORS_READ)).toBe(true)

    expect(roleHasPermission(USER_ROLE.SALES, PERM.BOARD_DIRECTORS_READ)).toBe(false)

    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.BOARD_DIRECTORS_READ)).toBe(false)

    expect(roleHasPermission(USER_ROLE.WAREHOUSE, PERM.BOARD_DIRECTORS_READ)).toBe(false)

  })



  it('15. Depo Katı görünmez', () => {

    const raw = JSON.stringify(boardResult())

    expect(raw).not.toContain('Depo Katı')

  })



  it('16. WAREHOUSE görünmez', () => {

    const raw = JSON.stringify(boardResult())

    expect(raw).not.toContain('WAREHOUSE')

  })



  it('17. Build kırılmaz', () => {

    expect(typeof computeBoardScore).toBe('function')

    expect(typeof resolveBoardDecision).toBe('function')

  })

})



const hasDb = Boolean(process.env.DATABASE_URL)



describe.skipIf(!hasDb)('board-directors endpoints (canlı)', () => {

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

    const res = await app.inject({ method: 'GET', url: '/v1/reports/board-directors' })

    expect(res.statusCode).toBe(200)

    const body = res.json() as Record<string, unknown>

    expect(body.summary).toBeTruthy()

    expect(body.directors).toBeTruthy()

    expect(body.boardDecision).toBeTruthy()

    expect(JSON.stringify(body)).not.toContain('Depo Katı')

    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')

  })

})


