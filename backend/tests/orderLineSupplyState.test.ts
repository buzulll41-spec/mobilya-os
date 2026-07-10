import { describe, expect, it } from 'vitest'
import {
  SUPPLY_STATUS,
  WAREHOUSE_ENTRY_STATUS,
} from '../src/constants/supplyOrderStatus.js'
import {
  buildOrderLineStateCorrection,
  canMarkShipmentReady,
  detectOrderLineStateInconsistency,
  resolveEffectiveShipmentReady,
} from '../src/lib/orderLineSupplyState.js'

describe('backend orderLineSupplyState', () => {
  it('detects supply not sent with arrived warehouse', () => {
    expect(
      detectOrderLineStateInconsistency({
        supplyStatus: SUPPLY_STATUS.NOT_SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
        qtyOrdered: 1,
        qtyReceived: 1,
        shipmentReady: false,
      }),
    ).toBe(true)
  })

  it('does not flag sent + waiting + not ready as inconsistent', () => {
    expect(
      detectOrderLineStateInconsistency({
        supplyStatus: SUPPLY_STATUS.SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
        qtyOrdered: 2,
        qtyReceived: 0,
        shipmentReady: false,
      }),
    ).toBe(false)
  })

  it('corrects supply not sent to reset downstream', () => {
    const correction = buildOrderLineStateCorrection({
      supplyStatus: SUPPLY_STATUS.NOT_SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
      qtyOrdered: 2,
      qtyReceived: 2,
      shipmentReady: true,
    })
    expect(correction.supplyStatus).toBe(SUPPLY_STATUS.NOT_SENT)
    expect(correction.warehouseEntryStatus).toBe(WAREHOUSE_ENTRY_STATUS.NOT_SENT)
    expect(correction.qtyReceived).toBe(0)
    expect(correction.shipmentReady).toBe(false)
    expect(correction.clearSupplyMetadata).toBe(true)
  })

  it('manual shipment ready disabled; auto-ready uses order context', () => {
    expect(
      canMarkShipmentReady({
        supplyStatus: SUPPLY_STATUS.SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
        qtyOrdered: 1,
        qtyReceived: 0,
        shipmentReady: false,
      }),
    ).toBe(false)
    expect(
      resolveEffectiveShipmentReady(
        {
          supplyStatus: SUPPLY_STATUS.SENT,
          warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
          qtyOrdered: 1,
          qtyReceived: 1,
          shipmentReady: false,
        },
        true,
      ),
    ).toBe(true)
  })
})
