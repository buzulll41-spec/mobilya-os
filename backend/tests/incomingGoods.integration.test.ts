import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { assertValidCreateIncomingGoodsRequest } from '../src/services/createIncomingGoods.js'
import { INCOMING_GOODS_PURPOSE } from '../src/constants/incomingGoodsPurpose.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe('incoming goods validators', () => {
  it('stok kaydı — sipariş satırı olmadan geçer', () => {
    expect(
      assertValidCreateIncomingGoodsRequest({
        supplierId: 's1',
        receivedAt: '2026-05-17',
        productTitle: 'Sandalye',
        qty: 4,
        unitPurchasePrice: 500,
        purpose: INCOMING_GOODS_PURPOSE.STOCK,
      }),
    ).toMatchObject({ purpose: INCOMING_GOODS_PURPOSE.STOCK })
  })

  it('müşteri siparişi — orderLineId zorunlu', () => {
    expect(() =>
      assertValidCreateIncomingGoodsRequest({
        supplierId: 's1',
        receivedAt: '2026-05-17',
        productTitle: 'Sandalye',
        qty: 2,
        unitPurchasePrice: 500,
        purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
      }),
    ).toThrow(/sipariş kalemi/)
  })
})

describe.skipIf(!hasDb)('incoming goods integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let supplierId = ''
  let orderId = ''
  let orderLineId = ''

  beforeAll(async () => {
    process.env.DEMO_TODAY = '2026-05-17'
    app = await buildApp()
    await app.ready()

    const sup = await app.inject({
      method: 'POST',
      url: '/v1/suppliers',
      payload: { companyName: 'Gelen Ürün Test Tedarik' },
    })
    supplierId = (sup.json() as { id: string }).id

    const orderRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Gelen Test Müşteri',
        productTitle: '6 Sandalye',
        totalAmount: 18_000,
        paidAmount: 0,
        status: 'Üretimde',
        lines: [
          {
            title: '6 Sandalye',
            quantity: 6,
            unitPrice: 3000,
            sortOrder: 0,
            configuration: { fabricBrand: 'Test Kumaş' },
          },
        ],
      },
    })
    const orderBody = orderRes.json() as { id: string }
    orderId = orderBody.id
    const lines = await prisma.orderLine.findMany({ where: { salesOrderId: orderId } })
    orderLineId = lines[0].id

    const supplyConfirm = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/supply-order/confirm`,
      payload: { lineIds: [orderLineId], channel: 'MAIL' },
    })
    expect(supplyConfirm.statusCode).toBe(200)
  })

  afterAll(async () => {
    if (orderId) {
      await prisma.incomingGoodsRecord.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.domainEvent.deleteMany({ where: { aggregateId: orderId } })
      await prisma.salesOrder.delete({ where: { id: orderId } }).catch(() => undefined)
    }
    if (supplierId) {
      await prisma.supplierLedgerEntry.deleteMany({ where: { supplierId } })
      await prisma.incomingGoodsRecord.deleteMany({ where: { supplierId } })
      await prisma.supplier.delete({ where: { id: supplierId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('stok gelen ürün — cari GOODS_RECEIPT, qtyReceived değişmez', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/incoming-goods',
      payload: {
        supplierId,
        receivedAt: '2026-05-17',
        productTitle: 'Stok koltuk',
        qty: 2,
        unitPurchasePrice: 1000,
        purpose: INCOMING_GOODS_PURPOSE.STOCK,
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { lineTotal: string; orderLineId: string | null }
    expect(body.lineTotal).toBe('2000.00')
    expect(body.orderLineId).toBeNull()

    const line = await prisma.orderLine.findUniqueOrThrow({ where: { id: orderLineId } })
    expect(line.qtyReceived.toString()).toBe('0')

    const detail = await app.inject({ method: 'GET', url: `/v1/suppliers/${supplierId}` })
    expect((detail.json() as { openBalance: string }).openBalance).toBe('2000.00')
  })

  it('müşteri siparişi — kısmi qtyReceived + overflow engeli', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/v1/incoming-goods',
      payload: {
        supplierId,
        receivedAt: '2026-05-17',
        productTitle: 'Sandalye',
        qty: 2,
        unitPurchasePrice: 500,
        purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
        orderLineId,
      },
    })
    expect(first.statusCode).toBe(201)

    let orderMid = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })
    expect(orderMid.displayStatus).toBe('Kısmi Geldi')

    let line = await prisma.orderLine.findUniqueOrThrow({ where: { id: orderLineId } })
    expect(line.qtyReceived.toString()).toBe('2')

    const overflow = await app.inject({
      method: 'POST',
      url: '/v1/incoming-goods',
      payload: {
        supplierId,
        receivedAt: '2026-05-17',
        productTitle: 'Sandalye fazla',
        qty: 5,
        unitPurchasePrice: 500,
        purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
        orderLineId,
      },
    })
    expect(overflow.statusCode).toBe(400)

    const second = await app.inject({
      method: 'POST',
      url: '/v1/incoming-goods',
      payload: {
        supplierId,
        receivedAt: '2026-05-17',
        productTitle: 'Sandalye kalan',
        qty: 4,
        unitPurchasePrice: 500,
        purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
        orderLineId,
      },
    })
    expect(second.statusCode).toBe(201)
    line = await prisma.orderLine.findUniqueOrThrow({ where: { id: orderLineId } })
    expect(line.qtyReceived.toString()).toBe('6')

    // Tüm satırlar depoda + tedarik gönderilmiş → otomatik "Sevke Hazır" (autoShipmentReady).
    const orderAfterFull = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })
    expect(orderAfterFull.displayStatus).toBe('Sevke Hazır')

    const listRes = await app.inject({ method: 'GET', url: '/v1/orders' })
    const listItems = listRes.json() as { id: string; displayStatus: string }[]
    const listRow = listItems.find((row) => row.id === orderId)
    expect(listRow?.displayStatus).toBe('Sevke Hazır')
  })

  it('teşhir + ödeme sonrası bakiye', async () => {
    const display = await app.inject({
      method: 'POST',
      url: '/v1/incoming-goods',
      payload: {
        supplierId,
        receivedAt: '2026-05-17',
        productTitle: 'Teşhir masa',
        qty: 1,
        unitPurchasePrice: 3000,
        purpose: INCOMING_GOODS_PURPOSE.DISPLAY,
      },
    })
    expect(display.statusCode).toBe(201)

    const beforePay = await app.inject({ method: 'GET', url: `/v1/suppliers/${supplierId}` })
    const openBefore = (beforePay.json() as { openBalance: string }).openBalance

    const pay = await app.inject({
      method: 'POST',
      url: `/v1/suppliers/${supplierId}/payments`,
      payload: { amount: 1000, method: 'CASH' },
    })
    expect(pay.statusCode).toBe(201)

    const afterPay = await app.inject({ method: 'GET', url: `/v1/suppliers/${supplierId}` })
    const openAfter = Number.parseFloat((afterPay.json() as { openBalance: string }).openBalance)
    const expected = Number.parseFloat(openBefore) - 1000
    expect(openAfter).toBeCloseTo(expected, 2)
  })

  it('operasyon paneli receiving + shipment plan qtyReceived', async () => {
    const receiving = await app.inject({
      method: 'GET',
      url: `/v1/orders/${orderId}/order-line-receiving`,
    })
    expect(receiving.statusCode).toBe(200)
    const body = receiving.json() as {
      lines: { qtyReceived: string; readinessLabel: string }[]
      summary: { orderReadyToShip: boolean }
    }
    expect(body.lines[0].qtyReceived).toBe('6.00')
    expect(body.lines[0].readinessLabel).toBe('Hazır')
    expect(body.summary.orderReadyToShip).toBe(true)

    const plan = await app.inject({
      method: 'GET',
      url: `/v1/orders/${orderId}/shipment-plan-lines`,
    })
    const planRows = plan.json() as { qtyReceived: string; readyForShipmentHint: string }[]
    expect(planRows[0].qtyReceived).toBe('6.00')
    expect(planRows[0].readyForShipmentHint).toMatch(/sevke uygun/i)
  })

  it('KPI ve bugünkü liste', async () => {
    const kpis = await app.inject({ method: 'GET', url: '/v1/incoming-goods/kpis' })
    expect(kpis.statusCode).toBe(200)
    const k = kpis.json() as { todayCount: number; totalSupplierDebt: string }
    expect(k.todayCount).toBeGreaterThanOrEqual(3)
    expect(Number.parseFloat(k.totalSupplierDebt)).toBeGreaterThan(0)

    const list = await app.inject({
      method: 'GET',
      url: '/v1/incoming-goods?receivedAt=2026-05-17',
    })
    expect(list.statusCode).toBe(200)
    expect((list.json() as unknown[]).length).toBeGreaterThanOrEqual(3)
  })
})
