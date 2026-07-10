import { describe, expect, it } from 'vitest'
import {
  deriveOrderDisplayStatusFromLines,
  ORDER_FULFILLMENT_DISPLAY_STATUS,
} from '../../src/lib/deriveOrderDisplayStatus.js'
import { WAREHOUSE_ENTRY_STATUS } from '../../src/constants/supplyOrderStatus.js'

const waiting = { warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING, shipmentReady: false }
const arrived = { warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED, shipmentReady: false }

describe('auto shipment ready — pilot scenarios', () => {
  it('TEST 1: 2 ürün, 1 geldi → Kısmi Geldi', () => {
    expect(deriveOrderDisplayStatusFromLines([arrived, waiting])).toBe(
      ORDER_FULFILLMENT_DISPLAY_STATUS.PARTIAL_ARRIVED,
    )
  })

  it('TEST 2: 2 ürün geldi, engel yok → Sevke Hazır', () => {
    expect(deriveOrderDisplayStatusFromLines([arrived, arrived], null, { openMissingItemsCount: 0 })).toBe(
      ORDER_FULFILLMENT_DISPLAY_STATUS.SHIPMENT_READY,
    )
  })

  it('TEST 3: 2 ürün geldi + SSH açıldı → Geldi', () => {
    expect(deriveOrderDisplayStatusFromLines([arrived, arrived], null, { openMissingItemsCount: 1 })).toBe(
      ORDER_FULFILLMENT_DISPLAY_STATUS.ARRIVED,
    )
  })

  it('TEST 4: 2 ürün geldi + eksik parça → Geldi', () => {
    expect(deriveOrderDisplayStatusFromLines([arrived, arrived], null, { openMissingItemsCount: 2 })).toBe(
      ORDER_FULFILLMENT_DISPLAY_STATUS.ARRIVED,
    )
  })
})
