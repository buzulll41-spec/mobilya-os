import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { ORDER_FULFILLMENT_DISPLAY_STATUS } from '../../src/lib/deriveOrderDisplayStatus.js'
import { resetMockOrderLineStore, setOrderLinesForSalesOrder } from '../../src/services/mockOrderLineStore.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { getOrders } from '../../src/services/mockApi.js'
import { listItemDtoToLegacyOrder } from '../../src/mappers/listItemDtoToLegacyOrder.js'
import { WAREHOUSE_ENTRY_STATUS } from '../../src/constants/supplyOrderStatus.js'

describe('order list displayStatus projection', () => {
  beforeEach(() => {
    resetMockOrderLineStore()
  })

  async function seedAykutLikeOrder() {
    const dtos = await getOrders()
    const dto = dtos.find((o) => o.displayStatus !== 'Teslim Edildi') ?? dtos[0]
    const order = listItemDtoToLegacyOrder(dto)
    setOrderLinesForSalesOrder(order.id, [
      {
        id: 'line-atlas',
        salesOrderId: order.id,
        qtyOrdered: '1',
        qtyReceived: '1',
        title: 'ATLAS YEMEK MASASI',
        supplyStatus: 'SENT',
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
        shipmentReady: false,
      },
      {
        id: 'line-linea',
        salesOrderId: order.id,
        qtyOrdered: '1',
        qtyReceived: '0',
        title: 'LINEA KÖŞE MODÜL',
        supplyStatus: 'SENT',
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
        shipmentReady: false,
      },
    ])
    return order
  }

  it('Aykut Elmas senaryosu: 1 geldi + 1 bekleniyor → Kısmi Geldi', async () => {
    const order = await seedAykutLikeOrder()
    const dto = projectLegacyOrderToListItemDto({ ...order, customer: 'Aykut Elmas' }, DEMO_TODAY)
    expect(dto.displayStatus).toBe(ORDER_FULFILLMENT_DISPLAY_STATUS.PARTIAL_ARRIVED)
  })
})
