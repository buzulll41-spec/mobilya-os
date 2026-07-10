import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { buildAdvisories, type OperationsAdvisorQuery } from '../src/services/getOperationsAdvisor.js'
import {
  aggregateProfitability,
  type ProfitLineInput,
  type ProfitOrderInput,
} from '../src/services/getProfitabilityAnalytics.js'
import { buildForecast } from '../src/services/getForecastEngine.js'
import type { DataQualityResponseDto } from '../src/contracts/dataQualityDto.js'

const TODAY = '2026-05-15'
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

function makeDq(o?: { score?: number; unknown?: number; missingCost?: number }): DataQualityResponseDto {
  return {
    rows: [],
    totals: {
      totalOrders: 0,
      totalRecords: 0,
      cleanRecords: 0,
      problemRecords: 0,
      unknownCount: o?.unknown ?? 0,
      missingCostCount: o?.missingCost ?? 0,
      averageQualityScore: o?.score ?? 100,
    },
    issueCategories: [],
    filters: { from: null, to: null, salesPerson: null, status: null, issueCode: null, q: null },
    currency: 'TRY',
    generatedAt: new Date().toISOString(),
  } as DataQualityResponseDto
}

type SetupOpts = {
  orders?: ProfitOrderInput[]
  dq?: { score?: number; unknown?: number; missingCost?: number }
  delayedShipments?: number
  overdueCount?: number
  shipmentWindows?: { last30: number; last60: number; last90: number }
  query?: OperationsAdvisorQuery
}

function setup(opts: SetupOpts = {}) {
  const orders = opts.orders ?? []
  const monthSrc = aggregateProfitability(orders, { ...MAY, groupBy: 'source' })
  const prevMonthSrc = aggregateProfitability(orders, { ...APR, groupBy: 'source' })
  const supplierRes = aggregateProfitability(orders, { ...MAY, groupBy: 'supplier' })
  const forecast = buildForecast({
    today: TODAY,
    profitOrders: orders,
    shipmentWindows: opts.shipmentWindows ?? { last30: 0, last60: 0, last90: 0 },
    dataQuality: { currentScore: opts.dq?.score ?? 100, previousScore: 100 },
    query: {},
  })
  return buildAdvisories({
    today: TODAY,
    monthSrc,
    prevMonthSrc,
    supplierRes,
    dq: makeDq(opts.dq),
    forecast,
    delayedShipments: opts.delayedShipments ?? 0,
    overdueCount: opts.overdueCount ?? 0,
    query: opts.query ?? {},
  })
}

const has = (res: ReturnType<typeof setup>, id: string) => res.advisories.find((a) => a.id === id)

