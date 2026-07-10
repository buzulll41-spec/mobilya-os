import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { INCOMING_GOODS_PURPOSE } from '../../src/contracts/v1/incomingGoodsPurpose.js'
import { PAYMENT_METHOD } from '../../src/contracts/v1/enums.js'
import { SHIPMENT_OPERATION_STATUS } from '../../src/contracts/v1/shipmentStatuses.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { buildShipmentAdvanceChain } from '../../src/mappers/shipment/shipmentSimplifiedFlow.js'
import { buildOrderPanelHistoryRows } from '../../src/mappers/order/orderPanelHistoryModel.js'
import { saveAuthSession } from '../../src/services/authSessionStore.js'
import {
  confirmOrderLineSupplySent,
  createOrder,
  getDomainEvents,
  getOrderLines,
  getOrders,
  patchShipmentStatus,
  postOrderPayment,
  postOrderShipment,
  resetMockOrdersStore,
} from '../../src/services/mockApi.js'
import { mockCreateIncomingGoods } from '../../src/services/mockIncomingGoodsApi.js'
import { mockCreateSupplier } from '../../src/services/mockSuppliersApi.js'
import { resetMockIncomingGoodsStore } from '../../src/services/mockIncomingGoodsStore.js'
import { resetMockSupplierLedgerStore } from '../../src/services/mockSupplierLedgerStore.js'
import { resetMockSupplierStore } from '../../src/services/mockSupplierStore.js'
import { parseMoney } from './_helpers/commerceScenario.js'
import { runWithMockApiTimers } from './_helpers/mockApiTimers.js'

function installLocalStorageMock() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

const LINES = [
  { title: 'Koltuk', quantity: 1, unitPrice: 25_000, sortOrder: 0 },
  { title: 'Masa', quantity: 1, unitPrice: 18_000, sortOrder: 1 },
  { title: 'TV Ünitesi', quantity: 1, unitPrice: 12_000, sortOrder: 2 },
]

describe('order audit lifecycle (FAZ 18A)', () => {
  beforeEach(() => {
    installLocalStorageMock()
    resetMockOrdersStore()
    resetMockSupplierStore()
    resetMockSupplierLedgerStore()
    resetMockIncomingGoodsStore()
    saveAuthSession({
      token: 'test-admin',
      user: {
        id: 'mock-admin',
        fullName: 'Admin',
        email: 'admin@mobilya.local',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })
  })

  it('tam sipariş akışı İşlem Geçmişi sekmesinde kronolojik görünür', async () => {
    const supplier = await mockCreateSupplier({ companyName: 'Audit Tedarik' })
    const linesWithSupplier = LINES.map((ln) => ({
      ...ln,
      supplierId: supplier.id,
      supplierNameSnapshot: supplier.companyName,
    }))

    const order = await runWithMockApiTimers(() =>
      createOrder({
        customerName: 'Audit Müşteri',
        paidAmount: 15_000,
        status: 'Üretimde',
        paymentMethod: PAYMENT_METHOD.TRANSFER,
        lines: linesWithSupplier,
      }),
    )

    const lineRows = await getOrderLines(order.id)
    await confirmOrderLineSupplySent(order.id, {
      lineIds: lineRows.map((l) => l.id),
      channel: 'WHATSAPP',
    })

    for (const line of lineRows) {
      await mockCreateIncomingGoods({
        supplierId: supplier.id,
        receivedAt: DEMO_TODAY,
        productTitle: line.title,
        qty: 1,
        unitPurchasePrice: 10_000,
        purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
        orderLineId: line.id,
      })
    }

    const { shipment } = await postOrderShipment(order.id, {
      plannedDate: DEMO_TODAY,
      lines: lineRows.map((l) => ({ orderLineId: l.id, qty: 1 })),
    })

    const chain = buildShipmentAdvanceChain(
      SHIPMENT_OPERATION_STATUS.PLANNED,
      SHIPMENT_OPERATION_STATUS.DELIVERED,
    )
    for (const step of chain) {
      await patchShipmentStatus(shipment.id, { status: step })
    }

    await postOrderPayment(order.id, { amount: 40_000, method: PAYMENT_METHOD.TRANSFER })

    const domainEvents = await getDomainEvents()
    const historyRows = buildOrderPanelHistoryRows(order, domainEvents)

    expect(historyRows.length).toBeGreaterThanOrEqual(8)

    const titles = historyRows.map((r) => r.title)
    expect(titles).toContain('Sipariş oluşturuldu')
    expect(titles.filter((t) => t === 'Tahsilat alındı').length).toBeGreaterThanOrEqual(2)
    expect(titles.filter((t) => t === 'Tedarik emri verildi').length).toBe(3)
    expect(titles.filter((t) => t.includes('depoya giriş')).length).toBe(3)
    expect(titles).toContain('Sevk planlandı')
    expect(titles).toContain('Teslim edildi')

    for (let i = 0; i < historyRows.length - 1; i += 1) {
      expect(historyRows[i].at.localeCompare(historyRows[i + 1].at)).toBeGreaterThanOrEqual(0)
    }

    const kapora = historyRows.find((r) => r.title === 'Tahsilat alındı' && r.oldValue === '0')
    expect(kapora?.moduleLabel).toBe('Tahsilat')

    const supplyRows = historyRows.filter((r) => r.moduleLabel === 'Tedarik')
    expect(supplyRows.every((r) => r.newValue === 'Verildi')).toBe(true)

    const incomingRows = historyRows.filter((r) => r.moduleLabel === 'Gelen Ürün')
    expect(incomingRows).toHaveLength(3)

    const afterPay = (await getOrders()).find((d) => d.id === order.id)
    expect(parseMoney(afterPay?.remainingAmount)).toBe(0)

    const orderEvents = domainEvents.filter((e) => e.aggregateId === order.id)
    expect(orderEvents.some((e) => e.type === DOMAIN_EVENT_TYPE.ORDER_PLACED)).toBe(true)
    expect(orderEvents.some((e) => e.type === DOMAIN_EVENT_TYPE.SUPPLY_ORDER_SENT)).toBe(true)
    expect(orderEvents.some((e) => e.type === DOMAIN_EVENT_TYPE.INCOMING_GOODS_RECORDED)).toBe(true)
  })
})
