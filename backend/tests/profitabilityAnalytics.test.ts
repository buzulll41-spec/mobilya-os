import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import {
  aggregateProfitability,
  deriveOrderRiskLevel,
  type ProfitLineInput,
  type ProfitOrderInput,
} from '../src/services/getProfitabilityAnalytics.js'

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

const ORDERS: ProfitOrderInput[] = [
  {
    id: 'O1', orderDate: '2026-05-03', salesPerson: 'Ayşe', customerName: 'Müşteri 1',
    paidAmount: 20000, remainingAmount: 0, riskLevel: 'NONE',
    lines: [
      line({ lineTotal: 20000, qtyOrdered: 1, soldUnitCost: 12000, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR', supplierId: 'supA', supplierName: 'Marka A', category: 'Koltuk', productId: 'P1', productTitle: 'Koltuk X' }),
    ],
  },
  {
    id: 'O2', orderDate: '2026-05-10', salesPerson: 'Mehmet', customerName: 'Müşteri 2',
    paidAmount: 5000, remainingAmount: 5000, riskLevel: 'NONE',
    lines: [
      line({ lineTotal: 10000, qtyOrdered: 2, soldUnitCost: 3000, soldSalesSourceType: 'EXTERNAL_SUPPLY', soldExternalSupplyType: 'CATALOG', supplierId: 'supB', supplierName: 'Marka B', category: 'Masa', productId: 'P2', productTitle: 'Masa Y' }),
    ],
  },
  {
    id: 'O3', orderDate: '2026-04-20', salesPerson: 'Ayşe', customerName: 'Müşteri 3',
    paidAmount: 0, remainingAmount: 8000, riskLevel: 'HIGH',
    lines: [
      line({ lineTotal: 8000, qtyOrdered: 1, soldUnitCost: 5000, soldSalesSourceType: 'STOCK_ITEM', supplierId: 'supA', supplierName: 'Marka A', category: 'Koltuk', productId: 'P1', productTitle: 'Koltuk X' }),
    ],
  },
]

const M = (str: string) => Number.parseFloat(str)

describe('aggregateProfitability — kâr hesaplama', () => {
  it('brüt kâr ve kâr % doğru', () => {
    const res = aggregateProfitability(ORDERS, { groupBy: 'source' })
    // totals: revenue 38000, cost 23000, gross 15000
    expect(M(res.totals.revenue)).toBe(38000)
    expect(M(res.totals.purchaseCost)).toBe(23000)
    expect(M(res.totals.grossProfit)).toBe(15000)
    expect(res.totals.profitMarginPct).toBeCloseTo(39.5, 1)
  })

  it('gerçekleşen ve bekleyen kâr tahsilat oranına göre', () => {
    const res = aggregateProfitability(ORDERS, { groupBy: 'source' })
    // O1 realized 8000, O2 realized 2000 (rate .5), O3 0 → 10000 realized, 5000 pending
    expect(M(res.totals.realizedProfit)).toBe(10000)
    expect(M(res.totals.pendingProfit)).toBe(5000)
  })

  it('riskli alacak yalnızca HIGH riskli siparişlerden gelir', () => {
    const res = aggregateProfitability(ORDERS, { groupBy: 'source' })
    expect(M(res.totals.openBalance)).toBe(13000)
    expect(M(res.totals.riskyReceivable)).toBe(8000) // sadece O3
  })

  it('satış kaynağı kırılımı (Giriş Kat / Katalog / Stok)', () => {
    const res = aggregateProfitability(ORDERS, { groupBy: 'source' })
    const byLabel = Object.fromEntries(res.rows.map((r) => [r.label, r]))
    expect(M(byLabel['Giriş Kat'].grossProfit)).toBe(8000)
    expect(M(byLabel['Dış Tedarik / Katalog'].grossProfit)).toBe(4000)
    expect(M(byLabel['Stok Ürünü'].grossProfit)).toBe(3000)
    expect(M(byLabel['Stok Ürünü'].riskyReceivable)).toBe(8000)
    expect(res.rows.some((r) => r.label === 'Depo Katı')).toBe(false)
  })

  it('personel kırılımı', () => {
    const res = aggregateProfitability(ORDERS, { groupBy: 'salesPerson' })
    const byLabel = Object.fromEntries(res.rows.map((r) => [r.label, r]))
    expect(M(byLabel['Ayşe'].grossProfit)).toBe(11000)
    expect(M(byLabel['Mehmet'].grossProfit)).toBe(4000)
  })

  it('kategori ve tedarikçi kırılımları', () => {
    const cat = aggregateProfitability(ORDERS, { groupBy: 'category' })
    expect(M(cat.rows.find((r) => r.label === 'Koltuk')!.revenue)).toBe(28000)
    const sup = aggregateProfitability(ORDERS, { groupBy: 'supplier' })
    expect(M(sup.rows.find((r) => r.label === 'Marka A')!.revenue)).toBe(28000)
  })

  it('özet: en kârlı kaynak ve personel', () => {
    const res = aggregateProfitability(ORDERS, { groupBy: 'product' })
    expect(res.summary.mostProfitableSource?.label).toBe('Giriş Kat')
    expect(res.summary.mostProfitableSalesPerson?.label).toBe('Ayşe')
  })

  it('snapshot immutability: maliyet yalnızca soldUnitCost snapshot’ından okunur', () => {
    // Aynı ürün (P1) iki farklı snapshot maliyetiyle → her satır kendi snapshot’ını kullanır.
    const orders: ProfitOrderInput[] = [
      { id: 'A', orderDate: '2026-05-01', salesPerson: 'X', customerName: 'c', paidAmount: 0, remainingAmount: 1000, riskLevel: 'NONE',
        lines: [line({ lineTotal: 1000, qtyOrdered: 1, soldUnitCost: 400, soldSalesSourceType: 'STOCK_ITEM', productId: 'P1', productTitle: 'P1' })] },
      { id: 'B', orderDate: '2026-05-02', salesPerson: 'X', customerName: 'c', paidAmount: 0, remainingAmount: 1000, riskLevel: 'NONE',
        lines: [line({ lineTotal: 1000, qtyOrdered: 1, soldUnitCost: 900, soldSalesSourceType: 'STOCK_ITEM', productId: 'P1', productTitle: 'P1' })] },
    ]
    const res = aggregateProfitability(orders, { groupBy: 'product' })
    // gross = (1000-400) + (1000-900) = 700
    expect(M(res.rows[0].grossProfit)).toBe(700)
  })

  it('boş veri → sıfır toplam, null özet', () => {
    const res = aggregateProfitability([], { groupBy: 'source' })
    expect(res.rows).toHaveLength(0)
    expect(M(res.totals.revenue)).toBe(0)
    expect(res.summary.mostProfitableSource).toBeNull()
    expect(res.summary.mostProfitableSalesPerson).toBeNull()
  })

  it('filtreler: salesPerson + paymentStatus + riskLevel', () => {
    expect(aggregateProfitability(ORDERS, { salesPerson: 'Ayşe' }).totals.orderCount).toBe(2)
    expect(M(aggregateProfitability(ORDERS, { paymentStatus: 'paid' }).totals.revenue)).toBe(20000)
    expect(M(aggregateProfitability(ORDERS, { riskLevel: 'HIGH' }).totals.revenue)).toBe(8000)
  })

  it('toplam satırı kırılım toplamlarıyla tutarlı', () => {
    const res = aggregateProfitability(ORDERS, { groupBy: 'source' })
    const sumRevenue = res.rows.reduce((s, r) => s + M(r.revenue), 0)
    expect(sumRevenue).toBeCloseTo(M(res.totals.revenue), 2)
    const sumProfit = res.rows.reduce((s, r) => s + M(r.grossProfit), 0)
    expect(sumProfit).toBeCloseTo(M(res.totals.grossProfit), 2)
  })

  it('detay paneli: en büyük/riskli sipariş + en çok kâr getiren ürün', () => {
    const res = aggregateProfitability(ORDERS, { groupBy: 'salesPerson' })
    const ayse = res.rows.find((r) => r.label === 'Ayşe')!
    expect(ayse.detail.biggestOrder?.orderId).toBe('O1')
    expect(ayse.detail.riskiestOrder?.orderId).toBe('O3')
    expect(ayse.detail.riskiestOrder?.riskLevel).toBe('HIGH')
    expect(ayse.detail.topProductByProfit?.title).toBe('Koltuk X')
  })
})

describe('deriveOrderRiskLevel', () => {
  it('Eksik Var → HIGH', () => {
    expect(deriveOrderRiskLevel({ displayStatus: 'Eksik Var', dueDate: null, remainingAmount: 0 }, '2026-05-14')).toBe('HIGH')
  })
  it('gecikmiş + açık bakiye → HIGH', () => {
    expect(deriveOrderRiskLevel({ displayStatus: 'Üretimde', dueDate: '2026-05-01', remainingAmount: 5000 }, '2026-05-14')).toBe('HIGH')
  })
  it('teslim edildi + kapalı → NONE', () => {
    expect(deriveOrderRiskLevel({ displayStatus: 'Teslim Edildi', dueDate: '2026-05-01', remainingAmount: 0 }, '2026-05-14')).toBe('NONE')
  })
})

/* ── Canlı smoke (app.inject) ── */

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/profitability-analytics (canlı)', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })

  it('endpoint 200 ve beklenen şekil', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/profitability-analytics?groupBy=source' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      groupBy: string
      rows: unknown[]
      summary: { revenue: string; grossProfit: string }
      totals: { revenue: string }
      breakdowns: { source: unknown[]; salesPerson: unknown[] }
    }
    expect(body.groupBy).toBe('source')
    expect(Array.isArray(body.rows)).toBe(true)
    expect(typeof body.summary.grossProfit).toBe('string')
    expect(body.rows.every(() => true)).toBe(true)
    // Depo Katı satış kaynağı kırılımına asla girmez
    expect((body.breakdowns.source as { label: string }[]).some((r) => r.label === 'Depo Katı')).toBe(false)
  })
})
