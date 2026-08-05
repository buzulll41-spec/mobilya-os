import { describe, expect, it } from 'vitest'
import {
  inferLineSupplyFromLegacyOrderDisplayStatus,
  inferWarehouseEntryStatusFromQty,
} from '../src/lib/inferLineSupplyFromLegacyOrderDisplayStatus.js'
import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../src/constants/supplyOrderStatus.js'

describe('inferLineSupplyFromLegacyOrderDisplayStatus', () => {
  it('Üretimde → SENT + WAITING', () => {
    expect(inferLineSupplyFromLegacyOrderDisplayStatus('Üretimde')).toEqual({
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
    })
  })

  it('Geldi → SENT + ARRIVED', () => {
    expect(inferLineSupplyFromLegacyOrderDisplayStatus('Geldi')).toEqual({
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
    })
  })

  it('qtyReceived kısmi → PARTIAL_ARRIVED', () => {
    expect(
      inferWarehouseEntryStatusFromQty(SUPPLY_STATUS.SENT, 4, 1),
    ).toBe(WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED)
  })
})
