import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../constants/supplyOrderStatus.js'
import { ORDER_LINE_SEEDS } from '../data/mock/shipmentFixtures.js'
import { PROCUREMENT_ORDER_LINE_SEEDS } from '../data/mock/procurementFixtures.js'
import {
  getAllOrderLinesFlat,
  hasOrderLinesInStore,
  setOrderLinesForSalesOrder,
} from './mockOrderLineStore.js'

/**
 * Legacy sipariş durumundan demo satır tedarik/depo durumu türetir.
 * @param {string} status
 */
export function inferLineSupplyFromLegacyOrderStatus(status) {
  if (status === 'Teslim Edildi') {
    return {
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
      qtyReceived: '1.00',
    }
  }
  if (status === 'Geldi' || status === 'Hazır' || status === 'Sevke Hazır') {
    return {
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
      qtyReceived: '1.00',
    }
  }
  if (
    status === 'Üretimde' ||
    status === 'Eksik Var' ||
    status === 'Bekleniyor' ||
    status === 'Kısmi Geldi'
  ) {
    return {
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
      qtyReceived: '0',
    }
  }
  return {
    supplyStatus: SUPPLY_STATUS.NOT_SENT,
    warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.NOT_SENT,
    qtyReceived: '0',
  }
}

/** FAZ 26/27 — demo satır override'ları. */
function applyOrderLineSeedOverrides() {
  const shipDemoLines = ORDER_LINE_SEEDS.filter((l) => l.salesOrderId === 'S-SHIP-DEMO')
  if (shipDemoLines.length > 0) {
    setOrderLinesForSalesOrder('S-SHIP-DEMO', shipDemoLines)
  }
  if (PROCUREMENT_ORDER_LINE_SEEDS.length > 0) {
    setOrderLinesForSalesOrder('S-PROC-DEMO', PROCUREMENT_ORDER_LINE_SEEDS)
  }
}

/**
 * @param {import('../data/seedOrders.js').Order[]} orders
 */
export function bootstrapMockOrderLinesFromOrders(orders) {
  if (getAllOrderLinesFlat().length > 0) {
    applyOrderLineSeedOverrides()
    return
  }

  for (const order of orders) {
    if (hasOrderLinesInStore(order.id)) continue
    const supply = inferLineSupplyFromLegacyOrderStatus(order.status)
    setOrderLinesForSalesOrder(order.id, [
      {
        id: `OL-${order.id}-1`,
        salesOrderId: order.id,
        title: order.product,
        qtyOrdered: '1.00',
        qtyReceived: supply.qtyReceived,
        supplyStatus: supply.supplyStatus,
        warehouseEntryStatus: supply.warehouseEntryStatus,
        shipmentReady: false,
      },
    ])
  }

  applyOrderLineSeedOverrides()
}
