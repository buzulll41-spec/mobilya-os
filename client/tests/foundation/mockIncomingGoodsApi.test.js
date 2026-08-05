import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { INCOMING_GOODS_PURPOSE } from '../../src/contracts/v1/incomingGoodsPurpose.js'
import { resetMockIncomingGoodsStore } from '../../src/services/mockIncomingGoodsStore.js'
import { resetMockSupplierLedgerStore } from '../../src/services/mockSupplierLedgerStore.js'
import { resetMockSupplierStore } from '../../src/services/mockSupplierStore.js'
import { resetMockOrderLineStore, setOrderLinesForSalesOrder, getOrderLinesForSalesOrder } from '../../src/services/mockOrderLineStore.js'
import {
  mockCreateIncomingGoods,
  mockGetIncomingGoodsKpis,
  mockListOrderLineReceiving,
  mockListPendingOrderLines,
} from '../../src/services/mockIncomingGoodsApi.js'
import { mockCreateSupplier, mockListSuppliers, mockPostSupplierPayment } from '../../src/services/mockSuppliersApi.js'
import { getOrders, upsertMockRiskOrder } from '../../src/services/mockApi.js'

describe('mockIncomingGoodsApi', () => {
  beforeEach(() => {
    resetMockSupplierStore()
    resetMockSupplierLedgerStore()
    resetMockIncomingGoodsStore()
    resetMockOrderLineStore()
  })

  it('stok gelen ürün — cari artar, qtyReceived değişmez', async () => {
    const sup = await mockCreateSupplier({ companyName: 'Stok Tedarik' })
    const row = await mockCreateIncomingGoods({
      supplierId: sup.id,
      receivedAt: DEMO_TODAY,
      productTitle: 'Stok sandalye',
      qty: 3,
      unitPurchasePrice: 200,
      purpose: INCOMING_GOODS_PURPOSE.STOCK,
    })
    expect(row.lineTotal).toBe('600.00')
    expect(row.orderLineId).toBeNull()
    const kpis = await mockGetIncomingGoodsKpis()
    expect(kpis.stockCount).toBeGreaterThanOrEqual(1)
    const list = await mockListSuppliers({ q: 'Stok' })
    expect(Number.parseFloat(list[0].openBalance)).toBe(600)
  })

  it('müşteri siparişi — qtyReceived ve overflow', async () => {
    const sup = await mockCreateSupplier({ companyName: 'Sipariş Tedarik' })
    const orders = await getOrders()
    const order = orders[0]
    setOrderLinesForSalesOrder(order.id, [
      {
        id: 'line-test-1',
        salesOrderId: order.id,
        qtyOrdered: '6',
        qtyReceived: '0',
        title: '6 Sandalye',
        supplyStatus: 'SENT',
        warehouseEntryStatus: 'WAITING',
        shipmentReady: false,
      },
    ])

    await mockCreateIncomingGoods({
      supplierId: sup.id,
      receivedAt: DEMO_TODAY,
      productTitle: 'Sandalye',
      qty: 2,
      unitPurchasePrice: 100,
      purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
      orderLineId: 'line-test-1',
    })

    const receiving = await mockListOrderLineReceiving(order.id)
    const line = receiving.lines.find((r) => r.orderLineId === 'line-test-1')
    expect(line?.qtyReceived).toBe('2.00')
    expect(line?.readinessLabel).toBe('Kısmi geldi')
    expect(line?.badgeLabel).toMatch(/Gelen:/)

    await expect(
      mockCreateIncomingGoods({
        supplierId: sup.id,
        receivedAt: DEMO_TODAY,
        productTitle: 'Fazla',
        qty: 5,
        unitPurchasePrice: 100,
        purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
        orderLineId: 'line-test-1',
      }),
    ).rejects.toThrow(/aşamaz/)

    await mockCreateIncomingGoods({
      supplierId: sup.id,
      receivedAt: DEMO_TODAY,
      productTitle: 'Kalan',
      qty: 4,
      unitPurchasePrice: 100,
      purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
      orderLineId: 'line-test-1',
    })
    const after = await mockListOrderLineReceiving(order.id)
    expect(after.lines.find((r) => r.orderLineId === 'line-test-1')?.readinessLabel).toBe('Hazır')
    expect(after.summary.orderReadyToShip).toBe(true)
  })

  it('teşhir + ödeme sonrası bakiye', async () => {
    const sup = await mockCreateSupplier({ companyName: 'Teşhir Tedarik' })
    await mockCreateIncomingGoods({
      supplierId: sup.id,
      receivedAt: DEMO_TODAY,
      productTitle: 'Teşhir masa',
      qty: 1,
      unitPurchasePrice: 3000,
      purpose: INCOMING_GOODS_PURPOSE.DISPLAY,
    })
    const before = Number.parseFloat((await mockListSuppliers({ q: 'Teşhir' }))[0].openBalance)
    await mockPostSupplierPayment(sup.id, { amount: 1000, method: 'CASH' })
    const after = Number.parseFloat((await mockListSuppliers({ q: 'Teşhir' }))[0].openBalance)
    expect(after).toBe(before - 1000)
  })

  it('siparişe bağlı kayıtta tedarikçi uyuşmazlığı reddedilir', async () => {
    const supA = await mockCreateSupplier({ companyName: 'Atanan Tedarik', code: `LKA-${Date.now()}` })
    const supB = await mockCreateSupplier({ companyName: 'Farklı Tedarik', code: `LKB-${Date.now()}` })
    const orderId = `S-SUP-LOCK-${Date.now()}`
    const lineId = `line-sup-lock-${Date.now()}`
    upsertMockRiskOrder({
      id: orderId,
      customer: 'Kilit Test',
      product: 'Kilitli ürün',
      amount: 500,
      status: 'Üretimde',
      orderDate: '2026-05-14',
      dueDate: '2026-06-25',
      paid: false,
      paidAmount: 0,
    })
    setOrderLinesForSalesOrder(orderId, [
      {
        id: lineId,
        salesOrderId: orderId,
        qtyOrdered: '1',
        qtyReceived: '0',
        title: 'Kilitli ürün',
        supplyStatus: 'SENT',
        warehouseEntryStatus: 'NOT_SENT',
        shipmentReady: false,
        supplierId: supA.id,
      },
    ])

    const seeded = getOrderLinesForSalesOrder(orderId)
    expect(seeded[0]?.supplierId).toBe(supA.id)

    await expect(
      mockCreateIncomingGoods({
        supplierId: supB.id,
        receivedAt: DEMO_TODAY,
        productTitle: 'Kilitli ürün',
        qty: 1,
        unitPurchasePrice: 500,
        purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
        orderLineId: lineId,
      }),
    ).rejects.toThrow(/değiştirilemez/)

    const row = await mockCreateIncomingGoods({
      supplierId: supA.id,
      receivedAt: DEMO_TODAY,
      productTitle: 'Kilitli ürün',
      qty: 1,
      unitPurchasePrice: 500,
      purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
      orderLineId: lineId,
    })
    expect(row.supplierId).toBe(supA.id)
  })

  it('bekleyen sipariş kalemleri listesi', async () => {
    const orders = await getOrders()
    const order = orders.find((o) => o.status !== 'Teslim Edildi') ?? orders[0]
    setOrderLinesForSalesOrder(order.id, [
      {
        id: 'line-pending-1',
        salesOrderId: order.id,
        qtyOrdered: '4',
        qtyReceived: '1',
        title: 'Bekleyen ürün',
        supplyStatus: 'SENT',
        warehouseEntryStatus: 'PARTIAL_ARRIVED',
        shipmentReady: false,
      },
    ])
    const pending = await mockListPendingOrderLines()
    expect(pending.some((p) => p.orderLineId === 'line-pending-1')).toBe(true)
  })

  it('bekleyen liste tedarik verilmemiş kalemleri göstermez', async () => {
    const orders = await getOrders()
    const order = orders.find((o) => o.status !== 'Teslim Edildi') ?? orders[0]
    setOrderLinesForSalesOrder(order.id, [
      {
        id: 'line-not-sent',
        salesOrderId: order.id,
        qtyOrdered: '2',
        qtyReceived: '0',
        title: 'Tedariksiz ürün',
        supplyStatus: 'NOT_SENT',
        warehouseEntryStatus: 'NOT_SENT',
      },
    ])
    const pending = await mockListPendingOrderLines()
    expect(pending.some((p) => p.orderLineId === 'line-not-sent')).toBe(false)
  })
})
