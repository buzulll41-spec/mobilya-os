import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ORDER_LIST_SORT,
  compareOrderListRows,
  parseOrderIdTimestamp,
  resolveOrderListCreatedAt,
  sortOrderListRows,
} from '../../src/utils/orderListSort.js'

/** @returns {import('../../src/contracts/v1/orderListRowVm.js').OrderListRowVM} */
function row(overrides) {
  return {
    id: 'S-1',
    customer: 'Alpha',
    product: 'Ürün A',
    status: 'Bekleniyor',
    amount: 1000,
    orderDate: '2026-05-14',
    ...overrides,
  }
}

describe('orderListSort', () => {
  it('parseOrderIdTimestamp — epoch ms id', () => {
    expect(parseOrderIdTimestamp('S-1780137840703')).toMatch(/^2026-/)
    expect(parseOrderIdTimestamp('S-24089')).toBeNull()
  })

  it('varsayılan sıralama createdAt desc → yeni sipariş üstte', () => {
    const rows = [
      row({ id: 'S-24089', customer: 'Eski', orderDate: '2026-05-10' }),
      row({
        id: 'S-1780137840703',
        customer: 'Yeni',
        createdAt: '2026-05-30T10:44:00.708Z',
      }),
    ]
    const sorted = sortOrderListRows(rows, DEFAULT_ORDER_LIST_SORT)
    expect(sorted[0].customer).toBe('Yeni')
  })

  it('createdAt yoksa orderDate desc, sonra id desc', () => {
    const a = row({ id: 'S-24102', orderDate: '2026-05-12' })
    const b = row({ id: 'S-24105', orderDate: '2026-05-14' })
    expect(compareOrderListRows(a, b, 'createdAt', 'desc')).toBeGreaterThan(0)
  })

  it('müşteri kolonu asc — Türkçe locale', () => {
    const rows = [
      row({ id: 'S-2', customer: 'Zeynep' }),
      row({ id: 'S-1', customer: 'Ahmet' }),
    ]
    const sorted = sortOrderListRows(rows, { column: 'customer', direction: 'asc' })
    expect(sorted.map((r) => r.customer)).toEqual(['Ahmet', 'Zeynep'])
  })

  it('tutar kolonu desc', () => {
    const rows = [
      row({ id: 'S-1', amount: 5000 }),
      row({ id: 'S-2', amount: 12000 }),
    ]
    const sorted = sortOrderListRows(rows, { column: 'amount', direction: 'desc' })
    expect(sorted[0].amount).toBe(12000)
  })

  it('resolveOrderListCreatedAt — id timestamp fallback', () => {
    const ts = parseOrderIdTimestamp('S-1780137840703')
    expect(resolveOrderListCreatedAt(row({ id: 'S-1780137840703' }))).toBe(ts)
  })
})
