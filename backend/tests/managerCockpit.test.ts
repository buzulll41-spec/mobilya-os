import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import {
  aggregateProfitability,
  type ProfitLineInput,
  type ProfitOrderInput,
} from '../src/services/getProfitabilityAnalytics.js'
import { evaluateDataQuality, type DataQualityRecordInput } from '../src/services/getDataQualityReport.js'
import { assembleManagerCockpit, type ManagerCockpitQuery } from '../src/services/getManagerCockpit.js'

const TODAY = '2026-05-14'

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

function build(query: ManagerCockpitQuery = {}, opts: { listItems?: any[]; profitOrders?: ProfitOrderInput[]; dq?: DataQualityRecordInput[]; paymentsToday?: number } = {}) {
  const profitOrders = opts.profitOrders ?? PROFIT_ORDERS
  const srcRes = aggregateProfitability(profitOrders, { ...query, groupBy: 'source' })
  const catRes = aggregateProfitability(profitOrders, { ...query, groupBy: 'category' })
  const dq = evaluateDataQuality(opts.dq ?? DQ_RECORDS, {})
  return assembleManagerCockpit({
    today: TODAY,
    monthFrom: '2026-05-01',
    monthTo: '2026-05-31',
    profitOrders,
    srcRes,
    catRes,
    dq,
    listItems: opts.listItems ?? LIST_ITEMS,
    paymentsTodayTotal: opts.paymentsToday ?? 12500,
    crewByOrder: new Map([['O3', 'Montaj Ekibi 1']]),
    query,
  })
}

const M = (s: string) => Number.parseFloat(s)

describe('assembleManagerCockpit', () => {
  it('1. summary doğru hesaplanır', () => {
    const c = build()
    expect(M(c.summary.monthRevenue)).toBe(38000)
    expect(M(c.summary.monthGrossProfit)).toBe(15000)
    expect(c.summary.dataQualityScore).toBeGreaterThan(0)
  })

  it('2. bugünkü satış ve tahsilat ayrılır', () => {
    const c = build()
    expect(M(c.summary.todaySales)).toBe(20000) // sadece O1 bugün
    expect(c.todayOperations.ordersToday).toBe(1)
    expect(M(c.todayOperations.collectionToday)).toBe(12500)
  })

  it('3. kârlılık özetleri Faz 5A ile uyumlu', () => {
    const c = build()
    const src = aggregateProfitability(PROFIT_ORDERS, { groupBy: 'source' })
    expect(c.profitabilityHighlights.topProfitSource?.label).toBe(src.breakdowns.source[0].label)
    expect(c.profitabilityHighlights.topProfitSalesPerson?.label).toBe('Ayşe')
  })

  it('4. veri kalite skorları Faz 4 ile uyumlu', () => {
    const c = build()
    const dq = evaluateDataQuality(DQ_RECORDS, {})
    expect(c.dataQualityHighlights.unknownCount).toBe(dq.totals.unknownCount)
    expect(c.dataQualityHighlights.averageQualityScore).toBe(dq.totals.averageQualityScore)
    expect(c.dataQualityHighlights.missingCostCount).toBe(dq.totals.missingCostCount)
  })

  it('5. kritik sipariş listesi 20 ile limitlenir', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      listItem({ id: `X${i}`, orderNumber: `SO-${i}`, currentRiskSeverity: 'HIGH', remainingAmount: { amount: '5000.00', currency: 'TRY' } }),
    )
    const c = build({}, { listItems: many })
    expect(c.criticalOrders.length).toBe(20)
  })

  it('6. bekleyen sevk listesi 20 ile limitlenir', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      listItem({ id: `Y${i}`, orderNumber: `SO-${i}`, displayStatus: 'Üretimde', plannedShipmentDate: '2026-05-20' }),
    )
    const c = build({}, { listItems: many })
    expect(c.pendingShipments.length).toBe(20)
  })

  it('7. riskli alacak doğru gelir', () => {
    const c = build()
    expect(M(c.summary.riskyReceivable)).toBe(8000) // O3 HIGH
  })

  it('8. manager alert üretimi çalışır', () => {
    const c = build()
    expect(c.managerAlerts.length).toBeGreaterThan(0)
    expect(c.managerAlerts.some((a) => a.message.includes('en yüksek brüt kâr'))).toBe(true)
    // O3'te 0 maliyet → eksik maliyet uyarısı
    expect(c.managerAlerts.some((a) => a.message.includes('alış maliyeti eksik'))).toBe(true)
  })

  it('9. boş veri durumunda ekran kırılmaz', () => {
    const c = build({}, { profitOrders: [], dq: [], listItems: [], paymentsToday: 0 })
    expect(M(c.summary.monthRevenue)).toBe(0)
    expect(c.criticalOrders).toEqual([])
    expect(c.pendingShipments).toEqual([])
    expect(c.profitabilityHighlights.topProfitSource).toBeNull()
  })

  it('10. Depo Katı satış kaynağı olarak görünmez', () => {
    const c = build()
    const labels = [
      c.profitabilityHighlights.topProfitSource?.label,
      c.profitabilityHighlights.riskiestSource?.label,
      c.profitabilityHighlights.lowestMarginSource?.label,
      c.profitabilityHighlights.highestOpenBalanceSource?.label,
    ]
    expect(labels.includes('Depo Katı')).toBe(false)
  })

  it('11. SALES sınırlı görünüm: personel kârı ve hassas alanlar gizlenir', () => {
    const c = build({ limitedView: true })
    expect(c.profitabilityHighlights.topProfitSalesPerson).toBeNull()
    const co = c.criticalOrders[0]
    if (co) {
      expect(co.salesPerson).toBeNull()
      expect(co.grossProfit).toBe('')
    }
  })

  it('kritik sipariş problem etiketleri doğru', () => {
    const c = build()
    const o3 = c.criticalOrders.find((r) => r.orderId === 'O3')
    expect(o3).toBeTruthy()
    expect(o3?.problems).toContain('Eksik ürün var')
    expect(o3?.problems).toContain('Yüksek risk')
  })
})

/* ── Canlı smoke (app.inject) ── */

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/manager-cockpit (canlı)', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })

  it('12. endpoint 200 ve beklenen şekil', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/manager-cockpit' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as any
    expect(body.summary).toBeTruthy()
    expect(body.profitabilityHighlights).toBeTruthy()
    expect(body.dataQualityHighlights).toBeTruthy()
    expect(Array.isArray(body.criticalOrders)).toBe(true)
    expect(Array.isArray(body.pendingShipments)).toBe(true)
    expect(Array.isArray(body.managerAlerts)).toBe(true)
    expect(body.criticalOrders.length).toBeLessThanOrEqual(20)
    const srcLabel = body.profitabilityHighlights.topProfitSource?.label
    expect(srcLabel).not.toBe('Depo Katı')
  })
})
