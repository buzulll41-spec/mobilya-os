import { describe, expect, it } from 'vitest'
import {
  isOrderLinePendingForIncomingEntry,
  matchesIncomingPendingSearch,
} from '../../src/lib/incomingPendingLineRules.js'
import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../../src/constants/supplyOrderStatus.js'

describe('incomingPendingLineRules', () => {
  it('lists supply sent + warehouse waiting + not ready with pending qty', () => {
    expect(
      isOrderLinePendingForIncomingEntry({
        supplyStatus: SUPPLY_STATUS.SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
        shipmentReady: false,
        qtyOrdered: 4,
        qtyReceived: 0,
      }),
    ).toBe(true)
  })

  it('excludes fully arrived warehouse lines', () => {
    expect(
      isOrderLinePendingForIncomingEntry({
        supplyStatus: SUPPLY_STATUS.SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
        shipmentReady: false,
        qtyOrdered: 4,
        qtyReceived: 4,
      }),
    ).toBe(false)
  })

  it('includes partial arrival with remaining qty', () => {
    expect(
      isOrderLinePendingForIncomingEntry({
        supplyStatus: SUPPLY_STATUS.SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED,
        shipmentReady: false,
        qtyOrdered: 4,
        qtyReceived: 2,
      }),
    ).toBe(true)
  })

  it('excludes supply not sent and shipment ready', () => {
    expect(
      isOrderLinePendingForIncomingEntry({
        supplyStatus: SUPPLY_STATUS.NOT_SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
        shipmentReady: false,
        qtyOrdered: 4,
        qtyReceived: 0,
      }),
    ).toBe(false)
    expect(
      isOrderLinePendingForIncomingEntry({
        supplyStatus: SUPPLY_STATUS.SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
        shipmentReady: true,
        qtyOrdered: 4,
        qtyReceived: 0,
      }),
    ).toBe(false)
  })

  it('matches customer, order, product and supplier search tokens', () => {
    const fields = {
      customerName: 'Aykut Elmas',
      orderNumber: 'S-2026-0142',
      salesOrderId: 'S-2026-0142',
      productTitle: 'Koltuk takımı',
      supplierName: 'Mobilya A.Ş.',
    }
    expect(matchesIncomingPendingSearch(fields, 'Aykut')).toBe(true)
    expect(matchesIncomingPendingSearch(fields, '0142')).toBe(true)
    expect(matchesIncomingPendingSearch(fields, 'Koltuk')).toBe(true)
    expect(matchesIncomingPendingSearch(fields, 'Mobilya')).toBe(true)
    expect(matchesIncomingPendingSearch(fields, 'Aykut Mobilya')).toBe(true)
    expect(matchesIncomingPendingSearch(fields, 'Bilinmeyen')).toBe(false)
  })
})
