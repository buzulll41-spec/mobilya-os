import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { INCOMING_GOODS_PURPOSE } from '../../src/contracts/v1/incomingGoodsPurpose.js'
import { SUPPLIER_HEALTH_STATUS } from '../../src/mappers/supply/supplierHealth.js'
import { resetMockIncomingGoodsStore } from '../../src/services/mockIncomingGoodsStore.js'
import { resetMockSupplierLedgerStore } from '../../src/services/mockSupplierLedgerStore.js'
import { resetMockSupplierStore } from '../../src/services/mockSupplierStore.js'
import { resetMockOrderLineStore, setOrderLinesForSalesOrder } from '../../src/services/mockOrderLineStore.js'
import { mockCreateIncomingGoods } from '../../src/services/mockIncomingGoodsApi.js'
import {
  mockGetSupplyOperationsBoard,
  mockGetSupplierOperations,
} from '../../src/services/mockSupplierOperationsApi.js'
import { mockCreateSupplier } from '../../src/services/mockSuppliersApi.js'
import { getOrders } from '../../src/services/mockApi.js'

describe('supplierOperations mock', () => {
  beforeEach(() => {
    resetMockSupplierStore()
    resetMockSupplierLedgerStore()
    resetMockIncomingGoodsStore()
    resetMockOrderLineStore()
  })

  it('operations board KPI ve filtre', async () => {
    const sup = await mockCreateSupplier({ companyName: 'Kritik Test', address: 'İstanbul' })
    const orders = await getOrders()
    const order = orders[0]
    setOrderLinesForSalesOrder(order.id, [
      {
        id: 'line-ops-1',
        salesOrderId: order.id,
        qtyOrdered: '10',
        qtyReceived: '0',
        title: 'MAYER KÖŞE',
        supplyStatus: 'SENT',
      },
    ])
    await mockCreateIncomingGoods({
      supplierId: sup.id,
      receivedAt: DEMO_TODAY,
      productTitle: 'MAYER KÖŞE',
      qty: 1,
      unitPurchasePrice: 50_000,
      purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
      orderLineId: 'line-ops-1',
    })

    const board = await mockGetSupplyOperationsBoard({ sort: 'balance_desc' })
    expect(board.kpis.openProductCount).toBeGreaterThanOrEqual(1)
    expect(board.suppliers.length).toBeGreaterThanOrEqual(40)

    const found = board.suppliers.find((s) => s.id === sup.id)
    expect(found?.openProductCount).toBeGreaterThanOrEqual(1)
    expect(found?.pendingOrderCount).toBeGreaterThanOrEqual(1)

    const criticalOnly = await mockGetSupplyOperationsBoard({ health: SUPPLIER_HEALTH_STATUS.CRITICAL })
    expect(criticalOnly.suppliers.every((s) => s.healthStatus === SUPPLIER_HEALTH_STATUS.CRITICAL)).toBe(
      true,
    )
  })

  it('detay sekmeleri verisi ve cari toplamları', async () => {
    const sup = await mockCreateSupplier({ companyName: 'Detay Test' })
    const orders = await getOrders()
    const order = orders[0]
    setOrderLinesForSalesOrder(order.id, [
      {
        id: 'line-det-1',
        salesOrderId: order.id,
        qtyOrdered: '6',
        qtyReceived: '0',
        title: 'Sandalye',
        supplyStatus: 'SENT',
      },
    ])
    await mockCreateIncomingGoods({
      supplierId: sup.id,
      receivedAt: DEMO_TODAY,
      productTitle: 'Sandalye',
      qty: 2,
      unitPurchasePrice: 1000,
      purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
      orderLineId: 'line-det-1',
    })

    const ops = await mockGetSupplierOperations(sup.id)
    expect(ops.openProducts.length).toBe(1)
    expect(ops.openProducts[0].qtyMissing).toBe('4.00')
    expect(ops.pendingOrders.length).toBe(1)
    expect(ops.incomingHistory.length).toBeGreaterThanOrEqual(1)
    expect(Number.parseFloat(ops.commercial.totalPurchases)).toBeGreaterThan(0)
    expect(Number.parseFloat(ops.commercial.openBalance)).toBeGreaterThanOrEqual(0)
  })
})
