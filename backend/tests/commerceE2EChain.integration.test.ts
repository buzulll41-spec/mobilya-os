import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { INCOMING_GOODS_PURPOSE } from '../src/constants/incomingGoodsPurpose.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

function moneyAmount(m: { amount: string } | undefined): number {
  return Number.parseFloat(m?.amount ?? '0')
}

/** Mock parity referansı ile aynı ticari girdiler */
const DISCOUNTED_PARTIAL = {
  customerName: 'API Parity E2E',
  paidAmount: 5000,
  status: 'Üretimde',
  subtotalAmount: 20_000,
  discountPercent: 10,
  lines: [
    {
      title: 'Yemek masası',
      quantity: 1,
      unitPrice: 20_000,
      sortOrder: 0,
      productGroup: 'Yemek odası',
      configuration: { bodyFabric: 'Meşe', legColor: 'Siyah' },
    },
  ],
  expected: {
    subtotalAmount: 20_000,
    discountAmount: 2000,
    totalAmount: 18_000,
    paidAmount: 5000,
    remainingAmount: 13_000,
    lineTotal: 20_000,
  },
}

describe.skipIf(!hasDb)('commerce E2E chain (API)', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let orderId = ''
  let lineId = ''
  let supplierId = ''

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
    const supplier = await prisma.supplier.findFirst({ where: { isActive: true } })
    expect(supplier).toBeTruthy()
    supplierId = supplier!.id

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: DISCOUNTED_PARTIAL,
    })
    expect(createRes.statusCode).toBe(201)
    const body = createRes.json() as {
      id: string
      subtotalAmount: { amount: string }
      discountAmount: { amount: string }
      totalAmount: { amount: string }
      amountPaid: { amount: string }
      remainingAmount: { amount: string }
    }
    orderId = body.id
    expect(moneyAmount(body.subtotalAmount)).toBe(DISCOUNTED_PARTIAL.expected.subtotalAmount)
    expect(moneyAmount(body.discountAmount)).toBe(DISCOUNTED_PARTIAL.expected.discountAmount)
    expect(moneyAmount(body.totalAmount)).toBe(DISCOUNTED_PARTIAL.expected.totalAmount)
    expect(moneyAmount(body.remainingAmount)).toBe(DISCOUNTED_PARTIAL.expected.remainingAmount)

    const lines = await prisma.orderLine.findMany({ where: { salesOrderId: orderId } })
    lineId = lines[0]?.id ?? ''
    expect(Number(lines[0]?.lineTotal?.toString())).toBe(DISCOUNTED_PARTIAL.expected.lineTotal)
    expect(lines[0]?.configurationSummary).toBeTruthy()
  })

  afterAll(async () => {
    if (orderId) {
      await prisma.domainEvent.deleteMany({ where: { aggregateId: orderId } })
      await prisma.supplierLedgerEntry.deleteMany({ where: { documentNo: orderId } })
      await prisma.paymentTransaction.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.incomingGoodsRecord.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.shipmentLine.deleteMany({ where: { shipment: { salesOrderId: orderId } } })
      await prisma.shipment.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.orderLine.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.salesOrder.delete({ where: { id: orderId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('order-lines API — unitPrice, lineTotal, configurationSummary', async () => {
    const res = await app.inject({ method: 'GET', url: `/v1/orders/${orderId}/order-lines` })
    expect(res.statusCode).toBe(200)
    const rows = res.json() as {
      unitPrice: number
      lineTotal: number
      configurationSummary: string[]
    }[]
    expect(rows[0].unitPrice).toBe(20_000)
    expect(rows[0].lineTotal).toBe(20_000)
    expect(rows[0].configurationSummary?.length).toBeGreaterThan(0)
  })

  it('ürün gelmeden sevk engellenir; geliş sonrası sevk açılır', async () => {
    const blocked = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/shipments`,
      payload: { plannedDate: '2026-05-20', lines: [{ orderLineId: lineId, qty: 1 }] },
    })
    expect(blocked.statusCode).toBe(400)

    // Depo girişi öncesi tedarik emri zorunlu (iş kuralı): önce supply-order confirm.
    const supplyConfirm = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/supply-order/confirm`,
      payload: { lineIds: [lineId], channel: 'MAIL' },
    })
    expect(supplyConfirm.statusCode).toBe(200)

    const incoming = await app.inject({
      method: 'POST',
      url: '/v1/incoming-goods',
      payload: {
        supplierId,
        receivedAt: '2026-05-17',
        productTitle: 'Yemek masası',
        qty: 1,
        unitPurchasePrice: 12_000,
        purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
        orderLineId: lineId,
      },
    })
    expect(incoming.statusCode).toBe(201)

    const line = await prisma.orderLine.findUniqueOrThrow({ where: { id: lineId } })
    expect(line.qtyReceived.toString()).toBe('1')

    const planRes = await app.inject({
      method: 'GET',
      url: `/v1/orders/${orderId}/shipment-plan-lines`,
    })
    const plan = planRes.json() as { orderLineId: string; qtyShippable: string }[]
    const row = plan.find((p) => p.orderLineId === lineId)
    expect(Number.parseFloat(row?.qtyShippable ?? '0')).toBeGreaterThan(0)

    const shipRes = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/shipments`,
      payload: { plannedDate: '2026-05-20', lines: [{ orderLineId: lineId, qty: 1 }] },
    })
    expect(shipRes.statusCode).toBe(201)
  })

  it('ikinci ödeme — remainingAmount güncellenir', async () => {
    const payRes = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/payments`,
      payload: { amount: 3000, method: 'TRANSFER' },
    })
    expect(payRes.statusCode).toBe(200)
    const body = payRes.json() as {
      amountPaid: { amount: string }
      remainingAmount: { amount: string }
    }
    expect(moneyAmount(body.amountPaid)).toBe(8000)
    expect(moneyAmount(body.remainingAmount)).toBe(10_000)

    const row = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })
    expect(Number(row.remainingAmount.toString())).toBe(10_000)
  })

  it('mail order — tedarikçi cari kaydı', async () => {
    const supplier = await prisma.supplier.findFirst({ where: { isActive: true } })
    const moRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'MO API Parity',
        paidAmount: 8000,
        status: 'Bekleniyor',
        lines: [
          {
            title: 'Sandalye',
            quantity: 2,
            unitPrice: 4000,
            sortOrder: 0,
            configuration: { fabricBrand: 'Test Kumaş' },
          },
        ],
        paymentMethod: 'MAIL_ORDER',
        mailOrderCustomerId: 'Kart',
        mailOrderSupplierId: supplier!.id,
      },
    })
    expect(moRes.statusCode).toBe(201)
    const moId = (moRes.json() as { id: string }).id
    const ledger = await prisma.supplierLedgerEntry.findMany({
      where: { supplierId: supplier!.id, documentNo: moId },
    })
    expect(ledger.length).toBeGreaterThan(0)

    await prisma.supplierLedgerEntry.deleteMany({ where: { documentNo: moId } })
    await prisma.domainEvent.deleteMany({ where: { aggregateId: moId } })
    await prisma.paymentTransaction.deleteMany({ where: { salesOrderId: moId } })
    await prisma.orderLine.deleteMany({ where: { salesOrderId: moId } })
    await prisma.salesOrder.delete({ where: { id: moId } }).catch(() => undefined)
  })
})
