import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { INCOMING_GOODS_PURPOSE } from '../../src/contracts/v1/incomingGoodsPurpose.js'
import { PAYMENT_METHOD } from '../../src/contracts/v1/enums.js'
import { SHIPMENT_OPERATION_STATUS } from '../../src/contracts/v1/shipmentStatuses.js'
import { buildShipmentAdvanceChain } from '../../src/mappers/shipment/shipmentSimplifiedFlow.js'
import { saveAuthSession } from '../../src/services/authSessionStore.js'
import {
  confirmOrderLineSupplySent,
  createOrder,
  getOrderLines,
  getOrders,
  patchShipmentStatus,
  postOrderPayment,
  postOrderShipment,
  resetMockOrdersStore,
} from '../../src/services/mockApi.js'
import { mockCreateIncomingGoods } from '../../src/services/mockIncomingGoodsApi.js'
import { mockCreateSupplier, mockListSuppliers } from '../../src/services/mockSuppliersApi.js'
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

const THREE_PRODUCT_LINES = [
  { title: 'Koltuk Takımı', quantity: 1, unitPrice: 25_000, sortOrder: 0, productGroup: 'Oturma grubu' },
  { title: 'Yemek Masası', quantity: 1, unitPrice: 18_000, sortOrder: 1, productGroup: 'Yemek odası' },
  { title: 'TV Ünitesi', quantity: 1, unitPrice: 12_000, sortOrder: 2, productGroup: 'Oturma grubu' },
]

const ORDER_TOTAL = 55_000
const KAPORA = 15_000
const REMAINING = ORDER_TOTAL - KAPORA

describe('full order lifecycle (mock)', () => {
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

  it('3 ürün → kapora → tedarik → giriş → sevk → teslim → tahsilat → kapanış', async () => {
    const supplier = await mockCreateSupplier({ companyName: 'Yaşam Döngüsü Tedarik' })
    const linesWithSupplier = THREE_PRODUCT_LINES.map((ln) => ({
      ...ln,
      supplierId: supplier.id,
      supplierNameSnapshot: supplier.companyName,
    }))

    const order = await runWithMockApiTimers(() =>
      createOrder({
        customerName: 'Tam Döngü Müşteri',
        paidAmount: KAPORA,
        status: 'Üretimde',
        paymentMethod: PAYMENT_METHOD.TRANSFER,
        lines: linesWithSupplier,
      }),
    )

    expect(order.id).toBeTruthy()
    const afterCreate = (await getOrders()).find((d) => d.id === order.id)
    expect(parseMoney(afterCreate?.amountPaid)).toBe(KAPORA)
    expect(parseMoney(afterCreate?.remainingAmount)).toBe(REMAINING)
    expect(afterCreate?.isFullyPaid).not.toBe(true)

    const lineRows = await getOrderLines(order.id)
    expect(lineRows).toHaveLength(3)

    await confirmOrderLineSupplySent(order.id, {
      lineIds: lineRows.map((l) => l.id),
      channel: 'WHATSAPP',
    })
    const afterSupply = await getOrderLines(order.id)
    expect(afterSupply.every((l) => l.supplyStatus === 'SENT')).toBe(true)

    for (const line of afterSupply) {
      await mockCreateIncomingGoods({
        supplierId: supplier.id,
        receivedAt: DEMO_TODAY,
        productTitle: line.title,
        qty: Number.parseFloat(line.qtyOrdered),
        unitPurchasePrice: Math.round((line.unitPrice ?? 0) * 0.55),
        purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
        orderLineId: line.id,
      })
    }
    const afterReceive = await getOrderLines(order.id)
    expect(afterReceive.every((l) => Number.parseFloat(l.qtyReceived) >= Number.parseFloat(l.qtyOrdered))).toBe(
      true,
    )

    const { shipment } = await postOrderShipment(order.id, {
      plannedDate: DEMO_TODAY,
      lines: afterReceive.map((l) => ({
        orderLineId: l.id,
        qty: Number.parseFloat(l.qtyOrdered),
      })),
    })
    expect(shipment.status).toBe(SHIPMENT_OPERATION_STATUS.PLANNED)

    const chain = buildShipmentAdvanceChain(
      SHIPMENT_OPERATION_STATUS.PLANNED,
      SHIPMENT_OPERATION_STATUS.DELIVERED,
    )
    for (const step of chain) {
      await patchShipmentStatus(shipment.id, { status: step })
    }

    const afterDelivery = (await getOrders()).find((d) => d.id === order.id)
    expect(afterDelivery?.displayStatus).toBe('Teslim Edildi')
    expect(parseMoney(afterDelivery?.remainingAmount)).toBe(REMAINING)

    await postOrderPayment(order.id, { amount: REMAINING, method: PAYMENT_METHOD.TRANSFER })
    const afterFinalPay = (await getOrders()).find((d) => d.id === order.id)
    expect(parseMoney(afterFinalPay?.amountPaid)).toBe(ORDER_TOTAL)
    expect(parseMoney(afterFinalPay?.remainingAmount)).toBe(0)
    expect(afterFinalPay?.displayStatus).toBe('Teslim Edildi')

    const suppliers = await mockListSuppliers({ q: 'Yaşam' })
    expect(Number.parseFloat(suppliers[0]?.openBalance ?? '0')).toBeGreaterThan(0)
  })
})
