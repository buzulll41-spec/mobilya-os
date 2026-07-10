import { describe, expect, it } from 'vitest'
import { normalizeSalesOrderListItemDto } from '../../src/mappers/normalizeSalesOrderListItemDto.js'
import { DISCOUNTED_PARTIAL_SCENARIO, parseMoney } from './_helpers/commerceScenario.js'

describe('commerce API normalizer parity', () => {
  it('normalizeSalesOrderListItemDto — subtotal, discount, remaining korunur', () => {
    const dto = normalizeSalesOrderListItemDto({
      id: 'S-TEST',
      orderNumber: 'S-TEST',
      customerDisplayName: 'A',
      displayStatus: 'Üretimde',
      placedAt: '2026-05-14T10:00:00.000Z',
      subtotalAmount: { amount: '20000.00', currency: 'TRY' },
      discountAmount: { amount: '2000.00', currency: 'TRY' },
      totalAmount: { amount: '18000.00', currency: 'TRY' },
      amountPaid: { amount: '5000.00', currency: 'TRY' },
      amountDue: { amount: '13000.00', currency: 'TRY' },
      remainingAmount: { amount: '13000.00', currency: 'TRY' },
    })
    expect(parseMoney(dto.subtotalAmount)).toBe(DISCOUNTED_PARTIAL_SCENARIO.expected.subtotalAmount)
    expect(parseMoney(dto.discountAmount)).toBe(DISCOUNTED_PARTIAL_SCENARIO.expected.discountAmount)
    expect(parseMoney(dto.totalAmount)).toBe(DISCOUNTED_PARTIAL_SCENARIO.expected.totalAmount)
    expect(parseMoney(dto.remainingAmount)).toBe(DISCOUNTED_PARTIAL_SCENARIO.expected.remainingAmount)
  })
})
