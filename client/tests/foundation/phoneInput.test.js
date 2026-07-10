import { describe, expect, it } from 'vitest'
import {
  digitsOnly,
  formatPhoneDisplay,
  formatTrMobileDisplay,
  sanitizePhoneLocalInput,
  toE164Phone,
} from '../../src/lib/phoneInput.js'

describe('phone input', () => {
  it('TR telefon — en fazla 11 rakam', () => {
    expect(sanitizePhoneLocalInput('+90', '054125369851234')).toBe('05412536985')
    expect(digitsOnly('05a4b1c2', 11)).toBe('05412')
  })

  it('TR maske — 05XX XXX XX XX', () => {
    expect(formatTrMobileDisplay('05412536985')).toBe('0541 253 69 85')
    expect(formatPhoneDisplay('+90', '05412536985')).toBe('0541 253 69 85')
  })

  it('E.164 — +905412536985', () => {
    expect(toE164Phone('+90', '05412536985')).toBe('+905412536985')
    expect(toE164Phone('+43', '6641234567')).toBe('+436641234567')
  })
})
