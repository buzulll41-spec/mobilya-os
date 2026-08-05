import { describe, expect, it } from 'vitest'
import {
  computeNetPurchasePrice,
  resolveProductPurchaseCost,
} from '../../src/lib/productPurchaseCost.js'

describe('productPurchaseCost', () => {
  it('net alış = toptan - iskonto', () => {
    expect(computeNetPurchasePrice(100_000, 20)).toBe(80_000)
  })

  it('resolveProductPurchaseCost wholesale öncelikli', () => {
    const resolved = resolveProductPurchaseCost({
      wholesalePrice: 100_000,
      wholesaleDiscountRate: 20,
      costPrice: 50_000,
    })
    expect(resolved.netPurchasePrice).toBe(80_000)
  })
})
