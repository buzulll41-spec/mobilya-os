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
import {
  assembleCeoControlCenter,
  buildDailyBriefing,
  computeManagerScore,
  mergeTopAlerts,
  type CeoGatheredData,
} from '../src/services/getCeoControlCenter.js'
import type { DataQualityResponseDto } from '../src/contracts/dataQualityDto.js'

const TODAY = '2026-05-14'
const MAY = { from: '2026-05-01', to: '2026-05-31' }
const APR = { from: '2026-04-01', to: '2026-04-30' }

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
    id: 'O1', orderDate: TODAY, salesPerson: 'Ayşe', customerName: 'M1', paidAmount: 20000, remainingAmount: 0, riskLevel: 'NONE',
    lines: [line({ lineTotal: 20000, qtyOrdered: 1, soldUnitCost: 12000, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR', supplierName: 'Marka A', category: 'Koltuk', productId: 'P1', productTitle: 'Koltuk X' })],
  },
  {
    id: 'O2', orderDate: '2026-05-10', salesPerson: 'Mehmet', customerName: 'M2', paidAmount: 5000, remainingAmount: 5000, riskLevel: 'NONE',
    lines: [line({ lineTotal: 10000, qtyOrdered: 2, soldUnitCost: 3000, soldSalesSourceType: 'EXTERNAL_SUPPLY', soldExternalSupplyType: 'CATALOG', supplierName: 'Marka B', category: 'Masa', productId: 'P2', productTitle: 'Masa Y' })],
  },
  {
    id: 'O3', orderDate: '2026-05-02', salesPerson: 'Ayşe', customerName: 'M3', paidAmount: 0, remainingAmount: 8000, riskLevel: 'HIGH',
    lines: [line({ lineTotal: 8000, qtyOrdered: 1, soldUnitCost: 5000, soldSalesSourceType: 'STOCK_ITEM', supplierName: 'Marka A', category: 'Koltuk', productId: 'P1', productTitle: 'Koltuk X' })],
  },
]

const DQ_RECORDS: DataQualityRecordInput[] = [
  { orderLineId: 'l1', orderId: 'O1', orderDate: TODAY, customerName: 'M1', productTitle: 'Koltuk X', salesPerson: 'Ayşe', soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR', soldExternalSupplyType: null, soldUnitCost: 12000 },
  { orderLineId: 'l2', orderId: 'O2', orderDate: '2026-05-10', customerName: 'M2', productTitle: 'Masa Y', salesPerson: 'Mehmet', soldSalesSourceType: 'EXTERNAL_SUPPLY', soldDisplayFloor: null, soldExternalSupplyType: 'CATALOG', soldUnitCost: 3000 },
  { orderLineId: 'l3', orderId: 'O3', orderDate: '2026-05-02', customerName: 'M3', productTitle: 'Koltuk X', salesPerson: 'Ayşe', soldSalesSourceType: 'UNKNOWN', soldDisplayFloor: null, soldExternalSupplyType: null, soldUnitCost: 0 },
]

function listItem(over: Record<string, unknown>) {
  return {
    id: 'O1',
    orderNumber: 'SO-1',
    customerDisplayName: 'M1',
    totalAmount: { amount: '20000.00', currency: 'TRY' },
    remainingAmount: { amount: '0.00', currency: 'TRY' },
    currentRiskSeverity: 'NONE',
    displayStatus: 'Bekleniyor',
    plannedShipmentDate: null,
    salesPerson: 'Ayşe',
    openMissingItemsCount: 0,
    hasOverdueBalance: false,
    ...over,
  } as any
}

const LIST_ITEMS = [
  listItem({ id: 'O1', orderNumber: 'SO-1', displayStatus: 'Hazır' }),
  listItem({ id: 'O2', orderNumber: 'SO-2', customerDisplayName: 'M2', totalAmount: { amount: '10000.00', currency: 'TRY' }, remainingAmount: { amount: '5000.00', currency: 'TRY' }, displayStatus: 'Üretimde', plannedShipmentDate: '2026-05-01', currentRiskSeverity: 'MEDIUM', salesPerson: 'Mehmet' }),
  listItem({ id: 'O3', orderNumber: 'SO-3', customerDisplayName: 'M3', totalAmount: { amount: '8000.00', currency: 'TRY' }, remainingAmount: { amount: '8000.00', currency: 'TRY' }, displayStatus: 'Eksik Var', plannedShipmentDate: '2026-05-20', currentRiskSeverity: 'HIGH', openMissingItemsCount: 2, hasOverdueBalance: true }),
]

function buildGathered(opts: {
  profitOrders?: ProfitOrderInput[]
  dqRecords?: DataQualityRecordInput[]
  listItems?: any[]
  delayedShipments?: number
  pendingShipmentCount?: number
} = {}): CeoGatheredData {
  const profitOrders = opts.profitOrders ?? PROFIT_ORDERS
  const listItems = opts.listItems ?? LIST_ITEMS
  const dq = evaluateDataQuality(opts.dqRecords ?? DQ_RECORDS, {})
  const srcRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'source' })
  const catRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'category' })
  const personRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'salesPerson' })
  const prevMonthSrc = aggregateProfitability(profitOrders, { ...APR, groupBy: 'source' })
  const supplierRes = aggregateProfitability(profitOrders, { ...MAY, groupBy: 'supplier' })
  const forecast = buildForecast({
    today: TODAY,
    profitOrders,
    shipmentWindows: { last30: 5, last60: 10, last90: 15 },
    dataQuality: { currentScore: dq.totals.averageQualityScore, previousScore: 95 },
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
    paymentsTodayTotal: 15000,
    crewByOrder: new Map(),
    query: {},
  })
  let delayedShipments = opts.delayedShipments ?? 0
  let pendingShipmentCount = opts.pendingShipmentCount ?? 0
  let overdueCount = 0
  if (opts.delayedShipments === undefined || opts.pendingShipmentCount === undefined) {
    delayedShipments = 0
    pendingShipmentCount = 0
    for (const it of listItems) {
      const delivered = it.displayStatus === 'Teslim Edildi'
      if (!delivered) pendingShipmentCount += 1
      if (!delivered && it.plannedShipmentDate && it.plannedShipmentDate < TODAY) delayedShipments += 1
      if (it.hasOverdueBalance) overdueCount += 1
    }
  }
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
  const businessRules = getBusinessRules({})

  return {
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
    paymentsTodayTotal: 15000,
    crewByOrder: new Map(),
    delayedShipments,
    overdueCount,
    pendingShipmentCount,
    forecast,
    cockpit,
    advisories,
    actionResult,
    caseResult,
    jobResult,
    businessRules,
  }
}

