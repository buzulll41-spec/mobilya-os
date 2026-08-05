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
  buildBoardBriefing,
  buildCompanyHealth,
  buildGrowthAnalysis,
  buildProductStrategy,
  buildRiskForecast,
  buildSalesPersonAnalysis,
  buildStrategicRecommendations,
  buildSupplierAnalysis,
  type StrategicContext,
} from '../src/services/strategicIntelligenceEngine.js'
import type { SalesOrderListItemDto } from '../src/projection/salesOrderListItemProjection.js'
import { numberToMoney, type Money } from '../src/lib/money.js'

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
    orderDate: '2026-04-20',
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

describe('strategicIntelligenceEngine', () => {
  it('1. Sağlık skoru oluşur', () => {
    const ctx = buildStrategicCtx()
    const health = buildCompanyHealth(ctx)
    expect(health.score).toBeGreaterThanOrEqual(0)
    expect(health.score).toBeLessThanOrEqual(100)
    expect(health.breakdown.length).toBe(6)
  })

  it('2. Büyüme analizi oluşur', () => {
    const growth = buildGrowthAnalysis(buildStrategicCtx())
    expect(growth.sourceTrends.length).toBeGreaterThan(0)
    expect(growth.categoryTrends.length).toBeGreaterThan(0)
  })

  it('3. Ürün stratejisi oluşur', () => {
    const product = buildProductStrategy(buildStrategicCtx())
    expect(product.topProductGroups.length).toBeGreaterThan(0)
    expect(Array.isArray(product.recommendedFocusAreas)).toBe(true)
  })

  it('4. Tedarikçi analizi oluşur', () => {
    const supplier = buildSupplierAnalysis(buildStrategicCtx())
    expect(supplier.supplierScoreboard.length).toBeGreaterThan(0)
    expect(supplier.supplierScoreboard[0]!.score).toBeGreaterThanOrEqual(0)
  })

  it('5. Personel analizi oluşur', () => {
    const sales = buildSalesPersonAnalysis(buildStrategicCtx())
    expect(sales.salesScoreboard.length).toBeGreaterThan(0)
    expect(sales.salesScoreboard[0]!.score).toBeGreaterThanOrEqual(0)
  })

  it('6. Risk tahmini oluşur', () => {
    const risk = buildRiskForecast(buildStrategicCtx())
    expect(risk.horizonDays).toBe(90)
    expect(risk.items.length).toBeGreaterThan(0)
  })

  it('7. Yönetim kurulu brifingi oluşur', () => {
    const ctx = buildStrategicCtx()
    const growth = buildGrowthAnalysis(ctx)
    const health = buildCompanyHealth(ctx)
    const risk = buildRiskForecast(ctx)
    const product = buildProductStrategy(ctx)
    const supplier = buildSupplierAnalysis(ctx)
    const sales = buildSalesPersonAnalysis(ctx)
    const recs = buildStrategicRecommendations(ctx, growth, product, supplier, sales, health)
    const briefing = buildBoardBriefing(ctx, growth, health, risk, recs)
    expect(briefing.headline).toBeTruthy()
    expect(briefing.biggestOpportunity).toBeTruthy()
    expect(briefing.biggestRisk).toBeTruthy()
  })

  it('8. Öneriler oluşur', () => {
    const ctx = buildStrategicCtx()
    const growth = buildGrowthAnalysis(ctx)
    const product = buildProductStrategy(ctx)
    const supplier = buildSupplierAnalysis(ctx)
    const sales = buildSalesPersonAnalysis(ctx)
    const health = buildCompanyHealth(ctx)
    const recs = buildStrategicRecommendations(ctx, growth, product, supplier, sales, health)
    expect(recs.length).toBeGreaterThan(0)
    expect(recs.length).toBeLessThanOrEqual(10)
  })

  it('9. Montaj tam DTO döner', () => {
    const res = assembleStrategicIntelligence(buildStrategicCtx())
    expect(res.summary.companyHealthScore).toBeGreaterThanOrEqual(0)
    expect(res.boardBriefing.headline).toBeTruthy()
    expect(res.recommendations.length).toBeGreaterThan(0)
    expect(res.meta.depoKatiExcluded).toBe(true)
  })

  it('10. Boş veri kırılmaz', () => {
    const res = assembleStrategicIntelligence(buildStrategicCtx({ profitOrders: [] }))
    expect(res.companyHealth.score).toBeGreaterThanOrEqual(0)
    expect(res.boardBriefing.headline).toBeTruthy()
  })

  it('11. Yetki kontrolü', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.STRATEGIC_INTELLIGENCE_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.STRATEGIC_INTELLIGENCE_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.STRATEGIC_INTELLIGENCE_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.STRATEGIC_INTELLIGENCE_READ)).toBe(false)
  })

  it('12. Depo Katı görünmez', () => {
    const raw = JSON.stringify(assembleStrategicIntelligence(buildStrategicCtx()))
    expect(raw).not.toContain('Depo Katı')
  })

  it('13. WAREHOUSE görünmez', () => {
    const raw = JSON.stringify(assembleStrategicIntelligence(buildStrategicCtx()))
    expect(raw).not.toContain('WAREHOUSE')
  })

  it('14. Build kırılmaz', () => {
    expect(typeof assembleStrategicIntelligence).toBe('function')
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/strategic-intelligence (canlı)', () => {
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

  it.skipIf(() => !schemaReady)('15. Smoke endpoint 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/strategic-intelligence' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(body.summary).toBeTruthy()
    expect(body.companyHealth).toBeTruthy()
    expect(body.boardBriefing).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
  })
})
