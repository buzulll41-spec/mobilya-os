import { describe, expect, it } from 'vitest'
import { DEMO_TODAY, DEMO_TOMORROW } from '../../src/data/constants.js'
import {
  buildCalendarDayColumns,
  buildCalendarSummaryKpis,
  buildShipmentCalendarEntries,
  buildShipmentCalendarViewModel,
  mondayOfWeekContaining,
} from '../../src/mappers/shipment-calendar/shipmentCalendarModel.js'
import { buildSmartCalendarHints } from '../../src/mappers/shipment-calendar/shipmentCalendarGrouping.js'
import { resolveShipmentCalendarTone } from '../../src/mappers/shipment-calendar/shipmentCalendarRisk.js'

const order = {
  id: 'S-CAL-1',
  customer: 'Ayşe Yılmaz',
  product: 'Koltuk',
  status: 'Hazır',
  amount: 90_000,
  paid: false,
  paidAmount: 30_000,
  orderDate: '2026-05-01',
  dueDate: DEMO_TOMORROW,
  shipmentDate: DEMO_TODAY,
  notes: 'Adres: İzmit',
}

const dto = {
  id: 'S-CAL-1',
  openMissingItemsCount: 2,
  currentRiskSeverity: 'HIGH',
}

describe('shipment calendar', () => {
  it('boş gün crash etmez', () => {
    const weekStart = mondayOfWeekContaining(DEMO_TODAY)
    const columns = buildCalendarDayColumns([], weekStart, DEMO_TODAY)
    expect(columns).toHaveLength(6)
    expect(columns.every((c) => c.entries.length === 0)).toBe(true)
    const summary = buildCalendarSummaryKpis([], DEMO_TODAY)
    expect(summary).toHaveLength(5)
  })

  it('aynı güne çoklu sevk üretir', () => {
    const rows = [
      { ...order, id: 'A', customer: 'A', shipmentDate: DEMO_TODAY },
      { ...order, id: 'B', customer: 'B', shipmentDate: DEMO_TODAY },
    ]
    const entries = buildShipmentCalendarEntries({
      shipmentRows: rows,
      orders: [],
      listItemDtos: [],
      todayIso: DEMO_TODAY,
    })
    const today = entries.filter((e) => e.dateIso === DEMO_TODAY)
    expect(today.length).toBe(2)
  })

  it('eksik ürün SSH badge ve ton', () => {
    const entries = buildShipmentCalendarEntries({
      shipmentRows: [order],
      orders: [order],
      listItemDtos: [dto],
      todayIso: DEMO_TODAY,
    })
    const entry = entries.find((e) => e.orderId === 'S-CAL-1')
    expect(entry?.hasSsh).toBe(true)
    expect(entry?.sshDetail).toMatch(/2 eksik/)
    expect(entry?.tone === 'critical' || entry?.tone === 'risky').toBe(true)
  })

  it('view model bölge ipucu üretir', () => {
    const view = buildShipmentCalendarViewModel({
      shipmentRows: [
        order,
        { ...order, id: 'S-CAL-2', customer: 'B', notes: 'Adres: İzmit' },
        { ...order, id: 'S-CAL-3', customer: 'C', notes: 'Adres: İzmit' },
      ],
      orders: [order],
      listItemDtos: [dto],
      domainEvents: [],
      todayIso: DEMO_TODAY,
    })
    expect(view.hints.some((h) => h.includes('İzmit'))).toBe(true)
  })

  it('tone etiketleri Türkçe', () => {
    expect(resolveShipmentCalendarTone({ todayIso: DEMO_TODAY, inTransit: true })).toBe(
      'in_transit',
    )
    expect(
      buildSmartCalendarHints(
        [
          {
            dateIso: DEMO_TODAY,
            hasSsh: true,
            tone: 'critical',
            paymentLabel: 'Yüksek bakiye',
            terminUrgent: true,
            region: 'İzmit',
          },
        ],
        DEMO_TODAY,
      ).length,
    ).toBeGreaterThan(0)
  })
})
