import { beforeEach, describe, expect, it } from 'vitest'
import { ORDER_FULFILLMENT_DISPLAY_STATUS } from '../../src/lib/deriveOrderDisplayStatus.js'
import { WAREHOUSE_ENTRY_STATUS } from '../../src/constants/supplyOrderStatus.js'
import { resetMockOrderLineStore, setOrderLinesForSalesOrder } from '../../src/services/mockOrderLineStore.js'
import { resetMockIncomingGoodsStore } from '../../src/services/mockIncomingGoodsStore.js'
import { resetMockSupplierStore } from '../../src/services/mockSupplierStore.js'
import { resetMockSupplierLedgerStore } from '../../src/services/mockSupplierLedgerStore.js'
import { resetMockMissingItemStore, upsertMissingItem } from '../../src/services/mockMissingItemStore.js'
import { MISSING_ITEM_STATUS } from '../../src/contracts/v1/missingItemStatuses.js'
import { getOrders, resetMockOrdersStore, syncMockOrderDisplayStatusById } from '../../src/services/mockApi.js'
import { deriveMockOrderStatusFromLines } from '../../src/services/syncMockOrderDisplayStatus.js'
import { getShipmentsForSalesOrder } from '../../src/services/mockShipmentStore.js'

describe('syncMockOrderDisplayStatus', () => {
  beforeEach(() => {
    resetMockSupplierStore()
    resetMockSupplierLedgerStore()
    resetMockIncomingGoodsStore()
    resetMockOrderLineStore()
    resetMockMissingItemStore()
    resetMockOrdersStore()
  })

  function seedArrivedLines(orderId, count = 3) {
    setOrderLinesForSalesOrder(
      orderId,
      Array.from({ length: count }, (_, i) => ({
        id: `${orderId}-l${i + 1}`,
        salesOrderId: orderId,
        title: `ÜRÜN ${i + 1}`,
        qtyOrdered: '1',
        qtyReceived: '1',
        supplyStatus: 'SENT',
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
        shipmentReady: false,
      })),
    )
  }

  it('3 ürün geldi → otomatik Sevke Hazır', async () => {
    const orders = await getOrders()
    const order = orders.find((o) => getShipmentsForSalesOrder(o.id).length === 0) ?? orders[0]
    seedArrivedLines(order.id, 3)

    expect(deriveMockOrderStatusFromLines({ ...order, status: 'Bekleniyor' })).toBe(
      ORDER_FULFILLMENT_DISPLAY_STATUS.SHIPMENT_READY,
    )

    syncMockOrderDisplayStatusById(order.id)

    const after = (await getOrders()).find((o) => o.id === order.id)
    expect(after?.displayStatus).toBe(ORDER_FULFILLMENT_DISPLAY_STATUS.SHIPMENT_READY)
  })

  it('SSH açılınca Sevke Hazır → Geldi', async () => {
    const orders = await getOrders()
    const order = orders[0]
    seedArrivedLines(order.id, 2)

    upsertMissingItem({
      id: `OMI-${order.id}-test`,
      orderId: order.id,
      lineId: `${order.id}-l1`,
      title: 'Parça',
      quantity: '1.00',
      reason: 'Eksik',
      status: MISSING_ITEM_STATUS.OPEN,
      supplierNote: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    })

    expect(syncMockOrderDisplayStatusById(order.id)).toBe(ORDER_FULFILLMENT_DISPLAY_STATUS.ARRIVED)
  })
})
