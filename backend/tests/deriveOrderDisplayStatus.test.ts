import { describe, expect, it } from 'vitest'

import {

  deriveOrderDisplayStatusFromLines,

  ORDER_FULFILLMENT_DISPLAY_STATUS,

} from '../src/lib/deriveOrderDisplayStatus.js'

import { WAREHOUSE_ENTRY_STATUS } from '../src/constants/supplyOrderStatus.js'



describe('deriveOrderDisplayStatusFromLines', () => {

  it('derives waiting, partial, auto-ready and fallback states', () => {

    const waiting = { warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING, shipmentReady: false }

    const partial = { warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED, shipmentReady: false }

    const arrived = { warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED, shipmentReady: false }



    expect(deriveOrderDisplayStatusFromLines([waiting, waiting])).toBe(

      ORDER_FULFILLMENT_DISPLAY_STATUS.WAITING,

    )

    expect(deriveOrderDisplayStatusFromLines([arrived, waiting])).toBe(

      ORDER_FULFILLMENT_DISPLAY_STATUS.PARTIAL_ARRIVED,

    )

    expect(deriveOrderDisplayStatusFromLines([partial])).toBe(

      ORDER_FULFILLMENT_DISPLAY_STATUS.PARTIAL_ARRIVED,

    )

    expect(

      deriveOrderDisplayStatusFromLines([arrived, arrived], null, { openMissingItemsCount: 0 }),

    ).toBe(ORDER_FULFILLMENT_DISPLAY_STATUS.SHIPMENT_READY)

    expect(

      deriveOrderDisplayStatusFromLines([arrived, arrived], null, { openMissingItemsCount: 1 }),

    ).toBe(ORDER_FULFILLMENT_DISPLAY_STATUS.ARRIVED)

  })

})

