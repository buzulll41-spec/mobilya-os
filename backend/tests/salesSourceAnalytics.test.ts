import { describe, expect, it } from 'vitest'
import {
  resolveSalesSourceBucket,
  SALES_SOURCE_BUCKETS,
} from '../src/constants/salesSourceBuckets.js'
import {
  aggregateSalesSourceAnalytics,
  type AnalyticsOrderInput,
} from '../src/services/getSalesSourceAnalytics.js'

function line(partial: Partial<AnalyticsOrderInput['lines'][number]>): AnalyticsOrderInput['lines'][number] {
  return {
    lineTotal: 0,
    qtyOrdered: 1,
    soldUnitCost: null,
    soldSalesSourceType: null,
    soldDisplayFloor: null,
    soldExternalSupplyType: null,
    category: null,
    supplierId: null,
    ...partial,
  }
}

describe('salesSourceBuckets', () => {
  it('mağaza sergi + kat → kat bucket', () => {
    expect(
      resolveSalesSourceBucket({ soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR' }).label,
    ).toBe('Giriş Kat')
    expect(
      resolveSalesSourceBucket({ soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'BASEMENT' }).label,
    ).toBe('Bodrum Kat')
  })

  it('dış tedarik + tip → dış tedarik bucket', () => {
    expect(
      resolveSalesSourceBucket({ soldSalesSourceType: 'EXTERNAL_SUPPLY', soldExternalSupplyType: 'CATALOG' }).label,
    ).toBe('Dış Tedarik / Katalog')
  })

  it('stok ürünü → Stok Ürünü', () => {
    expect(resolveSalesSourceBucket({ soldSalesSourceType: 'STOCK_ITEM' }).label).toBe('Stok Ürünü')
  })

  it('null / WAREHOUSE / geçersiz → Bilinmeyen', () => {
    expect(resolveSalesSourceBucket({ soldSalesSourceType: null }).label).toBe('Bilinmeyen')
    expect(resolveSalesSourceBucket({ soldSalesSourceType: 'WAREHOUSE' }).label).toBe('Bilinmeyen')
    expect(
      resolveSalesSourceBucket({ soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'WAREHOUSE_FLOOR' }).label,
    ).toBe('Bilinmeyen')
  })

  it('GARANTİ: hiçbir kanonik bucket Depo Katı değildir', () => {
    expect(SALES_SOURCE_BUCKETS.some((b) => b.label === 'Depo Katı')).toBe(false)
  })
})

describe('aggregateSalesSourceAnalytics', () => {
  it('kalem oranına göre tahsilat/açık bakiye dağıtır', () => {
    const orders: AnalyticsOrderInput[] = [
      {
        id: 'S1',
        orderDate: '2026-05-10',
        salesPerson: 'Ayşe',
        paidAmount: 1000,
        remainingAmount: 1000,
        lines: [
          line({ lineTotal: 1500, qtyOrdered: 1, soldUnitCost: 900, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR' }),
          line({ lineTotal: 500, qtyOrdered: 1, soldUnitCost: 300, soldSalesSourceType: 'STOCK_ITEM' }),
        ],
      },
    ]
    const res = aggregateSalesSourceAnalytics(orders)
    const giris = res.rows.find((r) => r.label === 'Giriş Kat')
    const stok = res.rows.find((r) => r.label === 'Stok Ürünü')
    expect(giris).toBeTruthy()
    expect(stok).toBeTruthy()
    // 1500/2000 = %75 → tahsilat 750, açık 750
    expect(giris?.collected).toBe('750.00')
    expect(giris?.openBalance).toBe('750.00')
    // 500/2000 = %25 → tahsilat 250, açık 250
    expect(stok?.collected).toBe('250.00')
    expect(stok?.openBalance).toBe('250.00')
    // toplam tahsilat = sipariş ödemesi
    expect(res.totals.collected).toBe('1000.00')
  })

  it('kâr ve kâr % hesaplar (revenue - soldUnitCost*qty)', () => {
    const orders: AnalyticsOrderInput[] = [
      {
        id: 'S2',
        orderDate: '2026-05-11',
        salesPerson: null,
        paidAmount: 0,
        remainingAmount: 2000,
        lines: [line({ lineTotal: 2000, qtyOrdered: 2, soldUnitCost: 600, soldSalesSourceType: 'EXTERNAL_SUPPLY', soldExternalSupplyType: 'WEBSITE' })],
      },
    ]
    const res = aggregateSalesSourceAnalytics(orders)
    const web = res.rows.find((r) => r.label === 'Dış Tedarik / Web Sitesi')
    expect(web?.revenue).toBe('2000.00')
    expect(web?.purchaseCost).toBe('1200.00') // 600 * 2
    expect(web?.profit).toBe('800.00')
    expect(web?.profitMarginPct).toBe(40) // 800/2000
    expect(web?.salesCount).toBe(1)
    expect(web?.unitsSold).toBe(2)
    expect(web?.orderCount).toBe(1)
  })

  it('eski/sınıflandırılmamış kayıtlar Bilinmeyen satırına gider; Depo Katı asla satır olmaz', () => {
    const orders: AnalyticsOrderInput[] = [
      {
        id: 'S3',
        orderDate: '2026-05-12',
        salesPerson: null,
        paidAmount: 0,
        remainingAmount: 500,
        lines: [
          line({ lineTotal: 500, soldSalesSourceType: null }),
          line({ lineTotal: 300, soldSalesSourceType: 'WAREHOUSE' }),
        ],
      },
    ]
    const res = aggregateSalesSourceAnalytics(orders)
    expect(res.rows.every((r) => r.label !== 'Depo Katı')).toBe(true)
    const unknown = res.rows.find((r) => r.label === 'Bilinmeyen')
    expect(unknown?.salesCount).toBe(2)
  })

  it('filtreler: tarih aralığı + kaynak tipi', () => {
    const orders: AnalyticsOrderInput[] = [
      {
        id: 'S4',
        orderDate: '2026-04-01',
        salesPerson: null,
        paidAmount: 0,
        remainingAmount: 0,
        lines: [line({ lineTotal: 100, soldSalesSourceType: 'STOCK_ITEM' })],
      },
      {
        id: 'S5',
        orderDate: '2026-05-20',
        salesPerson: null,
        paidAmount: 0,
        remainingAmount: 0,
        lines: [
          line({ lineTotal: 200, soldSalesSourceType: 'STOCK_ITEM' }),
          line({ lineTotal: 300, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'FIRST_FLOOR' }),
        ],
      },
    ]
    const dated = aggregateSalesSourceAnalytics(orders, { from: '2026-05-01', to: '2026-05-31' })
    expect(dated.totals.salesCount).toBe(2) // S4 tarih dışı
    const onlyStock = aggregateSalesSourceAnalytics(orders, { salesSourceType: 'STOCK_ITEM' })
    expect(onlyStock.rows.every((r) => r.label === 'Stok Ürünü')).toBe(true)
    expect(onlyStock.totals.salesCount).toBe(2) // iki STOCK_ITEM kalemi
  })

  it('revenueSharePct toplam ciroya göre hesaplanır', () => {
    const orders: AnalyticsOrderInput[] = [
      {
        id: 'S6',
        orderDate: '2026-05-15',
        salesPerson: null,
        paidAmount: 0,
        remainingAmount: 0,
        lines: [
          line({ lineTotal: 750, soldSalesSourceType: 'STOCK_ITEM' }),
          line({ lineTotal: 250, soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'BASEMENT' }),
        ],
      },
    ]
    const res = aggregateSalesSourceAnalytics(orders)
    expect(res.rows.find((r) => r.label === 'Stok Ürünü')?.revenueSharePct).toBe(75)
    expect(res.rows.find((r) => r.label === 'Bodrum Kat')?.revenueSharePct).toBe(25)
  })
})
