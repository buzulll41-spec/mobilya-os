import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('missing items integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let orderId = ''
  let missingItemId = ''
  /** @type {{ missingItem: { id: string; status: string; orderId: string }; order: { id: string; openMissingItemsCount?: number } } | null} */
  let createMissingBody = null

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Eksik Test',
        productTitle: 'Mutfak dolabı',
        totalAmount: 15_000,
        paidAmount: 0,
        status: 'Üretimde',
      },
    })
    orderId = (createRes.json() as { id: string }).id

    const missingRes = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/missing-items`,
      payload: {
        title: 'Tezgah altı kapak',
        quantity: 2,
        reason: 'Fabrika sevkiyatında yok',
      },
    })
    createMissingBody = missingRes.json() as {
      missingItem: { id: string; status: string; orderId: string }
      order: { id: string; openMissingItemsCount?: number }
    }
    missingItemId = createMissingBody.missingItem.id
  })

  afterAll(async () => {
    if (orderId) {
      await prisma.domainEvent.deleteMany({ where: { aggregateId: orderId } })
      await prisma.orderMissingItem.deleteMany({ where: { orderId } })
      await prisma.paymentTransaction.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.shipmentLine.deleteMany({
        where: { shipment: { salesOrderId: orderId } },
      })
      await prisma.shipment.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.orderLine.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.salesOrder.delete({ where: { id: orderId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('POST missing-items → OPEN + projection counts + response shape', async () => {
    expect(createMissingBody).not.toBeNull()
    expect(createMissingBody!.missingItem).toBeDefined()
    expect(Array.isArray(createMissingBody!.missingItem)).toBe(false)
    expect(createMissingBody!.missingItem.status).toBe('OPEN')
    expect(createMissingBody!.missingItem.orderId).toBe(orderId)
    expect(createMissingBody!.order.id).toBe(orderId)
    expect(createMissingBody!.order.openMissingItemsCount).toBeGreaterThan(0)

    const row = await prisma.orderMissingItem.findUniqueOrThrow({ where: { id: missingItemId } })
    expect(row.status).toBe('OPEN')

    const listRes = await app.inject({ method: 'GET', url: '/v1/orders' })
    const item = (listRes.json() as { id: string; openMissingItemsCount?: number; missingItemsOpenStatusCount?: number }[]).find(
      (o) => o.id === orderId,
    )
    expect(item?.openMissingItemsCount).toBe(1)
    expect(item?.missingItemsOpenStatusCount).toBe(1)
  })

  it('PATCH ORDERED → DB + GET missing-items + projection', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/missing-items/${missingItemId}/status`,
      payload: { status: 'ORDERED' },
    })
    expect(res.statusCode).toBe(200)

    const row = await prisma.orderMissingItem.findUniqueOrThrow({ where: { id: missingItemId } })
    expect(row.status).toBe('ORDERED')

    const list = await app.inject({ method: 'GET', url: `/v1/orders/${orderId}/missing-items` })
    const items = list.json() as { id: string; status: string }[]
    expect(items.find((m) => m.id === missingItemId)?.status).toBe('ORDERED')

    const orders = await app.inject({ method: 'GET', url: '/v1/orders' })
    const item = (orders.json() as { id: string; openMissingItemsCount?: number; missingItemsOpenStatusCount?: number }[]).find(
      (o) => o.id === orderId,
    )
    expect(item?.missingItemsOpenStatusCount).toBe(0)
    expect(item?.openMissingItemsCount).toBe(1)

    const ev = await prisma.domainEvent.findMany({
      where: { aggregateId: orderId, type: 'missing_item.ordered' },
    })
    expect(ev.length).toBeGreaterThanOrEqual(1)
  })

  it('PATCH ARRIVED → DB + timeline event + hâlâ açık sayılır', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/missing-items/${missingItemId}/status`,
      payload: { status: 'ARRIVED' },
    })
    expect(res.statusCode).toBe(200)
    const row = await prisma.orderMissingItem.findUniqueOrThrow({ where: { id: missingItemId } })
    expect(row.status).toBe('ARRIVED')

    const listRes = await app.inject({ method: 'GET', url: '/v1/orders' })
    const item = (listRes.json() as { id: string; openMissingItemsCount?: number }[]).find(
      (o) => o.id === orderId,
    )
    expect(item?.openMissingItemsCount).toBe(1)

    const ev = await prisma.domainEvent.findMany({
      where: { aggregateId: orderId, type: 'missing_item.arrived' },
    })
    expect(ev.length).toBeGreaterThanOrEqual(1)
  })

  it('POST ready-for-shipment → READY_FOR_SHIPMENT + açık sayılmaz + audit', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/missing-items/${missingItemId}/ready-for-shipment`,
      payload: { note: 'Parça sevke hazır' },
    })
    expect(res.statusCode).toBe(200)

    const body = res.json() as {
      missingItem: { status: string }
      order: { openMissingItemsCount?: number }
    }
    expect(body.missingItem.status).toBe('READY_FOR_SHIPMENT')
    expect(body.order.openMissingItemsCount).toBe(0)

    const row = await prisma.orderMissingItem.findUniqueOrThrow({ where: { id: missingItemId } })
    expect(row.status).toBe('READY_FOR_SHIPMENT')

    const listRes = await app.inject({ method: 'GET', url: '/v1/orders' })
    const item = (listRes.json() as { id: string; openMissingItemsCount?: number }[]).find(
      (o) => o.id === orderId,
    )
    expect(item?.openMissingItemsCount).toBe(0)

    const ev = await prisma.domainEvent.findMany({
      where: { aggregateId: orderId, type: 'missing_item.ready_for_shipment' },
    })
    expect(ev.length).toBeGreaterThanOrEqual(1)
  })

  it('PATCH RESOLVED → DB + displayStatus + resolved counts', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/missing-items/${missingItemId}/status`,
      payload: { status: 'RESOLVED', resolutionNote: 'Depoya geldi, montaja alındı' },
    })
    expect(res.statusCode).toBe(200)

    const row = await prisma.orderMissingItem.findUniqueOrThrow({ where: { id: missingItemId } })
    expect(row.status).toBe('RESOLVED')
    expect(row.resolvedAt).not.toBeNull()

    const order = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })
    expect(order.displayStatus).toBeTruthy()

    const listRes = await app.inject({ method: 'GET', url: '/v1/orders' })
    const item = (listRes.json() as { id: string; openMissingItemsCount?: number; resolvedMissingItemsCount?: number }[]).find(
      (o) => o.id === orderId,
    )
    expect(item?.openMissingItemsCount).toBe(0)
    expect(item?.resolvedMissingItemsCount).toBe(1)

    const ev = await prisma.domainEvent.findMany({
      where: { aggregateId: orderId, type: 'missing_item.resolved' },
    })
    expect(ev.length).toBeGreaterThanOrEqual(1)
  })
})
