import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('domain event persistence', () => {
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
        customerName: 'Audit Test',
        productTitle: 'Masa',
        totalAmount: 12_000,
        paidAmount: 0,
        status: 'Bekleniyor',
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

  it('POST /v1/domain-events persists sales.contract_printed', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/domain-events',
      payload: {
        type: 'sales.contract_printed',
        salesOrderId: orderId,
        metadata: {
          source: 'contract_preview',
        },
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { type: string; aggregateId: string; payload: Record<string, unknown> }
    expect(body.type).toBe('sales.contract_printed')
    expect(body.aggregateId).toBe(orderId)

    const listRes = await app.inject({
      method: 'GET',
      url: `/v1/orders/${orderId}/domain-events`,
    })
    const list = listRes.json() as { type: string; payload: Record<string, unknown> }[]
    const printed = list.filter((e) => e.type === 'sales.contract_printed')
    expect(printed.length).toBeGreaterThanOrEqual(1)
    const payload = printed[printed.length - 1].payload
    expect(payload.source).toBe('contract_preview')
    const actor = payload.operationActor as { actorName?: string; actorId?: string }
    expect(actor.actorName).toBeTruthy()
    expect(actor.actorId).toBeTruthy()
  })

  it('POST /v1/domain-events persists shipment.dispatch_sheet_printed', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/domain-events',
      payload: {
        type: 'shipment.dispatch_sheet_printed',
        salesOrderId: orderId,
        metadata: {
          vehicleName: 'Araç 1',
          plannedDate: '2026-05-14',
          orderIds: [orderId],
          source: 'dispatch_sheet_preview',
        },
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { type: string; aggregateId: string; payload: Record<string, unknown> }
    expect(body.type).toBe('shipment.dispatch_sheet_printed')
    expect(body.aggregateId).toBe(orderId)
    expect(body.payload.vehicleName).toBe('Araç 1')
    expect(body.payload.plannedDate).toBe('2026-05-14')
    expect(body.payload.printedBy).toBeTruthy()
    expect(body.payload.printedAt).toBeTruthy()
  })

  it('POST /v1/domain-events persists dispatch.advice.generated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/domain-events',
      payload: {
        type: 'dispatch.advice.generated',
        salesOrderId: orderId,
        metadata: {
          selectedDate: '2026-05-14',
          healthScore: 92,
          savingsCount: 2,
          waitCount: 1,
          riskCount: 3,
          orderIds: [orderId],
        },
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { type: string; payload: Record<string, unknown> }
    expect(body.type).toBe('dispatch.advice.generated')
    expect(body.payload.healthScore).toBe(92)
    expect(body.payload.generatedBy).toBeTruthy()
  })

  it('rejects unsupported domain event types', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/domain-events',
      payload: { type: 'task.created', salesOrderId: orderId },
    })
    expect(res.statusCode).toBe(400)
  })
})
