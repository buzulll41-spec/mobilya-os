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
import type { CeoGatheredData } from '../src/services/getCeoControlCenter.js'
import {
  assembleOperationsAgentsResponse,
  buildAgentDailyBriefing,
  buildPriorities,
  gatherAgentContext,
  resetAgentRunStore,
  runCollectionAgent,
  runDataQualityAgent,
  runExecutiveAgent,
  runSalesAgent,
  runShipmentAgent,
  runSupplierAgent,
  type AgentContext,
} from '../src/services/operationsAgentsEngine.js'
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

function buildCtx(opts: {
  profitOrders?: ProfitOrderInput[]
  dqRecords?: DataQualityRecordInput[]
  listItems?: SalesOrderListItemDto[]
} = {}): AgentContext {
  const profitOrders = opts.profitOrders ?? PROFIT_ORDERS
  const dq = evaluateDataQuality(opts.dqRecords ?? DQ_RECORDS, {})
  const listItems = opts.listItems ?? [
    listItem({
      id: 'O1',
      customerDisplayName: 'M1',
      remainingAmount: m(8000),
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
  const catRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'category' })
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
    catRes,
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

  return { ...data, runTimestamps: new Map() }
}

describe('runCollectionAgent', () => {
  it('1. Collection Agent works', () => {
    const ctx = buildCtx()
    const res = runCollectionAgent(ctx)
    expect(res.agentCode).toBe('COLLECTION_AGENT')
    expect(res.outputs.length).toBeGreaterThan(0)
    expect(res.outputs.some((o) => o.title.includes('Ara:') || o.title.includes('Riskli'))).toBe(true)
    expect(res.outputs.length).toBeLessThanOrEqual(11)
  })
})

describe('runShipmentAgent', () => {
  it('2. Shipment Agent works', () => {
    const ctx = buildCtx()
    const res = runShipmentAgent(ctx)
    expect(res.agentCode).toBe('SHIPMENT_AGENT')
    expect(res.outputs.some((o) => o.id.startsWith('shipment-delayed') || o.id.startsWith('shipment-ready'))).toBe(true)
  })
})

describe('runDataQualityAgent', () => {
  it('3. Data Quality Agent works', () => {
    const ctx = buildCtx()
    const res = runDataQualityAgent(ctx)
    expect(res.agentCode).toBe('DATA_QUALITY_AGENT')
    expect(res.outputs.some((o) => o.id.includes('zero-cost') || o.id.includes('unknown'))).toBe(true)
  })
})

describe('runSalesAgent', () => {
  it('4. Sales Agent works', () => {
    const ctx = buildCtx()
    const res = runSalesAgent(ctx)
    expect(res.agentCode).toBe('SALES_AGENT')
    expect(Array.isArray(res.outputs)).toBe(true)
  })
})

describe('runSupplierAgent', () => {
  it('5. Supplier Agent works', () => {
    const ctx = buildCtx()
    const res = runSupplierAgent(ctx)
    expect(res.agentCode).toBe('SUPPLIER_AGENT')
    expect(Array.isArray(res.outputs)).toBe(true)
  })
})

describe('runExecutiveAgent', () => {
  it('6. Executive Agent works', () => {
    const ctx = buildCtx()
    const sub = {
      COLLECTION_AGENT: runCollectionAgent(ctx),
      SHIPMENT_AGENT: runShipmentAgent(ctx),
      DATA_QUALITY_AGENT: runDataQualityAgent(ctx),
      SALES_AGENT: runSalesAgent(ctx),
      SUPPLIER_AGENT: runSupplierAgent(ctx),
    }
    const res = runExecutiveAgent(ctx, sub)
    expect(res.agentCode).toBe('EXECUTIVE_AGENT')
    expect(res.outputs.length).toBeGreaterThan(0)
    expect(res.outputs.length).toBeLessThanOrEqual(10)
  })
})

describe('buildAgentDailyBriefing', () => {
  it('7. Daily briefing generated', () => {
    const ctx = buildCtx()
    const sub = {
      COLLECTION_AGENT: runCollectionAgent(ctx),
      SHIPMENT_AGENT: runShipmentAgent(ctx),
      DATA_QUALITY_AGENT: runDataQualityAgent(ctx),
      SALES_AGENT: runSalesAgent(ctx),
      SUPPLIER_AGENT: runSupplierAgent(ctx),
    }
    const priorities = buildPriorities(ctx, sub)
    const briefing = buildAgentDailyBriefing(ctx, priorities, sub)
    expect(briefing.headline).toContain(TODAY)
    expect(briefing.paragraphs.length).toBeGreaterThanOrEqual(3)
    expect(briefing.whatToDoToday.length).toBeGreaterThan(0)
    expect(Array.isArray(briefing.criticalIssues)).toBe(true)
  })
})

describe('buildPriorities', () => {
  it('8. Priorities correctly sorted', () => {
    const ctx = buildCtx()
    const sub = {
      COLLECTION_AGENT: runCollectionAgent(ctx),
      SHIPMENT_AGENT: runShipmentAgent(ctx),
      DATA_QUALITY_AGENT: runDataQualityAgent(ctx),
      SALES_AGENT: runSalesAgent(ctx),
      SUPPLIER_AGENT: runSupplierAgent(ctx),
    }
    const priorities = buildPriorities(ctx, sub)
    expect(priorities.length).toBeGreaterThan(0)
    const ranks = priorities.map((p) => ({ P1: 1, P2: 2, P3: 3 }[p.priority]))
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]!)
    }
    expect(priorities.some((p) => p.priority === 'P1')).toBe(true)
  })
})

