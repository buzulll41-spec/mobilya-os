import { describe, expect, it } from 'vitest'
import {
  deriveOrderDisplayStatusFromLines,
  ORDER_FULFILLMENT_DISPLAY_STATUS,
} from '../../src/lib/deriveOrderDisplayStatus.js'
import { WAREHOUSE_ENTRY_STATUS } from '../../src/constants/supplyOrderStatus.js'

const waiting = { warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING, shipmentReady: false }
const partial = { warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED, shipmentReady: false }
const arrived = { warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED, shipmentReady: false }

describe('deriveOrderDisplayStatusFromLines', () => {
  it('0/2 geldi → Bekleniyor', () => {
    expect(deriveOrderDisplayStatusFromLines([waiting, waiting])).toBe(
      ORDER_FULFILLMENT_DISPLAY_STATUS.WAITING,
    )
  })

  it('1/2 geldi → Kısmi Geldi', () => {
    expect(deriveOrderDisplayStatusFromLines([arrived, waiting])).toBe(
      ORDER_FULFILLMENT_DISPLAY_STATUS.PARTIAL_ARRIVED,
    )
  })

  it('tek satır kısmi depo → Kısmi Geldi', () => {
    expect(deriveOrderDisplayStatusFromLines([partial])).toBe(
      ORDER_FULFILLMENT_DISPLAY_STATUS.PARTIAL_ARRIVED,
    )
  })

  it('2/2 geldi + engel yok → Sevke Hazır', () => {
    expect(deriveOrderDisplayStatusFromLines([arrived, arrived], null, { openMissingItemsCount: 0 })).toBe(
      ORDER_FULFILLMENT_DISPLAY_STATUS.SHIPMENT_READY,
    )
  })

  it('2/2 geldi + SSH engeli → Geldi', () => {
    expect(deriveOrderDisplayStatusFromLines([arrived, arrived], null, { openMissingItemsCount: 1 })).toBe(
      ORDER_FULFILLMENT_DISPLAY_STATUS.ARRIVED,
    )
  })

  it('teslim edildi stored status korunur', () => {
    expect(
      deriveOrderDisplayStatusFromLines([waiting, waiting], ORDER_FULFILLMENT_DISPLAY_STATUS.DELIVERED),
    ).toBe(ORDER_FULFILLMENT_DISPLAY_STATUS.DELIVERED)
  })
})
