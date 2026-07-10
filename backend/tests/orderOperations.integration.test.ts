import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { assertValidPostOrderPaymentRequest } from '../src/services/postOrderPayment.js'
import { assertValidPatchOrderTerminRequest } from '../src/services/patchOrderTermin.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe('order operation validators', () => {
  it('post payment — geçerli gövde', () => {
    expect(assertValidPostOrderPaymentRequest({ amount: 100, method: 'CASH' })).toEqual({
      amount: 100,
      method: 'CASH',
    })
  })

  it('post payment — MAIL_ORDER tedarikçi zorunlu', () => {
    expect(() =>
      assertValidPostOrderPaymentRequest({ amount: 100, method: 'MAIL_ORDER' }),
    ).toThrow(/Validation/)
  })

  it('post payment — MAIL_ORDER geçerli gövde', () => {
    expect(
      assertValidPostOrderPaymentRequest({
        amount: 100,
        method: 'MAIL_ORDER',
        mailOrderSupplierId: 'sup-1',
      }),
    ).toEqual({
      amount: 100,
      method: 'MAIL_ORDER',
      mailOrderSupplierId: 'sup-1',
    })
  })

  it('patch termin — reason zorunlu', () => {
    expect(() =>
      assertValidPatchOrderTerminRequest({ committedShipBy: '2026-06-01', reason: '  ' }),
    ).toThrow(/Validation/)
  })
})

describe.skipIf(!hasDb)('order operations integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let orderId = ''

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Ops Test',
        productTitle: 'Dolap',
        totalAmount: 20_000,
        paidAmount: 0,
        status: 'Üretimde',
      },
    })
    orderId = (createRes.json() as { id: string }).id
  })

  afterAll(async () => {
    if (orderId) {
      await prisma.domainEvent.deleteMany({ where: { aggregateId: orderId } })
      await prisma.paymentTransaction.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.salesOrder.delete({ where: { id: orderId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('POST payment → POSTED CAPTURE + payment.posted + güncel DTO', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/payments`,
      payload: { amount: 5000, method: 'TRANSFER', note: 'Kapora' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { amountPaid: { amount: string }; amountDue: { amount: string } }
    expect(body.amountPaid.amount).toBe('5000.00')
    expect(body.amountDue.amount).toBe('15000.00')

    const txs = await prisma.paymentTransaction.findMany({ where: { salesOrderId: orderId } })
    expect(txs.length).toBeGreaterThanOrEqual(1)
    expect(txs.every((t) => t.salesOrderId === orderId)).toBe(true)
    expect(txs.some((t) => t.kind === 'CAPTURE' && t.status === 'POSTED')).toBe(true)

    const events = await prisma.domainEvent.findMany({
      where: { aggregateId: orderId, type: 'payment.posted' },
    })
    expect(events.length).toBeGreaterThanOrEqual(1)
  })

  it('GET /v1/orders ödeme sonrası ledger ile amountPaid / amountDue güncel', async () => {
    const listRes = await app.inject({ method: 'GET', url: '/v1/orders' })
    expect(listRes.statusCode).toBe(200)
    const list = listRes.json() as {
      id: string
      amountPaid: { amount: string }
      amountDue: { amount: string }
    }[]
    const item = list.find((o) => o.id === orderId)
    expect(item).toBeDefined()
    expect(item!.amountPaid.amount).toBe('5000.00')
    expect(item!.amountDue.amount).toBe('15000.00')
  })

  it('PATCH termin → dueDate + order_line.committed_ship_by_changed', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/orders/${orderId}/termin`,
      payload: { committedShipBy: '2026-07-01', reason: 'Müşteri talebi' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { earliestCommittedShipBy: string | null }
    expect(body.earliestCommittedShipBy).toBe('2026-07-01')

    const row = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })
    expect(row.dueDate?.toISOString().slice(0, 10)).toBe('2026-07-01')

    const events = await prisma.domainEvent.findMany({
      where: { aggregateId: orderId, type: 'order_line.committed_ship_by_changed' },
    })
    expect(events.length).toBeGreaterThanOrEqual(1)
    const payload = events[0].payload as { newDate?: string; reason?: string }
    expect(payload.newDate).toBe('2026-07-01')
    expect(payload.reason).toBe('Müşteri talebi')
  })

  it('POST MAIL_ORDER payment → tedarikçi snapshot kaydı + GET payments', async () => {
    const supplier = await prisma.supplier.findFirst({
      where: { companyName: { contains: 'Mayer Mobilya' } },
      select: { id: true, companyName: true },
    })
    expect(supplier).toBeTruthy()

    const res = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/payments`,
      payload: {
        amount: 10_000,
        method: 'MAIL_ORDER',
        mailOrderSupplierId: supplier!.id,
        note: 'Mayer POS çekim',
      },
    })
    expect(res.statusCode, res.body).toBe(200)

    const txs = await prisma.paymentTransaction.findMany({
      where: { salesOrderId: orderId, kind: 'MAIL_ORDER' },
      orderBy: { occurredAt: 'desc' },
    })
    expect(txs.length).toBeGreaterThanOrEqual(1)
    const mo = txs[0]
    expect(mo.mailOrderSupplierId).toBe(supplier!.id)
    expect(mo.mailOrderSupplierNameSnapshot).toBe(supplier!.companyName)

    const listRes = await app.inject({
      method: 'GET',
      url: `/v1/orders/${orderId}/payments`,
    })
    expect(listRes.statusCode).toBe(200)
    const payments = listRes.json() as {
      kind: string
      mailOrderSupplierId: string | null
      mailOrderSupplierName: string | null
    }[]
    const listed = payments.find((p) => p.kind === 'MAIL_ORDER')
    expect(listed?.mailOrderSupplierId).toBe(supplier!.id)
    expect(listed?.mailOrderSupplierName).toBe('Mayer Mobilya San.')
  })

  it('GET /v1/domain-events operasyon eventlerini döner', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/domain-events' })
    expect(res.statusCode).toBe(200)
    const list = res.json() as { aggregateId: string; type: string }[]
    expect(list.some((e) => e.aggregateId === orderId && e.type === 'payment.posted')).toBe(true)
  })

  it('GET /v1/orders/:id/domain-events yalnızca ilgili sipariş eventlerini döner', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/orders/${orderId}/domain-events`,
    })
    expect(res.statusCode).toBe(200)
    const list = res.json() as { aggregateId: string; type: string }[]
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((e) => e.aggregateId === orderId)).toBe(true)
    expect(list.some((e) => e.type === 'payment.posted')).toBe(true)
  })
})
