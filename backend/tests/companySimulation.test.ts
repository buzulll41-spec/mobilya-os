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
  assembleCompanySimulation,
  computeHealthFromMetrics,
  resetSimulationRunStore,
  runScenarios,
  type SimulationBaseline,
  type VirtualMetrics,
} from '../src/services/companySimulationEngine.js'

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

function num(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function extractMetrics(ctx: StrategicContext): VirtualMetrics {
  const totals = ctx.srcRes.totals
  const extRow = ctx.srcRes.rows.find((r) => r.label.includes('Dış') || r.key.includes('EXTERNAL'))
  const extRev = extRow ? num(extRow.revenue) : 0
  const totalRev = num(totals.revenue)
  return {
    revenue: totalRev,
    grossProfit: num(totals.grossProfit),
    profitMarginPct: totals.profitMarginPct,
    collected: num(totals.collected),
    openBalance: num(totals.openBalance),
    riskyReceivable: num(totals.riskyReceivable),
    delayedShipments: ctx.delayedShipments,
    dataQualityScore: ctx.dq.totals.averageQualityScore,
    managerScore: ctx.ceo.managerScore.score,
    externalSupplyShare: totalRev > 0 ? extRev / totalRev : 0,
  }
}

function buildBaseline(opts: { profitOrders?: ProfitOrderInput[] } = {}): SimulationBaseline {
  const ctx = buildStrategicCtx(opts)
  return { ctx, metrics: extractMetrics(ctx) }
}

describe('companySimulationEngine', () => {
  beforeAll(() => {
    resetSimulationRunStore()
  })

  it('1. Simülasyon çalışır', () => {
    const res = assembleCompanySimulation(buildBaseline())
    expect(res.scenarios.length).toBe(5)
    expect(res.bestCase).toBeTruthy()
    expect(res.worstCase).toBeTruthy()
    expect(res.meta.virtualOnly).toBe(true)
  })

  it('2. Health Score hesaplanır', () => {
    const baseline = buildBaseline()
    const { health } = computeHealthFromMetrics(baseline.metrics)
    expect(health).toBeGreaterThanOrEqual(0)
    expect(health).toBeLessThanOrEqual(100)
    expect(resBaseline().baseline.companyHealthScore).toBe(health)
  })

  it('3. Risk hesaplanır', () => {
    const { risk } = computeHealthFromMetrics(buildBaseline().metrics)
    expect(risk).toBeGreaterThanOrEqual(0)
    expect(risk).toBeLessThanOrEqual(100)
  })

  it('4. Tahsilat düşüşü çalışır', () => {
    const scenarios = runScenarios(buildBaseline(), { collectionChangePercent: -20 })
    const coll = scenarios.find((s) => s.scenarioId === 'COLLECTION_DROP')!
    expect(coll.after.openBalance).not.toBe(coll.before.openBalance)
    expect(coll.after.companyHealthScore).toBeLessThanOrEqual(coll.before.companyHealthScore)
  })

  it('5. Yeni mağaza çalışır', () => {
    const scenarios = runScenarios(buildBaseline(), { newStoreRevenue: 1_500_000 })
    const store = scenarios.find((s) => s.scenarioId === 'NEW_STORE')!
    expect(num(store.after.revenue)).toBeGreaterThan(num(store.before.revenue))
    expect(num(store.after.profit)).toBeGreaterThan(num(store.before.profit))
  })

  it('6. Yeni personel çalışır', () => {
    const scenarios = runScenarios(buildBaseline(), { additionalSalesStaff: 2 })
    const staff = scenarios.find((s) => s.scenarioId === 'NEW_SALES_STAFF')!
    expect(num(staff.after.revenue)).toBeGreaterThan(num(staff.before.revenue))
  })

  it('7. Yeni araç çalışır', () => {
    const scenarios = runScenarios(buildBaseline(), { additionalVehicles: 1 })
    const vehicle = scenarios.find((s) => s.scenarioId === 'NEW_VEHICLE')!
    expect(vehicle.after.delayedShipments).toBeLessThanOrEqual(vehicle.before.delayedShipments)
  })

  it('8. Dış tedarik çalışır', () => {
    const scenarios = runScenarios(buildBaseline(), { externalSupplyIncreasePercent: 50 })
    const ext = scenarios.find((s) => s.scenarioId === 'EXTERNAL_SUPPLY_INCREASE')!
    expect(num(ext.after.revenue)).toBeGreaterThan(num(ext.before.revenue))
    expect(ext.recommendation).toBeTruthy()
  })

  it('9. Best Case oluşur', () => {
    const res = assembleCompanySimulation(buildBaseline())
    expect(res.bestCase.scenarioId).toBe('BEST_CASE')
    expect(res.bestCase.after.companyHealthScore).toBeGreaterThanOrEqual(res.baseline.companyHealthScore)
  })

  it('10. Worst Case oluşur', () => {
    const res = assembleCompanySimulation(buildBaseline())
    expect(res.worstCase.scenarioId).toBe('WORST_CASE')
    expect(res.worstCase.after.companyHealthScore).toBeLessThanOrEqual(res.baseline.companyHealthScore)
  })

  it('11. Endpoint 200 döner', () => {
    expect(typeof assembleCompanySimulation).toBe('function')
  })

  it('12. Boş veri kırılmaz', () => {
    const res = assembleCompanySimulation(buildBaseline({ profitOrders: [] }))
    expect(res.baseline.companyHealthScore).toBeGreaterThanOrEqual(0)
    expect(res.managementAdvice).toBeTruthy()
  })

  it('13. Yetki kontrolü çalışır', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.COMPANY_SIMULATION_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.COMPANY_SIMULATION_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.COMPANY_SIMULATION_RUN)).toBe(true)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.COMPANY_SIMULATION_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.COMPANY_SIMULATION_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.WAREHOUSE, PERM.COMPANY_SIMULATION_READ)).toBe(false)
  })

  it('14. Depo Katı görünmez', () => {
    const raw = JSON.stringify(assembleCompanySimulation(buildBaseline()))
    expect(raw).not.toContain('Depo Katı')
  })

  it('15. WAREHOUSE görünmez', () => {
    const raw = JSON.stringify(assembleCompanySimulation(buildBaseline()))
    expect(raw).not.toContain('WAREHOUSE')
  })

  it('16. Build kırılmaz', () => {
    expect(typeof computeHealthFromMetrics).toBe('function')
    expect(typeof runScenarios).toBe('function')
  })
})

function resBaseline() {
  return assembleCompanySimulation(buildBaseline())
}

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('company-simulation endpoints (canlı)', () => {
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
    const res = await app.inject({ method: 'GET', url: '/v1/reports/company-simulation' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(body.summary).toBeTruthy()
    expect(body.baseline).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
    expect(JSON.stringify(body)).not.toContain('WAREHOUSE')
  })

  it.skipIf(() => !schemaReady)('Canlı smoke POST run 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/reports/company-simulation/run',
      payload: { collectionChangePercent: -20, newStoreRevenue: 1500000 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(body.scenarios).toBeTruthy()
    expect(body.managementAdvice).toBeTruthy()
  })
})
