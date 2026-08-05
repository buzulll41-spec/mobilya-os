import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { INCOMING_GOODS_PURPOSE } from '../../src/contracts/v1/incomingGoodsPurpose.js'
import { PAYMENT_METHOD } from '../../src/contracts/v1/enums.js'
import { SHIPMENT_OPERATION_STATUS } from '../../src/contracts/v1/shipmentStatuses.js'
import { buildShipmentAdvanceChain } from '../../src/mappers/shipment/shipmentSimplifiedFlow.js'
import {
  buildKanbanCard,
  resolveKanbanColumn,
} from '../../src/mappers/operation-map/operationMapKanbanModel.js'
import { moneyToNumber } from '../../src/mappers/moneyHelpers.js'
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
import { mockCreateSupplier } from '../../src/services/mockSuppliersApi.js'
import { resetMockIncomingGoodsStore } from '../../src/services/mockIncomingGoodsStore.js'
import { resetMockSupplierLedgerStore } from '../../src/services/mockSupplierLedgerStore.js'
import { resetMockSupplierStore } from '../../src/services/mockSupplierStore.js'
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

function columnForOrderDto(dto) {
  /** @type {import('../../src/data/seedOrders.js').Order} */
  const order = {
    id: dto.id,
    customer: dto.customerDisplayName ?? dto.customer ?? '',
    product: dto.productSummary ?? '',
    status: dto.displayStatus ?? dto.status ?? 'Üretimde',
    amount: moneyToNumber(dto.totalAmount),
    paidAmount: moneyToNumber(dto.amountPaid),
    dueDate: dto.dueDate ?? undefined,
    shipmentDate: dto.shipmentDate ?? undefined,
    orderDate: dto.orderDate ?? DEMO_TODAY,
    phone: dto.customerPhone ?? undefined,
  }
  return resolveKanbanColumn(order, dto)
}

describe('operation map kanban lifecycle (FAZ 19B)', () => {
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

  it('sipariş yaşam döngüsü boyunca kart kolonları ilerler', async () => {
    const supplier = await mockCreateSupplier({ companyName: 'Kanban Tedarik' })
    const linesWithSupplier = LINES.map((ln) => ({
      ...ln,
      supplierId: supplier.id,
      supplierNameSnapshot: supplier.companyName,
    }))

    const order = await runWithMockApiTimers(() =>
      createOrder({
        customerName: 'Kanban Müşteri',
        paidAmount: 0,
        status: 'Üretimde',
        paymentMethod: PAYMENT_METHOD.TRANSFER,
        lines: linesWithSupplier,
      }),
    )

    let orders = await getOrders()
    const dtoAfterCreate = orders.find((d) => d.id === order.id)
    expect(columnForOrderDto(dtoAfterCreate)).toBe('deposit_pending')

    await postOrderPayment(order.id, { amount: 10_000, method: PAYMENT_METHOD.TRANSFER })
    orders = await getOrders()
    expect(columnForOrderDto(orders.find((d) => d.id === order.id))).toBe('supply_pending')

    const lineRows = await getOrderLines(order.id)
    await confirmOrderLineSupplySent(order.id, {
      lineIds: lineRows.map((l) => l.id),
      channel: 'WHATSAPP',
    })
    orders = await getOrders()
    expect(columnForOrderDto(orders.find((d) => d.id === order.id))).toBe('product_preparing')

    for (const line of lineRows) {
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
    orders = await getOrders()
    expect(columnForOrderDto(orders.find((d) => d.id === order.id))).toBe('shipment_to_plan')

    const afterReceive = await getOrderLines(order.id)
    const { shipment } = await postOrderShipment(order.id, {
      plannedDate: DEMO_TODAY,
      lines: afterReceive.map((l) => ({
        orderLineId: l.id,
        qty: Number.parseFloat(l.qtyOrdered),
      })),
    })
    orders = await getOrders()
    expect(columnForOrderDto(orders.find((d) => d.id === order.id))).toBe('ready_to_ship')

    const dispatchChain = buildShipmentAdvanceChain(
      SHIPMENT_OPERATION_STATUS.PLANNED,
      SHIPMENT_OPERATION_STATUS.DISPATCHED,
    )
    for (const step of dispatchChain) {
      if (step === SHIPMENT_OPERATION_STATUS.PLANNED) continue
      await patchShipmentStatus(shipment.id, { status: step })
    }
    orders = await getOrders()
    expect(columnForOrderDto(orders.find((d) => d.id === order.id))).toBe('in_transit')

    await patchShipmentStatus(shipment.id, { status: SHIPMENT_OPERATION_STATUS.DELIVERED })
    orders = await getOrders()
    expect(columnForOrderDto(orders.find((d) => d.id === order.id))).toBe('completed')

    const orderRow = orders.find((d) => d.id === order.id)
    const card = buildKanbanCard(
      {
        id: orderRow.id,
        customer: orderRow.customerDisplayName ?? '',
        product: orderRow.productSummary ?? '',
        status: orderRow.displayStatus ?? 'Teslim Edildi',
        amount: moneyToNumber(orderRow.totalAmount),
        paidAmount: moneyToNumber(orderRow.amountPaid),
        orderDate: orderRow.orderDate ?? DEMO_TODAY,
      },
      orderRow,
      DEMO_TODAY,
    )
    expect(card.customer).toContain('Kanban')
    expect(card.totalLabel).toMatch(/₺/)
    expect(card.remainingLabel).toMatch(/₺/)
    expect(card.depositPercentLabel).toMatch(/^%/)
    expect(card.badges.some((b) => b.id === 'collection')).toBe(true)
  })

  it('sevk zinciri teslim onayı adımını kapsar', async () => {
    const supplier = await mockCreateSupplier({ companyName: 'Onay Tedarik' })
    const order = await runWithMockApiTimers(() =>
      createOrder({
        customerName: 'Onay Müşteri',
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
    const lines = await getOrderLines(order.id)
    await confirmOrderLineSupplySent(order.id, { lineIds: lines.map((l) => l.id) })
    await mockCreateIncomingGoods({
      supplierId: supplier.id,
      receivedAt: DEMO_TODAY,
      productTitle: lines[0].title,
      qty: 1,
      unitPurchasePrice: 5_000,
      purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
      orderLineId: lines[0].id,
    })
    const { shipment } = await postOrderShipment(order.id, {
      plannedDate: DEMO_TODAY,
      lines: [{ orderLineId: lines[0].id, qty: 1 }],
    })

    const chain = buildShipmentAdvanceChain(
      SHIPMENT_OPERATION_STATUS.PLANNED,
      SHIPMENT_OPERATION_STATUS.DELIVERED,
    )
    for (const step of chain) {
      if (step === SHIPMENT_OPERATION_STATUS.DELIVERED) break
      await patchShipmentStatus(shipment.id, { status: step })
    }

    const orders = await getOrders()
    const col = columnForOrderDto(orders.find((d) => d.id === order.id))
    expect(['in_transit', 'ready_to_ship', 'delivery_confirmation']).toContain(col)
  })
})
