import { describe, expect, it } from 'vitest'
import { formatGoodsReceiptLedgerDescription } from '../src/lib/supplierLedger.js'

describe('formatGoodsReceiptLedgerDescription', () => {
  it('müşteri · sipariş · ürün · tutar formatı', () => {
    const description = formatGoodsReceiptLedgerDescription({
      customerName: 'DÜNYA KUPASI Organizasyon',
      orderId: 'S-DEMO-KUPASI',
      productTitle: 'Koltuk Takımı',
      qty: 1,
      unitPrice: 80_000,
      lineTotal: 80_000,
    })
    expect(description).toContain('DÜNYA KUPASI')
    expect(description).toContain('Koltuk Takımı')
    expect(description).toContain('Ürün alışı')
    expect(description).toContain('80.000')
  })
})