describe('buildAdvisories — kural motoru', () => {
  it('1. riskli alacak kritik alarmı', () => {
    const orders: ProfitOrderInput[] = [
      { id: 'R1', orderDate: '2026-05-10', salesPerson: 'Furkan', customerName: 'A', paidAmount: 0, remainingAmount: 20000, riskLevel: 'HIGH',
        lines: [line({ lineTotal: 20000, soldUnitCost: 12000, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR', supplierId: 'S1', supplierName: 'Tedarikçi A' })] },
    ]
    const res = setup({ orders })
    const a = has(res, 'risky-receivable')
    expect(a).toBeTruthy()
    expect(a!.severity).toBe('CRITICAL')
    expect(a!.category).toBe('COLLECTION')
    expect(a!.evidence.sharePercent).toBeGreaterThanOrEqual(25)
  })

  it('2. kalite skoru kritik alarmı (<80)', () => {
    const res = setup({ dq: { score: 70 } })
    const a = has(res, 'quality-score')
    expect(a).toBeTruthy()
    expect(a!.severity).toBe('CRITICAL')
    expect(a!.category).toBe('DATA_QUALITY')
  })

  it('3. ZERO_COST (alış maliyeti eksik) kritik alarmı', () => {
    const res = setup({ dq: { missingCost: 4 } })
    const a = has(res, 'zero-cost')
    expect(a).toBeTruthy()
    expect(a!.severity).toBe('CRITICAL')
    expect(a!.evidence.missingCostCount).toBe(4)
  })

  it('4. kâr düşüşü alarmı (geçen aya göre %15+)', () => {
    const orders: ProfitOrderInput[] = [
      // Nisan: aynı kaynak, brüt kâr 10000
      { id: 'A1', orderDate: '2026-04-10', salesPerson: 'Furkan', customerName: 'C', paidAmount: 20000, remainingAmount: 0, riskLevel: 'NONE',
        lines: [line({ lineTotal: 20000, soldUnitCost: 10000, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR' })] },
      // Mayıs: aynı kaynak, brüt kâr 2000 (-80%)
      { id: 'M1', orderDate: '2026-05-10', salesPerson: 'Furkan', customerName: 'A', paidAmount: 5000, remainingAmount: 0, riskLevel: 'NONE',
        lines: [line({ lineTotal: 5000, soldUnitCost: 3000, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR' })] },
    ]
    const res = setup({ orders })
    const a = res.advisories.find((x) => x.id.startsWith('profit-drop:'))
    expect(a).toBeTruthy()
    expect(a!.severity).toBe('WARNING')
    expect(a!.category).toBe('PROFITABILITY')
    expect(Number(a!.evidence.changePercent)).toBeLessThanOrEqual(-15)
  })

  it('5. sevk gecikmesi kritik alarmı (>10)', () => {
    const res = setup({ delayedShipments: 12 })
    const a = has(res, 'shipment-delay')
    expect(a).toBeTruthy()
    expect(a!.severity).toBe('CRITICAL')
    expect(a!.evidence.delayedShipments).toBe(12)
  })

  it('6. satış hedef alarmı (ay sonu < %90)', () => {
    const orders: ProfitOrderInput[] = [
      // Nisan büyük ciro (hedef referansı)
      { id: 'A1', orderDate: '2026-04-10', salesPerson: 'Furkan', customerName: 'C', paidAmount: 100000, remainingAmount: 0, riskLevel: 'NONE',
        lines: [line({ lineTotal: 100000, soldUnitCost: 60000, soldSalesSourceType: 'STOCK_ITEM' })] },
      // Mayıs küçük ciro
      { id: 'M1', orderDate: '2026-05-10', salesPerson: 'Furkan', customerName: 'A', paidAmount: 10000, remainingAmount: 0, riskLevel: 'NONE',
        lines: [line({ lineTotal: 10000, soldUnitCost: 6000, soldSalesSourceType: 'STOCK_ITEM' })] },
    ]
    const res = setup({ orders })
    const a = has(res, 'sales-target-low')
    expect(a).toBeTruthy()
    expect(a!.severity).toBe('WARNING')
    expect(a!.category).toBe('SALES')
    expect(Number(a!.evidence.targetAchievementPct)).toBeLessThan(90)
  })

  it('7. tedarikçi açık bakiye yoğunlaşma alarmı (%30+)', () => {
    const orders: ProfitOrderInput[] = [
      { id: 'M1', orderDate: '2026-05-10', salesPerson: 'Furkan', customerName: 'A', paidAmount: 0, remainingAmount: 30000, riskLevel: 'NONE',
        lines: [line({ lineTotal: 30000, soldUnitCost: 18000, soldSalesSourceType: 'STOCK_ITEM', supplierId: 'S1', supplierName: 'Tedarikçi A' })] },
    ]
    const res = setup({ orders })
    const a = res.advisories.find((x) => x.id.startsWith('supplier-concentration:'))
    expect(a).toBeTruthy()
    expect(a!.severity).toBe('WARNING')
    expect(a!.category).toBe('SUPPLIER')
    expect(Number(a!.evidence.sharePercent)).toBeGreaterThanOrEqual(30)
  })

  it('8. sıralama doğru: CRITICAL → WARNING → INFO', () => {
    const orders: ProfitOrderInput[] = [
      { id: 'R1', orderDate: '2026-05-10', salesPerson: 'Furkan', customerName: 'A', paidAmount: 0, remainingAmount: 20000, riskLevel: 'HIGH',
        lines: [line({ lineTotal: 20000, soldUnitCost: 12000, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR', supplierId: 'S1', supplierName: 'Tedarikçi A' })] },
    ]
    const res = setup({ orders, dq: { score: 75 } })
    const ranks = { CRITICAL: 3, WARNING: 2, INFO: 1 } as const
    const seq = res.advisories.map((a) => ranks[a.severity])
    const sorted = [...seq].sort((a, b) => b - a)
    expect(seq).toEqual(sorted)
    expect(res.advisories[0].severity).toBe('CRITICAL')
  })

  it('9. limit 20 uygulanır', () => {
    const orders: ProfitOrderInput[] = [
      { id: 'R1', orderDate: '2026-05-10', salesPerson: 'Furkan', customerName: 'A', paidAmount: 0, remainingAmount: 50000, riskLevel: 'HIGH',
        lines: [line({ lineTotal: 50000, soldUnitCost: 30000, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR', supplierId: 'S1', supplierName: 'Tedarikçi A' })] },
    ]
    const res = setup({ orders, dq: { score: 60, unknown: 3, missingCost: 2 }, delayedShipments: 12, overdueCount: 5 })
    expect(res.advisories.length).toBeLessThanOrEqual(20)
    expect(res.summary.totalAdvisories).toBe(res.advisories.length)
  })

  it('10. boş veri kırılmaz', () => {
    const res = setup({})
    expect(Array.isArray(res.advisories)).toBe(true)
    expect(res.advisories.length).toBe(0)
    expect(res.summary.totalAdvisories).toBe(0)
    expect(res.summary.topIssue).toBeNull()
  })

  it('12. Depo Katı satış kaynağı olarak görünmez', () => {
    const orders: ProfitOrderInput[] = [
      { id: 'M1', orderDate: '2026-05-10', salesPerson: 'Furkan', customerName: 'A', paidAmount: 0, remainingAmount: 30000, riskLevel: 'HIGH',
        lines: [line({ lineTotal: 30000, soldUnitCost: 18000, soldSalesSourceType: 'STOCK_ITEM', supplierId: 'S1', supplierName: 'Tedarikçi A' })] },
    ]
    const res = setup({ orders, dq: { score: 70, missingCost: 1 } })
    expect(JSON.stringify(res.advisories)).not.toContain('Depo Katı')
    expect(JSON.stringify(res.advisories)).not.toContain('WAREHOUSE')
  })

  it('13. her tavsiyenin kanıt nesnesi dolu', () => {
    const orders: ProfitOrderInput[] = [
      { id: 'R1', orderDate: '2026-05-10', salesPerson: 'Furkan', customerName: 'A', paidAmount: 0, remainingAmount: 20000, riskLevel: 'HIGH',
        lines: [line({ lineTotal: 20000, soldUnitCost: 12000, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR', supplierId: 'S1', supplierName: 'Tedarikçi A' })] },
    ]
    const res = setup({ orders, dq: { score: 75, missingCost: 1 } })
    expect(res.advisories.length).toBeGreaterThan(0)
    for (const a of res.advisories) {
      expect(a.evidence).toBeTruthy()
      expect(Object.keys(a.evidence).length).toBeGreaterThan(0)
      expect(typeof a.createdAt).toBe('string')
    }
  })

  it('14. SALES sınırlı görünüm yalnızca kendi alanı kategorilerini gösterir', () => {
    const orders: ProfitOrderInput[] = [
      { id: 'R1', orderDate: '2026-05-10', salesPerson: 'Furkan', customerName: 'A', paidAmount: 0, remainingAmount: 20000, riskLevel: 'HIGH',
        lines: [line({ lineTotal: 20000, soldUnitCost: 12000, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR', supplierId: 'S1', supplierName: 'Tedarikçi A' })] },
    ]
    const res = setup({ orders, dq: { score: 70, missingCost: 1 }, delayedShipments: 12, query: { limitedView: true, salesPerson: 'Furkan' } })
    const allowed = new Set(['SALES', 'SHIPMENT', 'DATA_QUALITY'])
    for (const a of res.advisories) expect(allowed.has(a.category)).toBe(true)
    expect(res.filters.limitedView).toBe(true)
  })
})

/* ── Canlı smoke (app.inject) ── */

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/operations-advisor (canlı)', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })

  it('11. endpoint 200 ve beklenen şekil', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/operations-advisor' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as any
    expect(body.summary).toBeTruthy()
    expect(Array.isArray(body.advisories)).toBe(true)
    expect(typeof body.summary.totalAdvisories).toBe('number')
    expect(JSON.stringify(body.advisories)).not.toContain('Depo Katı')
  })
})
