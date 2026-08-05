import { describe, expect, it } from 'vitest'
import {
  formatSupplierOpenBalanceLabel,
  normalizeSupplierDetailDto,
  normalizeSupplierListItemDto,
} from '../../src/mappers/supply/normalizeSupplierDto.js'

describe('normalizeSupplierDto', () => {
  it('liste DTO normalize', () => {
    const dto = normalizeSupplierListItemDto({
      id: 's1',
      companyName: 'ABC',
      openBalance: '25000.00',
      isActive: true,
    })
    expect(dto.companyName).toBe('ABC')
    expect(dto.openBalance).toBe('25000.00')
  })

  it('detay DTO normalize', () => {
    const dto = normalizeSupplierDetailDto({
      id: 's1',
      companyName: 'ABC',
      iban: null,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    })
    expect(dto.iban).toBeNull()
    expect(dto.createdAt).toContain('2026')
  })

  it('açık bakiye etiketi', () => {
    expect(formatSupplierOpenBalanceLabel('0.00')).toMatch(/Borç yok/)
    expect(formatSupplierOpenBalanceLabel('25000.00')).toMatch(/25\.000.*borç/)
  })
})
