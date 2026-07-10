import { describe, expect, it } from 'vitest'
import {
  isOrderLinePendingForIncomingEntry,
  matchesIncomingPendingSearch,
} from '../src/lib/incomingPendingLineRules.js'
import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../src/constants/supplyOrderStatus.js'

describe('incomingPendingLineRules', () => {
  it('requires supply sent, warehouse not fully arrived, not shipment ready', () => {
    expect(
      isOrderLinePendingForIncomingEntry({
        supplyStatus: SUPPLY_STATUS.SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
        shipmentReady: false,
        qtyOrdered: 3,
        qtyReceived: 0,
      }),
    ).toBe(true)

    expect(
      isOrderLinePendingForIncomingEntry({
        supplyStatus: SUPPLY_STATUS.SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
        shipmentReady: false,
        qtyOrdered: 3,
        qtyReceived: 3,
      }),
    ).toBe(false)
  })

  it('matches multi-token search across customer and supplier', () => {
    expect(
      matchesIncomingPendingSearch(
        {
          customerName: 'Aykut Elmas',
          orderNumber: 'S-1',
          productTitle: 'Masa',
          supplierName: 'Tedarik Ltd',
        },
        'Aykut Tedarik',
      ),
    ).toBe(true)
  })
})
