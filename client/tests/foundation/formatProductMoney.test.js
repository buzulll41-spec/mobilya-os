import { describe, expect, it } from 'vitest'
import { formatProductMoney } from '../../src/lib/formatProductMoney.js'

describe('formatProductMoney', () => {
  it('formats Turkish Lira with two decimals', () => {
    expect(formatProductMoney(12500)).toBe('12.500,00 ₺')
    expect(formatProductMoney('12500.5')).toBe('12.500,50 ₺')
  })

  it('returns dash for invalid amounts', () => {
    expect(formatProductMoney(null)).toBe('—')
    expect(formatProductMoney('')).toBe('—')
    expect(formatProductMoney('abc')).toBe('—')
  })
})
