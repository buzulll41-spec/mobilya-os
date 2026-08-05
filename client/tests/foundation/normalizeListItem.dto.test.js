import { describe, expect, it } from 'vitest'
import { normalizeSalesOrderListItemDto } from '../../src/mappers/normalizeSalesOrderListItemDto.js'
import { mapListItemToRowVM } from '../../src/mappers/mapListItemToRowVM.js'

describe('normalizeSalesOrderListItemDto', () => {
  it('eksik money alanlarında crash etmez', () => {
    const dto = normalizeSalesOrderListItemDto({
      id: 'S-PARTIAL',
      customerDisplayName: 'X',
      displayStatus: 'Bekleniyor',
    })
    expect(() => mapListItemToRowVM(dto)).not.toThrow()
    expect(dto.totalAmount.amount).toBe('0.00')
    expect(dto.placedAt).toContain('T')
  })

  it('POST ve GET ile uyumlu minimum alan seti üretir', () => {
    const dto = normalizeSalesOrderListItemDto({
      id: 'S-1',
      orderNumber: 'S-1',
      customerDisplayName: 'A',
      displayStatus: 'Üretimde',
      totalAmount: { amount: '100.00', currency: 'TRY' },
      amountPaid: { amount: '0.00', currency: 'TRY' },
      amountDue: { amount: '100.00', currency: 'TRY' },
      placedAt: '2026-05-14T10:00:00.000Z',
    })
    expect(dto.qtyOrderedTotal).toBe('1.00')
    expect(dto.channel).toBe('STORE')
    expect(mapListItemToRowVM(dto).orderDate).toBe('2026-05-14')
  })
})