describe('computeManagerScore', () => {
  it('1. bileşen ağırlıkları ve bantlar doğru', () => {
    const data = buildGathered()
    const p1Cases = data.caseResult.cases.filter((c) => c.priority === 'P1').length
    const score = computeManagerScore({
      srcRes: data.srcRes,
      dq: data.dq,
      forecast: data.forecast,
      actionResult: data.actionResult,
      delayedShipments: data.delayedShipments,
      p1Cases,
    })
    expect(score.score).toBeGreaterThanOrEqual(0)
    expect(score.score).toBeLessThanOrEqual(100)
    expect(score.components.profitMargin.weight).toBe(20)
    expect(score.components.collectionRatio.weight).toBe(20)
    expect(score.components.riskyReceivableShare.weight).toBe(15)
    expect(score.components.operationsDiscipline.weight).toBe(15)
    expect(score.components.taskCompletion.weight).toBe(10)
    expect(score.components.dataQuality.weight).toBe(10)
    expect(score.components.monthEndTarget.weight).toBe(10)
    expect(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']).toContain(score.band)
    expect(score.bandLabel).toBeTruthy()
  })

  it('2. yüksek gecikme operasyon disiplinini düşürür', () => {
    const data = buildGathered()
    const base = computeManagerScore({
      srcRes: data.srcRes,
      dq: data.dq,
      forecast: data.forecast,
      actionResult: data.actionResult,
      delayedShipments: 0,
      p1Cases: 0,
    })
    const stressed = computeManagerScore({
      srcRes: data.srcRes,
      dq: data.dq,
      forecast: data.forecast,
      actionResult: data.actionResult,
      delayedShipments: 10,
      p1Cases: 5,
    })
    expect(stressed.components.operationsDiscipline.rawScore).toBeLessThan(base.components.operationsDiscipline.rawScore)
    expect(stressed.score).toBeLessThan(base.score)
  })
})

describe('buildDailyBriefing', () => {
  it('3. deterministik şablon üretir', () => {
    const data = buildGathered()
    const assembled = assembleCeoControlCenter(data)
    const again = buildDailyBriefing({
      today: data.today,
      managerScore: assembled.managerScore,
      cockpit: data.cockpit,
      finance: assembled.finance,
      operations: assembled.operationsHealth,
      topAlerts: assembled.topAlerts,
    })
    expect(again.headline).toContain(TODAY)
    expect(again.headline).toContain(String(assembled.managerScore.score))
    expect(again.paragraphs.length).toBeGreaterThanOrEqual(3)
    expect(again.highlights.length).toBe(4)
  })
})

describe('mergeTopAlerts', () => {
  it('4. en fazla 10 uyarı ve öncelik sırası', () => {
    const data = buildGathered()
    const alerts = mergeTopAlerts({
      advisories: data.advisories,
      cockpit: data.cockpit,
      forecast: data.forecast,
      actionResult: data.actionResult,
      businessRules: data.businessRules,
    })
    expect(alerts.length).toBeLessThanOrEqual(10)
    if (alerts.length >= 2) {
      const rank = { CRITICAL: 3, WARNING: 2, INFO: 1 }
      expect(rank[alerts[0].severity]).toBeGreaterThanOrEqual(rank[alerts[1].severity])
    }
    for (const a of alerts) {
      expect(a.id).toBeTruthy()
      expect(a.title).toBeTruthy()
      expect(a.message).toBeTruthy()
    }
  })
})

describe('assembleCeoControlCenter', () => {
  it('5. tam DTO şekli ve finans alanları', () => {
    const res = assembleCeoControlCenter(buildGathered())
    expect(res.managerScore).toBeTruthy()
    expect(res.dailyBriefing).toBeTruthy()
    expect(res.finance.collected).toBeTruthy()
    expect(res.finance.openBalance).toBeTruthy()
    expect(res.operationsHealth.pendingShipmentCount).toBe(3)
    expect(res.peopleRisk).toBeTruthy()
    expect(res.automation).toBeTruthy()
    expect(Array.isArray(res.topAlerts)).toBe(true)
    expect(res.currency).toBe('TRY')
    expect(res.today).toBe(TODAY)
  })

  it('6. boş veri kırılmaz', () => {
    const res = assembleCeoControlCenter(buildGathered({ profitOrders: [], dqRecords: [], listItems: [] }))
    expect(res.managerScore.score).toBeGreaterThanOrEqual(0)
    expect(res.finance.monthRevenue).toBeTruthy()
    expect(res.operationsHealth.pendingShipmentCount).toBe(0)
    expect(Array.isArray(res.topAlerts)).toBe(true)
  })

  it('7. Depo Katı satış kaynağı olarak görünmez', () => {
    const res = assembleCeoControlCenter(buildGathered())
    const raw = JSON.stringify(res)
    expect(raw).not.toContain('Depo Katı')
    expect(raw).not.toContain('WAREHOUSE')
    const labels = [
      res.peopleRisk.topSalesPerson?.label,
      res.peopleRisk.bottomSalesPerson?.label,
      res.peopleRisk.riskiestSource?.label,
      res.peopleRisk.highestOpenBalanceSource?.label,
      ...res.peopleRisk.staffForecast.map((s) => s.label),
    ]
    expect(labels.includes('Depo Katı')).toBe(false)
    expect(res.topAlerts.every((a) => !a.message.includes('Depo Katı'))).toBe(true)
  })
})

describe('RBAC — CEO Kontrol Merkezi', () => {
  it('8. ADMIN ve MANAGER erişebilir, SALES erişemez', () => {
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.CEO_CONTROL_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.MANAGER, PERM.CEO_CONTROL_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.CEO_CONTROL_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.CEO_CONTROL_READ)).toBe(false)
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/ceo-control-center (canlı)', () => {
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

  it.skipIf(() => !schemaReady)('9. endpoint 200 ve beklenen şekil (AUTH_DISABLED)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/ceo-control-center' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as any
    expect(body.managerScore).toBeTruthy()
    expect(body.dailyBriefing).toBeTruthy()
    expect(body.finance.collected).toBeTruthy()
    expect(body.finance.openBalance).toBeTruthy()
    expect(body.operationsHealth.pendingShipmentCount).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(body.topAlerts)).toBe(true)
    expect(body.topAlerts.length).toBeLessThanOrEqual(10)
    expect(JSON.stringify(body)).not.toContain('Depo Katı')
  })
})

describe.skipIf(!hasDb)('GET /v1/reports/ceo-control-center RBAC (canlı)', () => {
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

  it.skipIf(() => !schemaReady)('10. SALES 403 döner', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'sales@mobilya.local', password: 'sales123' },
    })
    expect(loginRes.statusCode).toBe(200)
    const token = (loginRes.json() as { token: string }).token
    const res = await app.inject({
      method: 'GET',
      url: '/v1/reports/ceo-control-center',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })
})
