import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { INCOMING_GOODS_PURPOSE } from '../../src/contracts/v1/incomingGoodsPurpose.js'
import { PAYMENT_METHOD } from '../../src/contracts/v1/enums.js'
import { SHIPMENT_OPERATION_STATUS } from '../../src/contracts/v1/shipmentStatuses.js'
import { buildShipmentAdvanceChain } from '../../src/mappers/shipment/shipmentSimplifiedFlow.js'
import {
  buildOrderLifecycleTimeline,
  LIFECYCLE_MILESTONE_DEFS,
} from '../../src/mappers/order/orderLifecycleTimelineModel.js'
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
]

describe('order lifecycle timeline (FAZ 19C)', () => {
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

  it('tam yaşam döngüsünde milestone sırası doğru doldurulur', async () => {
    const supplier = await mockCreateSupplier({ companyName: 'Timeline Tedarik' })
    const linesWithSupplier = LINES.map((ln) => ({
      ...ln,
      supplierId: supplier.id,
      supplierNameSnapshot: supplier.companyName,
    }))

    const order = await runWithMockApiTimers(() =>
      createOrder({
        customerName: 'Timeline Müşteri',
        paidAmount: 10_000,
        status: 'Üretimde',
        paymentMethod: PAYMENT_METHOD.TRANSFER,
        lines: linesWithSupplier,
      }),
    )

    const lineRows = await getOrderLines(order.id)
    await confirmOrderLineSupplySent(order.id, { lineIds: lineRows.map((l) => l.id) })

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

    await postOrderPayment(order.id, { amount: 33_000, method: PAYMENT_METHOD.TRANSFER })

    const dto = (await getOrders()).find((d) => d.id === order.id)
    const domainEvents = await getDomainEvents()
    const orderSnapshot = {
      ...order,
      status: dto?.displayStatus ?? order.status,
      paidAmount: dto ? parseMoney(dto.amountPaid) : order.paidAmount,
      paid: dto?.isFullyPaid ?? order.paid,
    }
    const view = buildOrderLifecycleTimeline(orderSnapshot, dto, domainEvents, DEMO_TODAY)

    expect(view.milestones).toHaveLength(LIFECYCLE_MILESTONE_DEFS.length)
    expect(view.header.customer).toContain('Timeline')
    expect(view.progressPercent).toBeGreaterThan(50)

    const doneIds = view.milestones.filter((m) => m.status === 'done' || m.status === 'delayed').map((m) => m.id)
    expect(doneIds).toContain('order_created')
    expect(doneIds).toContain('deposit_received')
    expect(doneIds).toContain('supply_created')
    expect(doneIds).toContain('supply_sent')
    expect(doneIds).toContain('first_product_arrived')
    expect(doneIds).toContain('products_completed')
    expect(doneIds).toContain('shipment_planned')
    expect(doneIds).toContain('vehicle_dispatched')
    expect(doneIds).toContain('delivered')
    expect(doneIds).toContain('collection_completed')
    expect(doneIds).toContain('order_closed')

    const orderIdx = doneIds.indexOf('order_created')
    const depositIdx = doneIds.indexOf('deposit_received')
    const supplyIdx = doneIds.indexOf('supply_sent')
    const deliveredIdx = doneIds.indexOf('delivered')
    expect(orderIdx).toBeLessThan(depositIdx)
    expect(depositIdx).toBeLessThan(supplyIdx)
    expect(supplyIdx).toBeLessThan(deliveredIdx)
  })

  it('devam eden siparişte mevcut aşama in_progress gösterilir', async () => {
    const supplier = await mockCreateSupplier({ companyName: 'Devam Tedarik' })
    const order = await runWithMockApiTimers(() =>
      createOrder({
        customerName: 'Devam Müşteri',
        paidAmount: 5_000,
        status: 'Üretimde',
        lines: [
          {
            title: 'Sehpa',
            quantity: 1,
            unitPrice: 12_000,
            sortOrder: 0,
            supplierId: supplier.id,
            supplierNameSnapshot: supplier.companyName,
          },
        ],
      }),
    )

    const domainEvents = await getDomainEvents()
    const view = buildOrderLifecycleTimeline(order, undefined, domainEvents, DEMO_TODAY)
    const inProgress = view.milestones.filter((m) => m.status === 'in_progress')
    expect(inProgress.length).toBe(1)
    expect(view.milestones.find((m) => m.id === 'order_created')?.status).toBe('done')
  })
})
