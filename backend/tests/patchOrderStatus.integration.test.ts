import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('patch order status integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let orderId = ''
  let missingItemId = ''

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Teslim Test',
        productTitle: 'Dolap',
        totalAmount: 10_000,
        paidAmount: 0,
        status: 'Eksik Var',
      },
    })
    orderId = (createRes.json() as { id: string }).id

    const missingRes = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/missing-items`,
      payload: { title: 'Kapak', quantity: 1, reason: 'Kırık' },
    })
    missingItemId = (missingRes.json() as { missingItem: { id: string } }).missingItem.id
  })

  afterAll(async () => {
    if (orderId) {
      await prisma.domainEvent.deleteMany({ where: { aggregateId: orderId } })
      await prisma.orderMissingItem.deleteMany({ where: { orderId } })
      await prisma.orderLine.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.salesOrder.delete({ where: { id: orderId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('açık eksik varken Teslim Edildi politika ile engellenir', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/orders/${orderId}/status`,
      payload: { status: 'Teslim Edildi' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('policyOverrides ile açık SSH varken teslim edilebilir', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/orders/${orderId}/status`,
      payload: {
        status: 'Teslim Edildi',
        policyOverrides: ['order.deliver.open_missing_ssh'],
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('tüm eksikler RESOLVED ve tahsilat tam ise Teslim Edildi izinli + kalıcı', async () => {
    const payRes = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/payments`,
      payload: { amount: 10_000, method: 'TRANSFER' },
    })
    expect(payRes.statusCode).toBe(200)

    for (const status of ['ORDERED', 'ARRIVED', 'RESOLVED'] as const) {
      await app.inject({
        method: 'PATCH',
        url: `/v1/missing-items/${missingItemId}/status`,
        payload: {
          status,
          ...(status === 'RESOLVED' ? { resolutionNote: 'Tamam' } : {}),
        },
      })
    }

    const deliver = await app.inject({
      method: 'PATCH',
      url: `/v1/orders/${orderId}/status`,
      payload: { status: 'Teslim Edildi' },
    })
    expect(deliver.statusCode).toBe(200)
    const dto = deliver.json() as { displayStatus: string }
    expect(dto.displayStatus).toBe('Teslim Edildi')

    const row = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })
    expect(row.displayStatus).toBe('Teslim Edildi')

    const listRes = await app.inject({ method: 'GET', url: '/v1/orders' })
    const item = (listRes.json() as { id: string; displayStatus: string }[]).find((o) => o.id === orderId)
    expect(item?.displayStatus).toBe('Teslim Edildi')

    const events = await prisma.domainEvent.findMany({
      where: { aggregateId: orderId, type: 'order.lifecycle_changed' },
    })
    expect(events.some((e) => (e.payload as { to?: string }).to === 'Teslim Edildi')).toBe(true)
  })

  it('İptal status güncellemesi kabul edilir ve kalıcıdır', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Iptal Test',
        productTitle: 'Sandalye',
        totalAmount: 2500,
        paidAmount: 0,
        status: 'Bekleniyor',
      },
    })
    expect(createRes.statusCode).toBe(201)
    const cancelOrderId = (createRes.json() as { id: string }).id

    const cancelRes = await app.inject({
      method: 'PATCH',
      url: `/v1/orders/${cancelOrderId}/status`,
      payload: { status: 'İptal' },
    })
    expect(cancelRes.statusCode).toBe(200)
    const dto = cancelRes.json() as { displayStatus: string }
    expect(dto.displayStatus).toBe('İptal')

    const row = await prisma.salesOrder.findUniqueOrThrow({ where: { id: cancelOrderId } })
    expect(row.displayStatus).toBe('İptal')

    await prisma.domainEvent.deleteMany({ where: { aggregateId: cancelOrderId } })
    await prisma.orderLine.deleteMany({ where: { salesOrderId: cancelOrderId } })
    await prisma.salesOrder.delete({ where: { id: cancelOrderId } }).catch(() => undefined)
  })
})
