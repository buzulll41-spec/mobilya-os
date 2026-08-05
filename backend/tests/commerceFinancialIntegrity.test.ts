import { describe, expect, it } from 'vitest'
import {
  computeLineTotal,
  computeSubtotalFromLineTotals,
  resolveCommerceTotals,
  resolveDiscountAmount,
} from '../src/lib/commerceFinance.js'
import { DISCOUNT_TYPE } from '../src/constants/discountTypes.js'

describe('commerce financial integrity', () => {
  it('computeLineTotal — qty × unit', () => {
    expect(computeLineTotal(2, 1500)).toBe(3000)
  })

  it('resolveCommerceTotals — subtotal - discount = total', () => {
    const t = resolveCommerceTotals({
      subtotalAmount: 10_000,
      paidAmount: 2500,
      discountPercent: 5,
    })
    expect(t.subtotalAmount).toBe(10_000)
    expect(t.discountAmount).toBe(500)
    expect(t.totalAmount).toBe(9500)
    expect(t.remainingAmount).toBe(7000)
    expect(t.isFullyPaid).toBe(false)
  })

  it('explicit totalAmount must match derived', () => {
    expect(() =>
      resolveCommerceTotals({
        subtotalAmount: 1000,
        paidAmount: 0,
        totalAmount: 900,
        discountAmount: 0,
      }),
    ).toThrow(/uyumsuz/)
  })

  it('paidAmount cannot exceed totalAmount', () => {
    expect(() =>
      resolveCommerceTotals({
        subtotalAmount: 1000,
        paidAmount: 1500,
      }),
    ).toThrow(/aşamaz/)
  })

  it('resolveDiscountAmount — fixed cap at subtotal', () => {
    const d = resolveDiscountAmount(500, { discountFixedAmount: 900 })
    expect(d.discountAmount).toBe(500)
    expect(d.discountType).toBe(DISCOUNT_TYPE.FIXED)
  })

  it('subtotal from line totals', () => {
    expect(computeSubtotalFromLineTotals([2000, 500])).toBe(2500)
  })
})
