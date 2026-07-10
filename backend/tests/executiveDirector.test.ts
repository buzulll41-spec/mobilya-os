import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
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
  assembleOperationsAgentsResponse,
  type AgentContext,
} from '../src/services/operationsAgentsEngine.js'
import {
  assembleExecutiveDirectorResponse,
  buildDailyPlan,
  buildExecutiveAgenda,
  buildExecutiveBriefing,
  buildImpactAnalysis,
  buildPriorityQueue,
  buildRiskMap,
  resetDirectorRunStore,
  type DirectorContext,
} from '../src/services/executiveDirectorEngine.js'
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
        supplierName: 'Marka A',
      }),
    ],
  },
  {
    id: 'O2',
    orderDate: '2026-05-10',
    salesPerson: 'Mehmet',
    customerName: 'M2',
    paidAmount: 5000,
    remainingAmount: 5000,
    riskLevel: 'CRITICAL',
    lines: [
      line({
        lineTotal: 10000,
        soldUnitCost: 3000,
        soldSalesSourceType: 'EXTERNAL_SUPPLY',
        soldExternalSupplyType: 'CATALOG',
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
  {
    orderLineId: 'l2',
    orderId: 'O2',
    orderDate: '2026-05-10',
    customerName: 'M2',
    productTitle: 'Masa Y',
    salesPerson: 'Mehmet',
    soldSalesSourceType: 'UNKNOWN',
    soldDisplayFloor: null,
    soldExternalSupplyType: null,
    soldUnitCost: 3000,
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

function buildDirector(opts: {
  profitOrders?: ProfitOrderInput[]
  dqRecords?: DataQualityRecordInput[]
  listItems?: SalesOrderListItemDto[]
} = {}): DirectorContext {
  const profitOrders = opts.profitOrders ?? PROFIT_ORDERS
  const dq = evaluateDataQuality(opts.dqRecords ?? DQ_RECORDS, {})
  const listItems = opts.listItems ?? [
    listItem({
      id: 'O1',
      customerDisplayName: 'Kısmi Sevk A.Ş.',
      remainingAmount: m(125000),
      currentRiskSeverity: 'HIGH',
      hasOverdueBalance: true,
      plannedShipmentDate: '2026-05-10',
      displayStatus: 'Üretimde',
    }),
    listItem({
      id: 'O2',
      customerDisplayName: 'M2',
      remainingAmount: m(5000),
      currentRiskSeverity: 'CRITICAL',
      displayStatus: 'Hazır',
      plannedShipmentDate: '2026-05-16',
    }),
  ]

  let delayedShipments = 0
  let overdueCount = 0
  for (const it of listItems) {
    const delivered = it.displayStatus === 'Teslim Edildi'
    if (!delivered && it.plannedShipmentDate && it.plannedShipmentDate < TODAY) delayedShipments += 1
    if (it.hasOverdueBalance) overdueCount += 1
  }

  const srcRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'source' })
  const personRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'salesPerson' })
  const prevMonthSrc = aggregateProfitability(profitOrders, { ...APR, groupBy: 'source' })
  const supplierRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'supplier' })

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
    pendingShipmentCount: listItems.filter((i) => i.displayStatus !== 'Teslim Edildi').length,
    forecast,
    cockpit,
    advisories,
    actionResult,
    caseResult,
    jobResult,
    businessRules: getBusinessRules({}),
  }

  const ctx: AgentContext = { ...data, runTimestamps: new Map() }
  const ceo = assembleCeoControlCenter(data)
  const agents = assembleOperationsAgentsResponse(ctx)
  return { ctx, ceo, agents, lastRunAt: null }
}

