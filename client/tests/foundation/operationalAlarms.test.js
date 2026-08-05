import { describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { buildOperationalAlarms, summarizeOperationalAlarms } from '../../src/utils/operationalAlarms.js'

describe('operational alarms', () => {
  it('termin geçmiş sipariş için kritik alarm üretir', () => {
    /** @type {import('../../src/data/seedOrders.js').Order} */
    const order = {
      id: 'ALM-1',
      customer: 'Test',
      product: 'Koltuk',
      status: 'Üretimde',
      amount: 50_000,
      orderDate: DEMO_TODAY,
      dueDate: '2026-05-01',
    }
    const alarms = buildOperationalAlarms([order], [], DEMO_TODAY)
    expect(alarms.some((a) => a.level === 'critical' && a.category === 'termin')).toBe(true)
  })

  it('açık eksik için kritik alarm', () => {
    const order = {
      id: 'ALM-2',
      customer: 'Test',
      product: 'Masa',
      status: 'Eksik Var',
      amount: 20_000,
      orderDate: DEMO_TODAY,
    }
    const alarms = buildOperationalAlarms([order], [{ id: 'ALM-2', openMissingItemsCount: 2 }], DEMO_TODAY)
    expect(alarms.some((a) => a.category === 'ssh' && a.title === 'Eksik Parça')).toBe(true)
  })

  it('özet sayıları toplar', () => {
    const alarms = buildOperationalAlarms(
      [
        {
          id: 'A',
          customer: 'X',
          product: 'P',
          status: 'Üretimde',
          amount: 100_000,
          paidAmount: 10_000,
          orderDate: DEMO_TODAY,
          dueDate: '2026-05-01',
        },
      ],
      [],
      DEMO_TODAY,
    )
    const summary = summarizeOperationalAlarms(alarms)
    expect(summary.total).toBe(alarms.length)
    expect(summary.critical).toBeGreaterThan(0)
  })
})