describe('assembleOperationsAgentsResponse', () => {
  it('11. Empty data does not break', () => {
    const res = assembleOperationsAgentsResponse(buildCtx({ profitOrders: [], dqRecords: [], listItems: [] }))
    expect(res.summary.totalAgents).toBe(6)
    expect(res.agents.length).toBe(6)
    expect(res.briefing.headline).toBeTruthy()
    expect(Array.isArray(res.priorities)).toBe(true)
  })

  it('12. Depo Katı not in agent output', () => {
    const res = assembleOperationsAgentsResponse(buildCtx())
    const raw = JSON.stringify(res)
    expect(raw).not.toContain('Depo Katı')
    expect(raw).not.toContain('WAREHOUSE')
    for (const rec of res.recommendations) {
      expect(rec.reason).not.toContain('Depo Katı')
      expect(rec.title).not.toContain('Depo Katı')
    }
    for (const p of res.priorities) {
      expect(p.reason).not.toContain('Depo Katı')
    }
  })
})

describe('RBAC — Operations Agents', () => {
  it('13. Permission check', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.OPERATIONS_AGENTS_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.OPERATIONS_AGENTS_RUN)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.OPERATIONS_AGENTS_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.OPERATIONS_AGENTS_RUN)).toBe(true)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.OPERATIONS_AGENTS_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.OPERATIONS_AGENTS_RUN)).toBe(false)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.OPERATIONS_AGENTS_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.OPERATIONS_AGENTS_RUN)).toBe(false)
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/operations-agents (canlı)', () => {
  let app: FastifyInstance
  let schemaReady = false

  beforeAll(async () => {
    resetAgentRunStore()
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

  it.skipIf(() => !schemaReady)('9. Endpoint 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/operations-agents' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as any
    expect(body.summary).toBeTruthy()
    expect(body.agents.length).toBe(6)
    expect(body.briefing).toBeTruthy()
    expect(Array.isArray(body.priorities)).toBe(true)
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
  })

  it.skipIf(() => !schemaReady)('10. Agent run works', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/reports/operations-agents/run' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as any
    expect(body.agents.some((a: any) => a.lastRunAt)).toBe(true)
    expect(body.generatedActions).toBeGreaterThanOrEqual(0)
  })
})

describe.skipIf(!hasDb)('GET /v1/reports/operations-agents RBAC (canlı)', () => {
  let app: FastifyInstance
  let schemaReady = false

  beforeAll(async () => {
    delete process.env.AUTH_DISABLED
    try {
      const { PrismaClient } = await import('@prisma/client')
      const probe = new PrismaClient()
      await probe.user.findFirst({ take: 1 })
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
    process.env.AUTH_DISABLED = 'true'
  })

  it.skipIf(() => !schemaReady)('SALES 403 döner', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'sales1', password: 'sales123' },
    })
    expect(loginRes.statusCode).toBe(200)
    const token = (loginRes.json() as { token: string }).token
    const res = await app.inject({
      method: 'GET',
      url: '/v1/reports/operations-agents',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })
})

describe('Build integrity', () => {
  it('14. Build does not break', async () => {
    expect(typeof gatherAgentContext).toBe('function')
    expect(typeof assembleOperationsAgentsResponse).toBe('function')
  })
})