describe('executiveDirectorEngine', () => {
  beforeEach(() => resetDirectorRunStore())

  it('1. Günlük plan oluşur', () => {
    const d = buildDirector()
    const plan = buildDailyPlan(d.agents, d.ceo)
    expect(plan.length).toBeGreaterThan(0)
    expect(plan.some((s) => s.items.length > 0)).toBe(true)
    expect(plan.some((s) => s.categoryLabel === 'Tahsilat' || s.categoryLabel === 'Veri Kalitesi')).toBe(true)
  })

  it('2. Brifing oluşur', () => {
    const d = buildDirector()
    const plan = buildDailyPlan(d.agents, d.ceo)
    const riskMap = buildRiskMap(d.agents, d.ceo)
    const res = assembleExecutiveDirectorResponse(d)
    const briefing = buildExecutiveBriefing(d, plan, riskMap, res.recommendedActions)
    expect(briefing.headline).toBeTruthy()
    expect(briefing.criticalTopics.length).toBeGreaterThan(0)
    expect(briefing.todayPlan.length).toBeGreaterThan(0)
    expect(res.executiveBriefing.headline).toBeTruthy()
  })

  it('3. Öncelik sıralaması doğru', () => {
    const d = buildDirector()
    const queue = buildPriorityQueue(d.agents)
    expect(queue.length).toBeGreaterThan(0)
    expect(queue.length).toBeLessThanOrEqual(20)
    const ranks = queue.map((p) => (p.priority === 'P1' ? 1 : p.priority === 'P2' ? 2 : 3))
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]!)
    }
  })

  it('4. Risk haritası oluşur', () => {
    const d = buildDirector()
    const riskMap = buildRiskMap(d.agents, d.ceo)
    expect(riskMap.length).toBeGreaterThan(0)
    expect(riskMap.length).toBeLessThanOrEqual(10)
    expect(riskMap[0]!.riskTitle).toBeTruthy()
    expect(riskMap[0]!.suggestedAction).toBeTruthy()
  })

  it('5. Etki analizi oluşur', () => {
    const d = buildDirector()
    const impact = buildImpactAnalysis(d)
    expect(impact.length).toBeGreaterThan(0)
    expect(impact[0]!.metrics.length).toBeGreaterThan(0)
    expect(impact.some((i) => i.metrics.length > 0)).toBe(true)
  })

  it('6. Yönetici ajandası oluşur', () => {
    const d = buildDirector()
    const plan = buildDailyPlan(d.agents, d.ceo)
    const agenda = buildExecutiveAgenda(plan, d)
    expect(agenda.length).toBeGreaterThan(0)
    expect(agenda[0]!.timeRange).toMatch(/\d{2}:\d{2}/)
    expect(agenda[0]!.focus).toBeTruthy()
  })

  it('7. Montaj tam DTO döner', () => {
    const res = assembleExecutiveDirectorResponse(buildDirector())
    expect(res.summary.managerScore).toBeGreaterThanOrEqual(0)
    expect(res.summary.managerScore).toBeLessThanOrEqual(100)
    expect(res.dailyPlan.length).toBeGreaterThan(0)
    expect(res.priorityQueue.length).toBeGreaterThan(0)
    expect(res.impactAnalysis.length).toBeGreaterThan(0)
    expect(res.riskMap.length).toBeGreaterThan(0)
    expect(res.executiveAgenda.length).toBeGreaterThan(0)
    expect(res.recommendedActions.length).toBeGreaterThan(0)
    expect(res.meta.depoKatiExcluded).toBe(true)
  })

  it('8. Boş veri kırılmaz', () => {
    const d = buildDirector({ profitOrders: [], dqRecords: [], listItems: [] })
    const res = assembleExecutiveDirectorResponse(d)
    expect(res.dailyPlan.length).toBeGreaterThan(0)
    expect(res.executiveBriefing.headline).toBeTruthy()
    expect(res.summary.managerScore).toBeGreaterThanOrEqual(0)
  })

  it('9. Yetki kontrolü', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.EXECUTIVE_DIRECTOR_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.EXECUTIVE_DIRECTOR_RUN)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.EXECUTIVE_DIRECTOR_RUN)).toBe(true)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.EXECUTIVE_DIRECTOR_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.EXECUTIVE_DIRECTOR_RUN)).toBe(false)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.EXECUTIVE_DIRECTOR_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.EXECUTIVE_DIRECTOR_RUN)).toBe(false)
  })

  it('10. Depo Katı görünmez', () => {
    const res = assembleExecutiveDirectorResponse(buildDirector())
    const raw = JSON.stringify(res)
    expect(raw).not.toContain('Depo Katı')
    expect(raw).not.toContain('WAREHOUSE')
  })

  it('11. Build kırılmaz', () => {
    expect(typeof assembleExecutiveDirectorResponse).toBe('function')
    expect(typeof buildImpactAnalysis).toBe('function')
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET/POST /v1/reports/executive-director (canlı)', () => {
  let app: FastifyInstance
  let schemaReady = false

  beforeAll(async () => {
    resetDirectorRunStore()
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

  it.skipIf(() => !schemaReady)('Endpoint 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/executive-director' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(body.dailyPlan).toBeTruthy()
    expect(body.executiveBriefing).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
  })

  it.skipIf(() => !schemaReady)('Run çalışır', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/reports/executive-director/run' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { summary?: { lastRunAt?: string } }
    expect(body.summary?.lastRunAt).toBeTruthy()
  })
})
