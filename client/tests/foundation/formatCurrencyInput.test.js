import { describe, expect, it } from 'vitest'
import {
  formatCurrencyInput,
  formatCurrencyInputTyping,
  normalizeCurrencyStorage,
  parseCurrencyInput,
  sanitizeCurrencyTyping,
} from '../../src/lib/formatCurrencyInput.js'

describe('formatCurrencyInput', () => {
  it('formats full Turkish currency on blur', () => {
    expect(formatCurrencyInput(100000)).toBe('100.000,00 ₺')
    expect(formatCurrencyInput('100000')).toBe('100.000,00 ₺')
    expect(formatCurrencyInput(1234567.89)).toBe('1.234.567,89 ₺')
  })

  it('formats typing with thousand separators only', () => {
    expect(formatCurrencyInputTyping('1000')).toBe('1.000')
    expect(formatCurrencyInputTyping('10000')).toBe('10.000')
    expect(formatCurrencyInputTyping('100000')).toBe('100.000')
    expect(formatCurrencyInputTyping('1000000')).toBe('1.000.000')
  })

  it('parses formatted values back to raw numbers', () => {
    expect(parseCurrencyInput('100.000,00 ₺')).toBe(100000)
    expect(parseCurrencyInput('1.234.567,89 ₺')).toBe(1234567.89)
    expect(parseCurrencyInput('100000')).toBe(100000)
  })

  it('sanitizes typing input', () => {
    expect(sanitizeCurrencyTyping('100.000,50 ₺')).toBe('100000,50')
    expect(sanitizeCurrencyTyping('abc1234')).toBe('1234')
  })

  it('normalizes storage for API', () => {
    expect(normalizeCurrencyStorage('100.000,00 ₺')).toBe('100000')
    expect(normalizeCurrencyStorage('100000,5')).toBe('100000.5')
    expect(normalizeCurrencyStorage('100000,4', { integerOnly: true })).toBe('100000')
  })
})
