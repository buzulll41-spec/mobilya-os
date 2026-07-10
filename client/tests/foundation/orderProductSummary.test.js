import { describe, it, expect } from 'vitest'
import { parseOrderProductSummary } from '../../src/utils/orderProductSummary.js'
import {
  paymentCollectionPercent,
  paymentCollectionTone,
  terminDelayDays,
} from '../../src/utils/orderCardUi.js'

describe('parseOrderProductSummary', () => {
  it('çok satırlı özet — ilk ürün + ekstra sayısı', () => {
    const r = parseOrderProductSummary('LINEA KÖŞE MODÜL × 1 · NOVA GARDIROP 240 × 1')
    expect(r.lineCount).toBe(2)
    expect(r.firstTitle).toBe('LINEA KÖŞE MODÜL')
    expect(r.extraLineCount).toBe(1)
    expect(r.displayCount).toBe(2)
  })

  it('tek satır — qty toplamı', () => {
    const r = parseOrderProductSummary('KOLTUK × 3')
    expect(r.lineCount).toBe(1)
    expect(r.extraLineCount).toBe(0)
    expect(r.displayCount).toBe(3)
  })

  it('ilk 2 ürün + gizli satır sayısı', () => {
    const r = parseOrderProductSummary(
      'LINEA × 1 · OSCAR 6 KAPAKLI DOLAP × 1 · NOVA × 1',
    )
    expect(r.visibleTitles).toEqual(['LINEA', 'OSCAR 6 KAPAKLI DOLAP'])
    expect(r.hiddenLineCount).toBe(1)
  })
})

describe('orderCardUi', () => {
  it('termin gecikme günü', () => {
    expect(terminDelayDays('2026-05-12', '2026-05-14')).toBe(2)
    expect(terminDelayDays('2026-05-14', '2026-05-14')).toBe(0)
  })

  it('tahsilat progress tonları', () => {
    expect(paymentCollectionTone(10)).toBe('low')
    expect(paymentCollectionTone(50)).toBe('mid')
    expect(paymentCollectionTone(90)).toBe('high')
  })

  it('tahsilat yüzdesi', () => {
    expect(paymentCollectionPercent({ amount: 10000, paidAmount: 7000, paid: false })).toBeCloseTo(70)
  })
})
