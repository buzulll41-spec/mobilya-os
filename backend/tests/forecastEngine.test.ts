import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import {
  buildForecast,
  type BuildForecastArgs,
} from '../src/services/getForecastEngine.js'
import type { ProfitLineInput, ProfitOrderInput } from '../src/services/getProfitabilityAnalytics.js'

const TODAY = '2026-05-15' // ayın 15'i → elapsed=15, total=31

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

// Bu ay (Mayıs) + geçen ay (Nisan) + pencere verisi
const ORDERS: ProfitOrderInput[] = [
  // Bu ay (15 günde 31000 ciro, 12400 brüt kâr)
  { id: 'M1', orderDate: '2026-05-03', salesPerson: 'Furkan', customerName: 'A', paidAmount: 20000, remainingAmount: 0, riskLevel: 'NONE',
    lines: [line({ lineTotal: 20000, qtyOrdered: 1, soldUnitCost: 12000, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR', category: 'Koltuk', productId: 'P1', productTitle: 'Koltuk' })] },
  { id: 'M2', orderDate: '2026-05-12', salesPerson: 'Ayşe', customerName: 'B', paidAmount: 0, remainingAmount: 11000, riskLevel: 'HIGH',
    lines: [line({ lineTotal: 11000, qtyOrdered: 1, soldUnitCost: 6600, soldSalesSourceType: 'EXTERNAL_SUPPLY', soldExternalSupplyType: 'CATALOG', category: 'Masa', productId: 'P2', productTitle: 'Masa' })] },
  // Geçen ay (Nisan) — personel hedefi/şirket hedefi referansı
  { id: 'A1', orderDate: '2026-04-10', salesPerson: 'Furkan', customerName: 'C', paidAmount: 10000, remainingAmount: 0, riskLevel: 'NONE',
    lines: [line({ lineTotal: 10000, qtyOrdered: 1, soldUnitCost: 6000, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR', category: 'Koltuk', productId: 'P1', productTitle: 'Koltuk' })] },
  { id: 'A2', orderDate: '2026-04-15', salesPerson: 'Ayşe', customerName: 'D', paidAmount: 9000, remainingAmount: 0, riskLevel: 'NONE',
    lines: [line({ lineTotal: 9000, qtyOrdered: 1, soldUnitCost: 5000, soldSalesSourceType: 'STOCK_ITEM', category: 'Sehpa', productId: 'P3', productTitle: 'Sehpa' })] },
]

function build(extra: Partial<BuildForecastArgs> = {}): ReturnType<typeof buildForecast> {
  return buildForecast({
    today: TODAY,
    profitOrders: ORDERS,
    shipmentWindows: { last30: 30, last60: 48, last90: 63 },
    dataQuality: { currentScore: 78, previousScore: 90 },
    query: {},
    ...extra,
  })
}

const M = (s: string) => Number.parseFloat(s)

describe('buildForecast', () => {
  it('1. ay sonu ciro tahmini = mevcut/elapsed×total', () => {
    const f = build()
    // mevcut ay ciro 31000, elapsed 15, total 31 → 31000/15*31 ≈ 64066.67
    expect(M(f.salesForecast.current)).toBe(31000)
    expect(M(f.salesForecast.projected)).toBeCloseTo((31000 / 15) * 31, 0)
    expect(f.summary.elapsedDays).toBe(15)
    expect(f.summary.totalDays).toBe(31)
  })

  it('2. ay sonu brüt kâr tahmini', () => {
    const f = build()
    // brüt kâr 12400 → /15*31
    expect(M(f.profitForecast.gross.current)).toBe(12400)
    expect(M(f.profitForecast.gross.projected)).toBeCloseTo((12400 / 15) * 31, 0)
  })

  it('3. tahsilat tahmini', () => {
    const f = build()
    expect(M(f.collectionForecast.current)).toBe(20000) // sadece M1 ödendi
    expect(M(f.collectionForecast.projected)).toBeCloseTo((20000 / 15) * 31, 0)
  })

  it('4. riskli alacak tahmini', () => {
    const f = build()
    // M2 HIGH, açık 11000 → riskli alacak current 11000
    expect(M(f.riskForecast.expectedRiskyReceivable)).toBeCloseTo((11000 / 15) * 31, 0)
    expect(f.riskForecast.shareOfOpenPct).toBeGreaterThan(0)
  })

  it('5. trend hesaplama UP/DOWN/FLAT', () => {
    const f = build()
    expect(['UP', 'DOWN', 'FLAT']).toContain(f.sourceTrends[0]?.trend)
  })

  it('6. personel hedef tahmini (hedef = geçen ay)', () => {
    const f = build()
    const furkan = f.staffForecast.find((s) => s.label === 'Furkan')
    expect(furkan).toBeTruthy()
    expect(M(furkan!.target)).toBe(10000) // Nisan
    expect(M(furkan!.currentSales)).toBe(20000) // Mayıs
    expect(['HEDEF_ALTINDA', 'HEDEFE_YAKIN', 'HEDEF_USTU']).toContain(furkan!.status)
    expect(furkan!.status).toBe('HEDEF_USTU') // 20000/15*31 ≈ 41333 vs 10000
  })

  it('7. sevk yoğunluğu', () => {
    const f = build()
    // last30=30 → günlük 1 → hafta 7 → MEDIUM
    expect(f.shipmentForecast.expectedNextWeek).toBe(7)
    expect(f.shipmentForecast.intensity).toBe('MEDIUM')
  })

  it('8. veri kalite trendi DOWN', () => {
    const f = build()
    expect(f.dataQualityTrend.change).toBe(-12)
    expect(f.dataQualityTrend.trend).toBe('DOWN')
  })

  it('9. alert üretimi', () => {
    const f = build()
    expect(f.alerts.length).toBeGreaterThan(0)
    expect(f.alerts.some((a) => a.message.includes('Ay sonu ciro'))).toBe(true)
    expect(f.alerts.some((a) => a.message.includes('Veri kalite skoru'))).toBe(true)
    expect(f.alerts.some((a) => a.message.includes('hedefini aşacak'))).toBe(true)
  })

  it('10. boş veri kırılmaz', () => {
    const f = build({ profitOrders: [], shipmentWindows: { last30: 0, last60: 0, last90: 0 }, dataQuality: { currentScore: 0, previousScore: 0 } })
    expect(M(f.salesForecast.projected)).toBe(0)
    expect(f.staffForecast).toEqual([])
    expect(f.sourceTrends).toEqual([])
  })

  it('11. SALES görünüm kısıtı: yalnızca kendi satışları', () => {
    const f = build({ query: { salesPerson: 'Furkan', limitedView: true } })
    expect(f.staffForecast.length).toBe(1)
    expect(f.staffForecast[0].label).toBe('Furkan')
    expect(f.filters.limitedView).toBe(true)
    // ciro yalnızca Furkan'ın bu ay satışı
    expect(M(f.salesForecast.current)).toBe(20000)
  })

  it('13. Depo Katı satış kaynağı olarak görünmez', () => {
    const f = build()
    expect(f.sourceTrends.some((s) => s.label === 'Depo Katı')).toBe(false)
  })
})

/* ── Canlı smoke (app.inject) ── */

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/forecast-engine (canlı)', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })

  it('12. endpoint 200 ve beklenen şekil', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/forecast-engine' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as any
    expect(body.summary).toBeTruthy()
    expect(Array.isArray(body.alerts)).toBe(true)
    expect(Array.isArray(body.sourceTrends)).toBe(true)
    expect(typeof body.salesForecast.projected).toBe('string')
    expect(body.sourceTrends.some((s: any) => s.label === 'Depo Katı')).toBe(false)
  })
})
